const mongoose = require('mongoose');

const { Schema } = mongoose;

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    // Nullable because Google-only accounts have no local password.
    passwordHash: { type: String, default: null },
    googleId: { type: String, default: null, index: true },

    role: {
      type: String,
      enum: ['parent', 'mentor', 'admin'],
      required: true,
    },

    // IANA timezone identifier, e.g. "America/New_York" or "Asia/Kolkata".
    // Auto-detected on the client at signup, editable later in profile.
    timezone: {
      type: String,
      required: true,
      default: 'UTC',
    },

    // ISO-3166 alpha-2 country code (e.g. "US", "GB", "IN"), collected from
    // parents at signup (see frontend utils/countries.js). This is what
    // drives which timezone we default/offer at signup, and is stored
    // separately from `timezone` so it can still answer "what country is
    // this family in" even if they later edit their timezone directly.
    // Nullable because mentor accounts (admin-created) and Google sign-ups
    // don't go through the country step.
    country: { type: String, default: null, trim: true, uppercase: true },

    // If true, the account was created by an admin (mentors) and must set
    // its own password before first real login, even though a temp
    // password/hash may already exist.
    mustResetPassword: { type: Boolean, default: false },

    active: { type: Boolean, default: true },

    // Number of free trial classes this parent has already booked. Compared
    // against AdminConfig.maxFreeTrialsPerFamily (admin-configurable,
    // defaults to 5) rather than a single used/unused flag, so families can
    // get more than one free trial when the admin allows it. Incremented
    // the moment a trial booking is created (see
    // bookingService.createBooking) and never reset by cancellation, so a
    // parent can't cancel-and-rebook to get extra free trials. Always 0 for
    // mentor/admin accounts.
    freeTrialsUsedCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

userSchema.index({ email: 1, role: 1 });

module.exports = mongoose.model('User', userSchema);
