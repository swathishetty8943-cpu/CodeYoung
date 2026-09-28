const { DateTime } = require('luxon');

/**
 * Shared date/timezone utilities. Everything in this codebase that needs to
 * reason about "what date/time is this in someone's local zone" must go
 * through here, so DST handling and formatting stay consistent between API
 * responses, the matching algorithm, and email templates. Never hand-roll
 * offset math (e.g. "+05:30") anywhere else in the codebase.
 */

/**
 * Combine a plain date string ("YYYY-MM-DD"), a time string ("HH:mm"), and
 * an IANA timezone into a UTC JS Date. This is how a slot selected by a
 * parent (in their own local timezone) gets converted for storage.
 */
function localToUTC(dateStr, timeStr, ianaZone) {
  const dt = DateTime.fromFormat(`${dateStr} ${timeStr}`, 'yyyy-MM-dd HH:mm', {
    zone: ianaZone,
  });
  if (!dt.isValid) {
    throw new Error(`Invalid local datetime: ${dateStr} ${timeStr} (${ianaZone}): ${dt.invalidReason}`);
  }
  return dt.toUTC().toJSDate();
}

/**
 * Convert a stored UTC Date into a DateTime in the given IANA timezone.
 * Luxon resolves DST transitions automatically because it uses the IANA
 * tzdata, not a fixed offset.
 */
function utcToLocal(utcDate, ianaZone) {
  return DateTime.fromJSDate(utcDate, { zone: 'utc' }).setZone(ianaZone);
}

/**
 * The calendar date (YYYY-MM-DD) that a UTC instant falls on in the given
 * IANA timezone. Used for the "mentor's own local day" max-2-per-day rule -
 * a class at 11pm US time / 9am India time must count against the Indian
 * mentor's *next* local day, not the UTC date or the parent's date.
 */
function localDateString(utcDate, ianaZone) {
  return utcToLocal(utcDate, ianaZone).toFormat('yyyy-MM-dd');
}

/**
 * Human-friendly formatted local time string for emails/UI, e.g.
 * "Tue, Oct 14, 2026, 9:00 AM IST".
 */
function formatLocal(utcDate, ianaZone) {
  return utcToLocal(utcDate, ianaZone).toFormat('EEE, MMM d, yyyy, h:mm a ZZZZ');
}

/**
 * Returns the start-of-day and end-of-day (as UTC Date bounds) for a given
 * local calendar date + timezone. Useful for querying "all bookings on this
 * mentor-local date" via a UTC-indexed field.
 */
function localDayBoundsUTC(dateStr, ianaZone) {
  const start = DateTime.fromFormat(dateStr, 'yyyy-MM-dd', { zone: ianaZone }).startOf('day');
  const end = start.plus({ days: 1 });
  return { startUTC: start.toUTC().toJSDate(), endUTC: end.toUTC().toJSDate() };
}

/**
 * Best-effort validation that a string is a real IANA zone name.
 */
function isValidIanaZone(zone) {
  return DateTime.local().setZone(zone).isValid;
}

module.exports = {
  localToUTC,
  utcToLocal,
  localDateString,
  formatLocal,
  localDayBoundsUTC,
  isValidIanaZone,
};
