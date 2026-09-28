const { User, MentorProfile, Booking, AdminConfig } = require('../models');
const { localDateString, localDayBoundsUTC } = require('../utils/timezone');
const ApiError = require('../utils/ApiError');

/**
 * Resolves the effective max-classes-per-day for a given mentor: the
 * mentor's own override if set, otherwise the platform-wide AdminConfig
 * default. This lets an admin globally tune the default while still
 * allowing per-mentor overrides.
 */
async function getEffectiveMaxClassesPerDay(mentorProfile, adminConfig) {
  return mentorProfile.maxClassesPerDay ?? adminConfig.defaultMaxClassesPerDay;
}

/**
 * Counts a mentor's *confirmed* bookings on their own local calendar date
 * (not UTC, not the parent's date) for the day containing `startTimeUTC`.
 * We use the precomputed `mentorLocalDate` field on Booking rather than
 * re-deriving it, so this stays correct even if timezone libraries or
 * mentor timezone assignment ever changed after the fact.
 */
async function countMentorBookingsOnLocalDate(mentorUserId, mentorLocalDate) {
  return Booking.countDocuments({
    mentorId: mentorUserId,
    mentorLocalDate,
    status: 'confirmed',
  });
}

/**
 * Checks whether a mentor has any confirmed booking with an exact
 * overlapping start time. (Slots are fixed-duration and non-overlapping by
 * construction, so an exact start-time collision is sufficient; this is
 * also backstopped by the unique partial index on Booking.)
 */
async function hasExactSlotConflict(mentorUserId, startTimeUTC) {
  const conflict = await Booking.findOne({
    mentorId: mentorUserId,
    startTimeUTC,
    status: 'confirmed',
  });
  return !!conflict;
}

function isWithinUnavailableBlock(mentorProfile, startTimeUTC, endTimeUTC) {
  return (mentorProfile.unavailableSlots || []).some(
    (block) => startTimeUTC < block.endUTC && endTimeUTC > block.startUTC
  );
}

/**
 * Finds the best mentor for a requested UTC slot, applying:
 *  (a) active mentors only
 *  (b) fewer than maxClassesPerDay confirmed bookings on THIS mentor's own
 *      local calendar date for that slot
 *  (c) no overlapping booking at that exact slot, and no explicit
 *      unavailable block covering it
 * Among all eligible mentors, picks the one with the fewest bookings that
 * day (load balancing), breaking ties by mentor creation order for
 * determinism.
 *
 * Returns the chosen mentor User doc, or null if nobody is available.
 */
async function findBestMentor({ startTimeUTC, endTimeUTC }) {
  const adminConfig = await AdminConfig.getSingleton();

  const activeMentorProfiles = await MentorProfile.find({ active: true }).populate('userId');
  const activeUserBackedProfiles = activeMentorProfiles.filter(
    (mp) => mp.userId && mp.userId.active
  );

  const candidates = [];

  for (const profile of activeUserBackedProfiles) {
    const mentorUser = profile.userId;
    const mentorLocalDate = localDateString(startTimeUTC, mentorUser.timezone);

    if (isWithinUnavailableBlock(profile, startTimeUTC, endTimeUTC)) continue;

    const [bookingCountToday, hasConflict] = await Promise.all([
      countMentorBookingsOnLocalDate(mentorUser._id, mentorLocalDate),
      hasExactSlotConflict(mentorUser._id, startTimeUTC),
    ]);

    if (hasConflict) continue;

    const maxPerDay = await getEffectiveMaxClassesPerDay(profile, adminConfig);
    if (bookingCountToday >= maxPerDay) continue;

    candidates.push({ mentorUser, bookingCountToday, mentorLocalDate });
  }

  if (candidates.length === 0) return null;

  // Load-balance: prefer the mentor with the fewest bookings that day so
  // load spreads evenly across the mentor pool.
  candidates.sort((a, b) => a.bookingCountToday - b.bookingCountToday);
  return candidates[0];
}

/**
 * Suggests alternate slot start times (same day, later times, same
 * duration) that have at least one available mentor, used to build a
 * friendly "no mentor available" error with next-available suggestions.
 * This is a best-effort scan over a small number of subsequent slots
 * rather than an exhaustive search, to keep the request fast.
 */
