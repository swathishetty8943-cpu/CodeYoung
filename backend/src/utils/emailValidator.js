// Format validation is the baseline the spec requires ("at minimum").
// This regex is intentionally a reasonably strict RFC-5322-ish check
// rather than a naive `.includes('@')`, and rejects common typo patterns
// (double dots, no TLD) without being so strict it rejects legitimate
// addresses.
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

function isValidEmailFormat(email) {
  if (typeof email !== 'string' || email.length > 254) return false;
  if (email.includes('..')) return false;
  return EMAIL_REGEX.test(email);
}

/**
 * Placeholder hook for a real deliverability/MX-lookup or OTP-verification
 * step (the spec calls this out as an optional "go further" option). Kept
 * as a separate exported function so it can be swapped for a real
 * provider (e.g. an email-verification API) without touching callers.
 */
async function isLikelyDeliverable(email) {
  return isValidEmailFormat(email);
}

module.exports = { isValidEmailFormat, isLikelyDeliverable };
