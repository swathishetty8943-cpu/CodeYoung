const { v4: uuidv4 } = require('uuid');
const { User, Booking } = require('../models');
const ApiError = require('../utils/ApiError');
const { isLikelyDeliverable } = require('../utils/emailValidator');
const { localToUTC, localDateString, localDayBoundsUTC } = require('../utils/timezone');
const { MAX_FREE_TRIALS_PER_DAY } = require('../utils/constants');
const { findBestMentor, suggestAlternateSlots, findNearestAvailableSlot } = require('./matchingService');
const emailService = require('./emailService');
const env = require('../config/env');


function overlapsAny(startTimeUTC, endTimeUTC, ranges) {
  return ranges.some((r) => startTimeUTC < r.endTimeUTC && endTimeUTC > r.startTimeUTC);
}

/**
 * Everything this parent already has (not cancelled) on one calendar date
 * in the given timezone. Used for three things:
 *  - the max-free-trials-per-day rule (`trialLimit`)
 *  - hiding times the parent already booked from their preferred-slot list
 *    (`bookedRanges` - these are the REAL booked times, which can differ
 *    from the preferred time if the booking was auto-adjusted)
 *  - stopping the parent from double-booking themselves at the same time
 *
 * `bookingType !== 'full_coaching'` (rather than `=== 'trial'`) because
 * .lean() skips schema defaults, so very old documents may lack the field.
 */
async function getParentDayBookingInfo({ parentId, dateStr, ianaZone }) {
  const { startUTC, endUTC } = localDayBoundsUTC(dateStr, ianaZone);
  const bookings = await Booking.find({
    parentId,
    status: { $ne: 'cancelled' },
    startTimeUTC: { $gte: startUTC, $lt: endUTC },
  })
    .select('bookingType startTimeUTC endTimeUTC')
    .lean();

  const used = bookings.filter((b) => b.bookingType !== 'full_coaching').length;
  return {
    bookedRanges: bookings.map((b) => ({
      startTimeUTC: b.startTimeUTC,
      endTimeUTC: b.endTimeUTC,
    })),
    trialLimit: {
      max: MAX_FREE_TRIALS_PER_DAY,
      used,
      remaining: Math.max(0, MAX_FREE_TRIALS_PER_DAY - used),
    },
  };
}

function dailyTrialLimitError() {
  return ApiError.conflict(
    `You can have only ${MAX_FREE_TRIALS_PER_DAY} free trial classes per day. ` +
      'Please choose another date for your next free trial.'
  );
}

function generateDummyMeetLink(bookingType) {
  const pathSegment = bookingType === 'full_coaching' ? 'coaching' : 'trial';
  return `https://meet.codeyoung.example/${pathSegment}/${uuidv4()}`;
}

/**
 * Full booking flow for one parent-selected slot, matching spec section
 * G (Booking Flow):
 *  1. validate the contact email up front (blocks confirmation, not after)
 *  2. run the mentor-matching algorithm for the exact UTC slot
 *  3. on no match, return a friendly error with alternate-slot suggestions
 *  4. on match, create the Booking, send both confirmation emails, and
 *     leave reminderSentAt null so the cron job can pick it up later
 *     (no separate "scheduling" call needed - the job itself queries for
 *     upcoming, not-yet-reminded bookings each tick)
 */
