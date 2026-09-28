// Country -> IANA timezone mapping used at signup.
//
// The requirement (mentors are usually in India, parents usually in the
// US/UK, but could be anywhere) is that we always know a user's real IANA
// timezone so local times can be displayed/communicated correctly to both
// sides (see backend/src/utils/timezone.js - every date shown in the UI or
// an email is computed from this value).
//
// Browser auto-detection (Intl.DateTimeFormat().resolvedOptions().timeZone)
// is accurate for *where the browser thinks it is*, but it silently breaks
// or gives a surprising answer when a parent is on a work laptop with its
// system clock/region misconfigured, a VPN, or a shared/school device. So at
// signup we also ask for the parent's country, which:
//   1. Lets us pick a sensible default timezone even if browser detection
//      is wrong or unavailable.
//   2. Lets us show a second "Timezone" dropdown for countries that span
//      multiple zones (e.g. the US, Canada, Australia), so the exact local
//      time we store is one the parent explicitly confirmed rather than
//      guessed.
//
// Each entry's `timezones` list is ordered by roughly how many people live
// in that zone, so the first entry is a reasonable default.
export const COUNTRIES = [
  { code: 'US', name: 'United States', timezones: [
    { value: 'America/New_York', label: 'Eastern Time (New York)' },
    { value: 'America/Chicago', label: 'Central Time (Chicago)' },
    { value: 'America/Denver', label: 'Mountain Time (Denver)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (Los Angeles)' },
    { value: 'America/Anchorage', label: 'Alaska Time (Anchorage)' },
    { value: 'Pacific/Honolulu', label: 'Hawaii Time (Honolulu)' },
  ] },
  { code: 'GB', name: 'United Kingdom', timezones: [
    { value: 'Europe/London', label: 'London' },
  ] },
  { code: 'IN', name: 'India', timezones: [
    { value: 'Asia/Kolkata', label: 'India Standard Time (Kolkata)' },
  ] },
  { code: 'CA', name: 'Canada', timezones: [
    { value: 'America/Toronto', label: 'Eastern Time (Toronto)' },
    { value: 'America/Winnipeg', label: 'Central Time (Winnipeg)' },
    { value: 'America/Edmonton', label: 'Mountain Time (Edmonton)' },
    { value: 'America/Vancouver', label: 'Pacific Time (Vancouver)' },
    { value: 'America/Halifax', label: 'Atlantic Time (Halifax)' },
    { value: 'America/St_Johns', label: 'Newfoundland Time (St. John\u2019s)' },
  ] },
  { code: 'AU', name: 'Australia', timezones: [
    { value: 'Australia/Sydney', label: 'Sydney' },
    { value: 'Australia/Melbourne', label: 'Melbourne' },
    { value: 'Australia/Brisbane', label: 'Brisbane' },
    { value: 'Australia/Adelaide', label: 'Adelaide' },
    { value: 'Australia/Perth', label: 'Perth' },
  ] },
  { code: 'IE', name: 'Ireland', timezones: [{ value: 'Europe/Dublin', label: 'Dublin' }] },
  { code: 'NZ', name: 'New Zealand', timezones: [{ value: 'Pacific/Auckland', label: 'Auckland' }] },
  { code: 'SG', name: 'Singapore', timezones: [{ value: 'Asia/Singapore', label: 'Singapore' }] },
  { code: 'AE', name: 'United Arab Emirates', timezones: [{ value: 'Asia/Dubai', label: 'Dubai' }] },
  { code: 'ZA', name: 'South Africa', timezones: [{ value: 'Africa/Johannesburg', label: 'Johannesburg' }] },
  { code: 'DE', name: 'Germany', timezones: [{ value: 'Europe/Berlin', label: 'Berlin' }] },
  { code: 'FR', name: 'France', timezones: [{ value: 'Europe/Paris', label: 'Paris' }] },
  { code: 'ES', name: 'Spain', timezones: [{ value: 'Europe/Madrid', label: 'Madrid' }] },
  { code: 'IT', name: 'Italy', timezones: [{ value: 'Europe/Rome', label: 'Rome' }] },
  { code: 'NL', name: 'Netherlands', timezones: [{ value: 'Europe/Amsterdam', label: 'Amsterdam' }] },
  { code: 'PK', name: 'Pakistan', timezones: [{ value: 'Asia/Karachi', label: 'Karachi' }] },
  { code: 'BD', name: 'Bangladesh', timezones: [{ value: 'Asia/Dhaka', label: 'Dhaka' }] },
  { code: 'PH', name: 'Philippines', timezones: [{ value: 'Asia/Manila', label: 'Manila' }] },
  { code: 'MY', name: 'Malaysia', timezones: [{ value: 'Asia/Kuala_Lumpur', label: 'Kuala Lumpur' }] },
  { code: 'JP', name: 'Japan', timezones: [{ value: 'Asia/Tokyo', label: 'Tokyo' }] },
  { code: 'KR', name: 'South Korea', timezones: [{ value: 'Asia/Seoul', label: 'Seoul' }] },
  { code: 'CN', name: 'China', timezones: [{ value: 'Asia/Shanghai', label: 'Shanghai' }] },
  { code: 'BR', name: 'Brazil', timezones: [
    { value: 'America/Sao_Paulo', label: 'S\u00e3o Paulo' },
    { value: 'America/Manaus', label: 'Manaus' },
  ] },
  { code: 'MX', name: 'Mexico', timezones: [
    { value: 'America/Mexico_City', label: 'Mexico City' },
    { value: 'America/Tijuana', label: 'Tijuana' },
  ] },
  { code: 'RU', name: 'Russia', timezones: [
    { value: 'Europe/Moscow', label: 'Moscow' },
    { value: 'Asia/Yekaterinburg', label: 'Yekaterinburg' },
    { value: 'Asia/Novosibirsk', label: 'Novosibirsk' },
    { value: 'Asia/Vladivostok', label: 'Vladivostok' },
  ] },
  { code: 'SA', name: 'Saudi Arabia', timezones: [{ value: 'Asia/Riyadh', label: 'Riyadh' }] },
  { code: 'EG', name: 'Egypt', timezones: [{ value: 'Africa/Cairo', label: 'Cairo' }] },
  { code: 'NG', name: 'Nigeria', timezones: [{ value: 'Africa/Lagos', label: 'Lagos' }] },
  { code: 'KE', name: 'Kenya', timezones: [{ value: 'Africa/Nairobi', label: 'Nairobi' }] },
  { code: 'OTHER', name: 'Other / not listed', timezones: [{ value: 'UTC', label: 'UTC' }] },
];

export function getCountry(code) {
  return COUNTRIES.find((c) => c.code === code) || null;
}

/**
 * Picks the best default timezone for a country, preferring the browser's
 * auto-detected zone when it's actually one of that country's zones (e.g.
 * a US parent whose browser correctly reports "America/Chicago"), and
 * falling back to the country's most populous zone otherwise.
 */
export function defaultTimezoneForCountry(code, detectedZone) {
  const country = getCountry(code);
  if (!country) return detectedZone || 'UTC';
  const match = country.timezones.find((tz) => tz.value === detectedZone);
  return match ? match.value : country.timezones[0].value;
}
