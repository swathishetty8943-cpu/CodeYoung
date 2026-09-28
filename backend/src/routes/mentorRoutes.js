const express = require('express');
const mentorController = require('../controllers/mentorController');
const authGuard = require('../middleware/authGuard');
const roleGuard = require('../middleware/roleGuard');

const router = express.Router();

// Parents check availability before booking.
router.get('/availability', authGuard, roleGuard('parent'), mentorController.getAvailability);

module.exports = router;
