const mongoose = require('mongoose');

const { Schema } = mongoose;

const bookingSchema = new Schema(
  {
    parentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    mentorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    // 'trial' is the free, one-per-family class. 'full_coaching' is a paid
    // coaching enrollment call - it does NOT consume/require the free
    // trial and collects extra intake details up front (see
    // studentDetails below) so the mentor walks in prepared.
    bookingType: {
      type: String,
      enum: ['trial', 'full_coaching'],
      default: 'trial',
      index: true,
    },

    // Only populated for bookingType 'full_coaching'. Kept as a loose
    // sub-object (rather than separate top-level fields) so it's easy to
    // extend later without another migration.
    studentDetails: {
      childName: { type: String, trim: true },
      ageOrGrade: { type: String, trim: true },
      subject: { type: String, trim: true },
      goals: { type: String, trim: true },
      contactPhone: { type: String, trim: true },
    },

    // Always stored in UTC. Local display/email formatting happens only at
    // the presentation layer via each recipient's stored IANA timezone.
    startTimeUTC: { type: Date, required: true, index: true },
    endTimeUTC: { type: Date, required: true },

    // Set ONLY when the parent's originally-selected time had no mentor
    // available and the system auto-adjusted the booking to the nearest
    // bookable slot (see matchingService.findNearestAvailableSlot).
    // startTimeUTC above is always the REAL, actually-booked time; this
    // field is kept purely so the parent/mentor/admin can see what was
    // originally requested and so emails/UI can call out the adjustment
    // transparently rather than silently booking a different time.
    requestedTimeUTC: { type: Date, default: null },

    // The mentor's own local calendar date for startTimeUTC, formatted as
    // "YYYY-MM-DD" in the mentor's IANA timezone. This is precomputed and
    // stored (not derived from UTC date) so the "max 2 per mentor's local
    // day" rule can be queried directly and stays correct even across DST
    // transitions or if the mentor's timezone were ever to change.
    mentorLocalDate: { type: String, required: true, index: true },

    meetLink: { type: String, required: true },

    status: {
      type: String,
      enum: ['confirmed', 'cancelled', 'completed'],
      default: 'confirmed',
      index: true,
    },

    // Set once the reminder email has actually been sent, so the cron job
    // is idempotent across server restarts (it queries for bookings where
    // this is still null and the reminder window has been reached).
    reminderSentAt: { type: Date, default: null },

    // The contact email actually used for this booking's notifications,
    // in case the booking flow ever allows overriding the account email.
    contactEmail: { type: String, required: true },
  },
  { timestamps: true }
);

// Prevents two confirmed bookings for the same mentor at the exact same
// start time (overlap guard at the DB level, in addition to the
// application-level check in the matching service).
bookingSchema.index(
  { mentorId: 1, startTimeUTC: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'confirmed' },
  }
);

module.exports = mongoose.model('Booking', bookingSchema);
