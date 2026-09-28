const asyncHandler = require('../utils/asyncHandler');
const { getAvailableSlots } = require('../services/availabilityService');
const { getParentDayBookingInfo } = require('../services/bookingService');
const ApiError = require('../utils/ApiError');
const { isValidIanaZone } = require('../utils/timezone');

// GET /api/mentors/availability?date=YYYY-MM-DD&timezone=IANA_ZONE
const getAvailability = asyncHandler(async (req, res) => {
  const { date, timezone } = req.query;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw ApiError.badRequest('A valid `date` query param (YYYY-MM-DD) is required');
  }
  const zone = timezone || req.user.timezone;
  if (!isValidIanaZone(zone)) {
    throw ApiError.badRequest(`Invalid IANA timezone: ${zone}`);
  }

  // Slots this parent already booked that day are removed from their list,
  // and `trialLimit` lets the UI show "N of 2 free trials used" up front.
  const dayInfo = await getParentDayBookingInfo({
    parentId: req.user.id,
    dateStr: date,
    ianaZone: zone,
  });
  const result = await getAvailableSlots({
    dateStr: date,
    ianaZone: zone,
    excludeRanges: dayInfo.bookedRanges,
  });
  res.json({ success: true, ...result, trialLimit: dayInfo.trialLimit });
});

module.exports = { getAvailability };