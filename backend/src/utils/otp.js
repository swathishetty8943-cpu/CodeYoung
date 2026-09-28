const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const OTP_SALT_ROUNDS = 10;

/**
 * Generates a random 4-digit code as a zero-padded string ("0000"-"9999"),
 * using crypto.randomInt rather than Math.random for an unbiased,
 * cryptographically-sound draw.
 */
function generateOtp() {
  return crypto.randomInt(0, 10000).toString().padStart(4, '0');
}

function hashOtp(code) {
  return bcrypt.hash(code, OTP_SALT_ROUNDS);
}

function compareOtp(code, hash) {
  return bcrypt.compare(code, hash);
}

module.exports = { generateOtp, hashOtp, compareOtp };
