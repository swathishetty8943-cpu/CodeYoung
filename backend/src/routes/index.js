const express = require('express');

const router = express.Router();

router.use('/auth', require('./authRoutes'));
router.use('/mentors', require('./mentorRoutes'));
router.use('/bookings', require('./bookingRoutes'));
router.use('/admin', require('./adminRoutes'));

router.get('/health', (req, res) => res.json({ success: true, status: 'ok' }));

module.exports = router;
