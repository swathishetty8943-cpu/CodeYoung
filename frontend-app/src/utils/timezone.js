import { DateTime } from 'luxon';

/**
 * Auto-detects the browser's IANA timezone, per spec section 4
 * ("Intl.DateTimeFormat().resolvedOptions().timeZone"). Used at signup
 * time and offered as an editable default in profile settings.
 */
export function detectBrowserTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/**
 * Formats a UTC ISO string (as returned by the API) into the given
 * viewer's local timezone. This is the single formatting function used
 * across both dashboards so parent and mentor always see times in their
 * own zone, computed the same way the backend computes it for emails.
 */
export function formatInZone(utcIsoString, ianaZone) {
  return DateTime.fromISO(utcIsoString, { zone: 'utc' })
    .setZone(ianaZone)
    .toFormat("EEE, MMM d, yyyy 'at' h:mm a ZZZZ");
}

export function toDateInputValue(date = new Date()) {
  return DateTime.fromJSDate(date).toFormat('yyyy-MM-dd');
}
