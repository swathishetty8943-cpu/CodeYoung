const { AdminConfig, Booking, MentorProfile } = require('../models');
const { localDateString } = require('../utils/timezone');

async function getConfig() {
  return AdminConfig.getSingleton();
}

async function updateConfig(updates) {
  const config = await AdminConfig.getSingleton();

  const allowedFields = [
    'defaultMaxClassesPerDay',
    'reminderLeadTimeMinutes',
    'slotDurationMinutes',
    'maxFreeTrialsPerFamily',
    'businessHours',
    'blackoutDates',
  ];
  for (const field of allowedFields) {
    if (updates[field] !== undefined) config[field] = updates[field];
  }
  await config.save();
  return config;
}

async function listAllBookings({ limit = 100 } = {}) {
  return Booking.find()
    .sort({ startTimeUTC: -1 })
    .limit(limit)
    .populate('parentId', 'name email timezone')
    .populate('mentorId', 'name email timezone');
}

/**
 * Simple platform stats for the admin "good to have" dashboard: bookings
 * today (counted in UTC calendar date for simplicity at the platform
 * level, since "today" for a global admin view has no single canonical
 * timezone) and per-mentor utilization for the last 30 days.
 */
async function getStats() {
  const startOfTodayUTC = new Date();
  startOfTodayUTC.setUTCHours(0, 0, 0, 0);
  const endOfTodayUTC = new Date(startOfTodayUTC.getTime() + 24 * 60 * 60 * 1000);

  const [bookingsToday, totalActiveMentors, totalConfirmedBookings] = await Promise.all([
    Booking.countDocuments({
      startTimeUTC: { $gte: startOfTodayUTC, $lt: endOfTodayUTC },
      status: 'confirmed',
    }),
    MentorProfile.countDocuments({ active: true }),
    Booking.countDocuments({ status: 'confirmed' }),
  ]);

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const utilizationAgg = await Booking.aggregate([
    { $match: { status: 'confirmed', startTimeUTC: { $gte: thirtyDaysAgo } } },
    { $group: { _id: '$mentorId', count: { $sum: 1 } } },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'mentor',
      },
    },
    { $unwind: '$mentor' },
    { $project: { mentorName: '$mentor.name', count: 1 } },
    { $sort: { count: -1 } },
  ]);

  return {
    bookingsToday,
    totalActiveMentors,
    totalConfirmedBookings,
    mentorUtilizationLast30Days: utilizationAgg,
  };
}

module.exports = { getConfig, updateConfig, listAllBookings, getStats };
