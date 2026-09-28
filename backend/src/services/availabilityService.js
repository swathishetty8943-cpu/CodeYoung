const { AdminConfig, MentorProfile, Booking } = require('../models');
const { localToUTC, localDateString } = require('../utils/timezone');

/**
 * Given a calendar date and IANA timezone (the parent's), returns the list
 * of slot start times on that date, in that timezone, for which at least
 * one mentor is currently available.
 *
 * PERFORMANCE: the previous version called findBestMentor() once per slot,
 * and each call re-queried config, mentors and per-mentor bookings - on the
 * order of hundreds of sequential DB round trips per request (40-50s on a
 * remote Atlas cluster). This version loads config, active mentors and all
 * relevant confirmed bookings ONCE, then evaluates every slot in memory
 * using exactly the same eligibility rules as matchingService.findBestMentor:
 *   (a) active mentor with an active user account
 *   (b) not inside one of the mentor's explicit unavailable blocks
 *   (c) no confirmed booking at that exact start time
 *   (d) fewer than the max classes/day on the mentor's own local date
 * Keep these rules in sync with matchingService.findBestMentor.
 */
async function getAvailableSlots({ dateStr, ianaZone, excludeRanges = [] }) {
  const config = await AdminConfig.getSingleton();
  const { startHour, endHour } = config.businessHours;
  const slotDurationMinutes = config.slotDurationMinutes;

  if (config.blackoutDates.includes(dateStr)) {
    return { slots: [], blackout: true };
  }

  // 1. Build candidate slots (no DB access).
  const candidates = [];
  const now = Date.now();
  for (let hour = startHour; hour < endHour; hour++) {
    for (let minute = 0; minute < 60; minute += slotDurationMinutes) {
      const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
      let startTimeUTC;
      try {
        // Skip local times that don't exist (spring-forward DST gap).
        startTimeUTC = localToUTC(dateStr, timeStr, ianaZone);
      } catch {
        continue;
      }
      if (startTimeUTC.getTime() < now) continue; // already passed
      const endTimeUTC = new Date(startTimeUTC.getTime() + slotDurationMinutes * 60000);
      // Times the parent has already booked drop out of their preferred-slot list.
      if (excludeRanges.some((r) => startTimeUTC < r.endTimeUTC && endTimeUTC > r.startTimeUTC)) continue;
      candidates.push({ timeStr, startTimeUTC, endTimeUTC });
    }
  }
  if (candidates.length === 0) return { slots: [], blackout: false };

  // 2. Load active mentors once.
  const profiles = (await MentorProfile.find({ active: true }).populate('userId')).filter(
    (mp) => mp.userId && mp.userId.active
  );
  if (profiles.length === 0) return { slots: [], blackout: false };

  const mentorIds = profiles.map((p) => p.userId._id);

  // Every (mentor-local date) any candidate slot could fall on.
  const localDates = new Set();
  for (const p of profiles) {
    for (const c of candidates) {
      localDates.add(localDateString(c.startTimeUTC, p.userId.timezone));
    }
  }
  const minStart = candidates[0].startTimeUTC;
  const maxStart = candidates[candidates.length - 1].startTimeUTC;

  // 3. One bookings query covering both the per-day counts and the exact
  //    start-time conflicts.
  const bookings = await Booking.find({
    mentorId: { $in: mentorIds },
    status: 'confirmed',
    $or: [
      { mentorLocalDate: { $in: [...localDates] } },
      { startTimeUTC: { $gte: minStart, $lte: maxStart } },
    ],
  })
    .select('mentorId mentorLocalDate startTimeUTC')
    .lean();

  const dayCount = new Map(); // `${mentorId}|${localDate}` -> confirmed count
  const conflicts = new Set(); // `${mentorId}|${startMs}`
  for (const b of bookings) {
    const dayKey = `${b.mentorId}|${b.mentorLocalDate}`;
    dayCount.set(dayKey, (dayCount.get(dayKey) || 0) + 1);
    conflicts.add(`${b.mentorId}|${new Date(b.startTimeUTC).getTime()}`);
  }

  // 4. Evaluate every slot in memory.
  const slots = [];
  for (const { timeStr, startTimeUTC, endTimeUTC } of candidates) {
    const startMs = startTimeUTC.getTime();
    const hasMentor = profiles.some((profile) => {
      const mentor = profile.userId;
      const blocked = (profile.unavailableSlots || []).some(
        (block) => startTimeUTC < block.endUTC && endTimeUTC > block.startUTC
      );
      if (blocked) return false;
      if (conflicts.has(`${mentor._id}|${startMs}`)) return false;

      const mentorLocalDate = localDateString(startTimeUTC, mentor.timezone);
      const booked = dayCount.get(`${mentor._id}|${mentorLocalDate}`) || 0;
      const maxPerDay = profile.maxClassesPerDay ?? config.defaultMaxClassesPerDay;
      return booked < maxPerDay;
    });

    if (hasMentor) {
      slots.push({
        timeStr,
        startTimeUTC,
        endTimeUTC,
        availableMentorCount: undefined, // intentionally not leaking mentor identity/count pre-booking
      });
    }
  }

  return { slots, blackout: false };
}

module.exports = { getAvailableSlots };