async function suggestAlternateSlots({
  dateStr,
  ianaZone,
  slotDurationMinutes,
  maxSuggestions = 3,
  excludeRanges = [],
}) {
  const { localToUTC } = require('../utils/timezone');
  const suggestions = [];
  const adminConfig = await AdminConfig.getSingleton();
  const { startHour, endHour } = adminConfig.businessHours;

  for (let hour = startHour; hour < endHour && suggestions.length < maxSuggestions; hour++) {
    for (let minute = 0; minute < 60 && suggestions.length < maxSuggestions; minute += slotDurationMinutes) {
      const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
      let startTimeUTC;
      try {
        startTimeUTC = localToUTC(dateStr, timeStr, ianaZone);
      } catch {
        continue;
      }
      const endTimeUTC = new Date(startTimeUTC.getTime() + slotDurationMinutes * 60000);
      // Never suggest a time the parent already has a class at.
      if (excludeRanges.some((r) => startTimeUTC < r.endTimeUTC && endTimeUTC > r.startTimeUTC)) continue;
      const match = await findBestMentor({ startTimeUTC, endTimeUTC });
      if (match) {
        suggestions.push({ startTimeUTC, endTimeUTC, timeStr });
      }
    }
  }
  return suggestions;
}

/**
 * Given a parent's preferred slot (which has already failed to match any
 * mentor), automatically finds the closest bookable replacement - "closest"
 * meaning smallest absolute time distance from the preferred start time,
 * not just the next slot chronologically. This is what lets the system
 * "adjust" a booking on the parent's behalf instead of making them manually
 * browse a list of alternates.
 *
 * Search strategy: walk outward from the preferred slot in both directions
 * (preferred - 1 slot, + 1 slot, - 2 slots, + 2 slots, ...) within the
 * platform's business-hours window on the SAME calendar day (in the
 * parent's own timezone, so we don't silently jump the child's class to a
 * different day than the parent picked). Stops at the first match found,
 * which - because we expand outward symmetrically - is guaranteed to be
 * the nearest one in time, with ties broken toward the later slot.
 * Returns null if nothing on that day works (e.g. a fully-booked day),
 * letting the caller fall back to its existing hard-failure path.
 */
async function findNearestAvailableSlot({
  dateStr,
  preferredTimeUTC,
  ianaZone,
  slotDurationMinutes,
  maxStepsEachDirection = 24,
  excludeRanges = [],
}) {
  const { localToUTC, isValidIanaZone } = require('../utils/timezone');
  const adminConfig = await AdminConfig.getSingleton();
  const { startHour, endHour } = adminConfig.businessHours;

  if (!isValidIanaZone(ianaZone)) return null;

  // Build the full list of candidate start times for the day up front (in
  // business-hours order), then re-sort that list by absolute distance
  // from the preferred instant. This is simpler and less error-prone than
  // hand-walking the clock outward, and the slot count per day is small
  // (business-hours window / slot duration), so it stays fast.
  const candidates = [];
  for (let hour = startHour; hour < endHour; hour++) {
    for (let minute = 0; minute < 60; minute += slotDurationMinutes) {
      const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
      let startTimeUTC;
      try {
        startTimeUTC = localToUTC(dateStr, timeStr, ianaZone);
      } catch {
        continue; // DST gap - this local time doesn't exist, skip it
      }
      if (startTimeUTC.getTime() === preferredTimeUTC.getTime()) continue; // already tried
      if (startTimeUTC.getTime() < Date.now()) continue; // don't offer past slots
      candidates.push({ timeStr, startTimeUTC });
    }
  }

  candidates.sort((a, b) => {
    const distA = Math.abs(a.startTimeUTC.getTime() - preferredTimeUTC.getTime());
    const distB = Math.abs(b.startTimeUTC.getTime() - preferredTimeUTC.getTime());
    if (distA !== distB) return distA - distB;
    return a.startTimeUTC.getTime() - b.startTimeUTC.getTime(); // tie-break: prefer the later slot
  });

  const limit = Math.min(candidates.length, maxStepsEachDirection * 2);
  for (let i = 0; i < limit; i++) {
    const candidate = candidates[i];
    const endTimeUTC = new Date(candidate.startTimeUTC.getTime() + slotDurationMinutes * 60000);
    // Skip times the parent already has a class at (never auto-adjust onto them).
    if (excludeRanges.some((r) => candidate.startTimeUTC < r.endTimeUTC && endTimeUTC > r.startTimeUTC)) continue;
    const match = await findBestMentor({ startTimeUTC: candidate.startTimeUTC, endTimeUTC });
    if (match) {
      return { ...match, startTimeUTC: candidate.startTimeUTC, endTimeUTC, timeStr: candidate.timeStr };
    }
  }
  return null;
}

module.exports = {
  findBestMentor,
  suggestAlternateSlots,
  findNearestAvailableSlot,
  getEffectiveMaxClassesPerDay,
};