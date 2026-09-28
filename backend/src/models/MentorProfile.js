const mongoose = require('mongoose');

const { Schema } = mongoose;

const mentorProfileSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    // Overridable per-mentor; falls back to AdminConfig.defaultMaxClassesPerDay
    // when null so a global config change applies to mentors who haven't
    // been individually tuned.
    maxClassesPerDay: { type: Number, default: null },
    active: { type: Boolean, default: true },
    expertise: [{ type: String }],

    // Optional stretch: dates/slots a mentor has explicitly blocked off,
    // stored as UTC instants, that the availability + matching logic
    // should treat as unavailable regardless of load.
    unavailableSlots: [
      {
        startUTC: Date,
        endUTC: Date,
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('MentorProfile', mentorProfileSchema);