async function createBooking({
  parentUser,
  dateStr,
  timeStr,
  contactEmail,
  bookingType = 'trial',
  studentDetails,
}) {
  const isFullCoaching = bookingType === 'full_coaching';

  const config = await require('../models').AdminConfig.getSingleton();
  const maxFreeTrials = config.maxFreeTrialsPerFamily;

  // The free-trial-limit rule only applies to bookingType 'trial'. Full
  // Coaching is a separate (paid) enrollment path: it doesn't consume a
  // free trial and a parent can book it regardless of how many trials
  // they've used - enforced here (not just hidden in the UI) so it can't
  // be bypassed by calling the API directly. The limit itself is
  // admin-configurable (AdminConfig.maxFreeTrialsPerFamily, default 5)
  // rather than a fixed "one trial" rule.
  if (!isFullCoaching && (parentUser.freeTrialsUsedCount || 0) >= maxFreeTrials) {
    throw ApiError.conflict(
      `You have already used all ${maxFreeTrials} of your free trial classes. Please book Full Coaching instead.`
    );
  }

  // Per-day cap on free trials (see utils/constants.js). Checked before any
  // email/matching work so a blocked request fails fast.
  const dayInfo = await getParentDayBookingInfo({
    parentId: parentUser._id,
    dateStr,
    ianaZone: parentUser.timezone,
  });
  if (!isFullCoaching && dayInfo.trialLimit.remaining <= 0) {
    throw dailyTrialLimitError();
  }

  const emailToUse = contactEmail || parentUser.email;

  // Step 1: email existence/format check BEFORE any matching or booking
  // work happens, so a bad email never gets past this point.
  const deliverable = await isLikelyDeliverable(emailToUse);
  if (!deliverable) {
    throw ApiError.badRequest(
      'The email address for this booking looks invalid. Please check it and try again.'
    );
  }

  const slotDurationMinutes = config.slotDurationMinutes;

  let startTimeUTC;
  try {
    startTimeUTC = localToUTC(dateStr, timeStr, parentUser.timezone);
  } catch (err) {
    throw ApiError.badRequest('That date/time is not valid in your timezone (possibly a DST gap). Please pick another slot.');
  }
  const endTimeUTC = new Date(startTimeUTC.getTime() + slotDurationMinutes * 60000);

  if (startTimeUTC.getTime() < Date.now()) {
    throw ApiError.badRequest('That slot is in the past. Please pick an upcoming time.');
  }

  if (config.blackoutDates.includes(dateStr)) {
    throw ApiError.conflict('This date is not available for bookings.');
  }

  // A parent can't be in two classes at once: a time they've already booked
  // is not offered in their preferred-slot list, and is rejected here too so
  // it can't be bypassed by calling the API directly.
  if (overlapsAny(startTimeUTC, endTimeUTC, dayInfo.bookedRanges)) {
    throw ApiError.conflict(
      'You already have a class booked at that time. Please pick a different time.'
    );
  }

  // Step 2: matching algorithm for the parent's exact preferred slot.
  let match = await findBestMentor({ startTimeUTC, endTimeUTC });
  let requestedTimeUTC = null; // stays null unless we have to adjust below
  let finalStartTimeUTC = startTimeUTC;
  let finalEndTimeUTC = endTimeUTC;

  if (!match) {
    // Step 3: the parent only ever picks their preferred slot - if nobody
    // is available at that exact time, WE adjust it for them (nearest
    // bookable time on the same day), rather than making them manually
    // hunt through a list of alternates. We still record what they
    // originally asked for (requestedTimeUTC) so this stays transparent in
    // the UI/emails instead of silently moving the class.
    const nearest = await findNearestAvailableSlot({
      dateStr,
      preferredTimeUTC: startTimeUTC,
      ianaZone: parentUser.timezone,
      slotDurationMinutes,
      excludeRanges: dayInfo.bookedRanges,
    });

    if (nearest) {
      match = nearest;
      requestedTimeUTC = startTimeUTC;
      finalStartTimeUTC = nearest.startTimeUTC;
      finalEndTimeUTC = nearest.endTimeUTC;
    } else {
      // Truly nothing bookable anywhere on that day (e.g. every mentor is
      // fully booked) - only now do we surface a hard failure, still with
      // a friendly explanation and a few concrete alternates to try.
      const alternates = await suggestAlternateSlots({
        dateStr,
        ianaZone: parentUser.timezone,
        slotDurationMinutes,
        excludeRanges: dayInfo.bookedRanges,
      });
      throw ApiError.conflict(
        'This time is fully booked - please try a different slot.',
        {
          alternateSlots: alternates.map((a) => ({
            timeStr: a.timeStr,
            startTimeUTC: a.startTimeUTC,
          })),
        }
      );
    }
  }

  const { mentorUser, mentorLocalDate } = match;
  const meetLink = generateDummyMeetLink(bookingType);

  let booking;
  try {
    booking = await Booking.create({
      parentId: parentUser._id,
      mentorId: mentorUser._id,
      startTimeUTC: finalStartTimeUTC,
      endTimeUTC: finalEndTimeUTC,
      requestedTimeUTC,
      mentorLocalDate,
      meetLink,
      status: 'confirmed',
      contactEmail: emailToUse,
      bookingType,
      studentDetails: isFullCoaching ? studentDetails : undefined,
    });
  } catch (err) {
    // Unique partial index race: two parents tried to grab the same
    // mentor+slot at once. Surface the same friendly "fully booked"
    // message rather than a raw duplicate-key error.
    if (err.code === 11000) {
      throw ApiError.conflict('This time is fully booked - please try a different slot.');
    }
    throw err;
  }

  // Race guard for the daily cap: two simultaneous requests can both pass
  // the check above. Recount now that ours exists; if the cap is exceeded,
  // undo this booking (before any counter bump or email) and fail safe.
  if (!isFullCoaching) {
    const after = await getParentDayBookingInfo({
      parentId: parentUser._id,
      dateStr,
      ianaZone: parentUser.timezone,
    });
    if (after.trialLimit.used > MAX_FREE_TRIALS_PER_DAY) {
      await Booking.deleteOne({ _id: booking._id });
      throw dailyTrialLimitError();
    }
  }

  // Increment the used-trials count the moment the booking is actually
  // confirmed (not earlier), so a failed match or a validation error never
  // burns one of the parent's free trials. This is never reset by a later
  // cancellation. Full Coaching bookings never touch this counter.
  if (!isFullCoaching) {
    parentUser.freeTrialsUsedCount = (parentUser.freeTrialsUsedCount || 0) + 1;
    await parentUser.save();
  }

  // Step 4: confirmation emails, each formatted in the recipient's own
  // local timezone. Full Coaching emails also carry the intake details so
  // the mentor arrives prepared.
  //
  // Uses allSettled (not all) deliberately: the booking itself is already
  // committed to the DB at this point, so a transient failure sending one
  // person's email must never look like the whole booking failed, and
  // must never suppress the other person's email. Both attempts always
  // run and are logged individually; we only escalate if BOTH failed,
  // since that likely means a real SMTP config problem worth surfacing.
  const [parentEmailResult, mentorEmailResult] = await Promise.allSettled([
    emailService.sendBookingConfirmation({
      to: emailToUse,
      recipientName: parentUser.name,
      counterpartName: mentorUser.name,
      startTimeUTC: finalStartTimeUTC,
      requestedTimeUTC,
      recipientTimezone: parentUser.timezone,
      meetLink,
      isForMentor: false,
      bookingType,
      studentDetails,
    }),
    emailService.sendBookingConfirmation({
      to: mentorUser.email,
      recipientName: mentorUser.name,
      counterpartName: parentUser.name,
      startTimeUTC: finalStartTimeUTC,
      requestedTimeUTC,
      recipientTimezone: mentorUser.timezone,
      meetLink,
      isForMentor: true,
      bookingType,
      studentDetails,
    }),
  ]);

  if (parentEmailResult.status === 'rejected') {
    console.error(
      `[booking:${booking._id}] Failed to send confirmation email to parent (${emailToUse}):`,
      parentEmailResult.reason
    );
  }
  if (mentorEmailResult.status === 'rejected') {
    console.error(
      `[booking:${booking._id}] Failed to send confirmation email to mentor (${mentorUser.email}):`,
      mentorEmailResult.reason
    );
  }

  return booking;
}

async function getBookingsForUser(user) {
  const filter =
    user.role === 'parent' ? { parentId: user._id } : { mentorId: user._id };
  const bookings = await Booking.find(filter)
    .sort({ startTimeUTC: 1 })
    .populate('parentId', 'name email timezone')
    .populate('mentorId', 'name email timezone');

  const now = Date.now();
  return {
    upcoming: bookings.filter((b) => b.startTimeUTC.getTime() >= now && b.status !== 'cancelled'),
    past: bookings.filter((b) => b.startTimeUTC.getTime() < now || b.status === 'cancelled'),
  };
}

async function cancelBooking({ bookingId, requestingUser }) {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw ApiError.notFound('Booking not found');

  const ownsBooking =
    booking.parentId.toString() === requestingUser._id.toString() ||
    booking.mentorId.toString() === requestingUser._id.toString();
  if (!ownsBooking && requestingUser.role !== 'admin') {
    throw ApiError.forbidden('You do not have access to this booking');
  }

  booking.status = 'cancelled';
  await booking.save();
  return booking;
}

module.exports = {
  createBooking,
  getBookingsForUser,
  cancelBooking,
  getParentDayBookingInfo,
};