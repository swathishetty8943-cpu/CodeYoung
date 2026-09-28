const express = require('express');
const bookingController = require('../controllers/bookingController');
const authGuard = require('../middleware/authGuard');
const roleGuard = require('../middleware/roleGuard');
const validate = require('../middleware/validate');
const { createBookingSchema } = require('../utils/schemas');

const router = express.Router();

router.post(
  '/',
  authGuard,
  roleGuard('parent'),
  validate(createBookingSchema),
  bookingController.createBooking
);

// role-aware inside the controller: parent sees own, mentor sees assigned
router.get('/me', authGuard, roleGuard('parent', 'mentor'), bookingController.getMyBookings);

router.patch(
  '/:id/cancel',
  authGuard,
  roleGuard('parent', 'mentor', 'admin'),
  bookingController.cancelBooking
);

module.exports = router;
