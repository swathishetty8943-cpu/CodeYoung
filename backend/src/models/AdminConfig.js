const mongoose = require('mongoose');

const { Schema } = mongoose;

// Singleton document — there should only ever be one AdminConfig row.
// Use AdminConfig.getSingleton() rather than find()/findOne() directly so
// callers always get a valid config even before one has been created.
const adminConfigSchema = new Schema(
  {
    singletonKey: { type: String, default: 'GLOBAL', unique: true },

    defaultMaxClassesPerDay: { type: Number, default: 2 },
    reminderLeadTimeMinutes: { type: Number, default: 60 },
    slotDurationMinutes: { type: Number, default: 30 },

    // How many free trial classes each family (parent account) gets before
    // they're required to book Full Coaching instead. Admin-configurable;
    // defaults to 5 for new deployments.
    maxFreeTrialsPerFamily: { type: Number, default: 5 },

    // Business hours are stored per-region as local hour-of-day integers
    // (0-23), interpreted in the mentor's timezone for mentor-side hours.
    businessHours: {
      startHour: { type: Number, default: 9 },
      endHour: { type: Number, default: 18 },
    },

    // Calendar dates (YYYY-MM-DD, mentor-local) with no bookings allowed.
    blackoutDates: [{ type: String }],
  },
  { timestamps: true }
);

adminConfigSchema.statics.getSingleton = async function () {
  let config = await this.findOne({ singletonKey: 'GLOBAL' });
  if (!config) {
    config = await this.create({ singletonKey: 'GLOBAL' });
  }
  return config;
};

module.exports = mongoose.model('AdminConfig', adminConfigSchema);
