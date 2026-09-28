const asyncHandler = require('../utils/asyncHandler');
const bookingService = require('../services/bookingService');
const { User } = require('../models');

// POST /api/bookings - parent only (enforced by roleGuard on the route)
const createBooking = asyncHandler(async (req, res) => {
  const parentUser = await User.findById(req.user.id);
  const { date, time, contactEmail, bookingType, studentDetails } = req.body;
  const booking = await bookingService.createBooking({
    parentUser,
    dateStr: date,
    timeStr: time,
    contactEmail,
    bookingType,
    studentDetails,
  });
  res.status(201).json({ success: true, booking });
});

// GET /api/bookings/me - role-aware: parent sees own, mentor sees assigned
const getMyBookings = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  const result = await bookingService.getBookingsForUser(user);
  res.json({ success: true, ...result });
});

// PATCH /api/bookings/:id/cancel
const cancelBooking = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  const booking = await bookingService.cancelBooking({
    bookingId: req.params.id,
    requestingUser: user,
  });
  res.json({ success: true, booking });
});

module.exports = { createBooking, getMyBookings, cancelBooking };
