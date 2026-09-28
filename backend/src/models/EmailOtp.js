const mongoose = require('mongoose');

const { Schema } = mongoose;

/**
 * Holds a *pending* parent signup: the details the user typed in plus the
 * hashed OTP that was emailed to them. No `User` document exists until the
 * code is verified (see authService.verifyParentSignupOtp) - this record is
 * the only trace of the signup attempt until then.
 *
 * One document per email address. A fresh signup attempt (or a resend)
 * overwrites any existing pending record for that email via upsert, so a
 * user can never end up with two live codes for the same address.
 *
 * `expiresAt` drives a MongoDB TTL index that deletes the document once it
 * expires - no separate cleanup job needed. Mongo's TTL monitor runs on a
 * ~60s cycle, so verification also independently checks `expiresAt` itself
 * rather than relying on the document having been deleted in time.
 */
const emailOtpSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    // Signup details captured at the "start signup" step, applied to the
    // real User record only once the OTP is verified.
    name: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true },
    timezone: { type: String, default: 'UTC' },
    // Country picked in the signup form; see User.country for why this
    // exists alongside timezone. Applied to the real User record once the
    // OTP is verified, same as every other field captured here.
    country: { type: String, default: null, trim: true, uppercase: true },

    // Never store the plaintext code - only its hash, same treatment as
    // account passwords.
    otpHash: { type: String, required: true },

    attemptCount: { type: Number, default: 0 },

    // Throttles "Resend code" independently of the code's own expiry, so a
    // freshly-sent code can't be immediately re-requested.
    lastSentAt: { type: Date, default: Date.now },

    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

// TTL index: MongoDB removes the document once expiresAt is in the past.
emailOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('EmailOtp', emailOtpSchema);
