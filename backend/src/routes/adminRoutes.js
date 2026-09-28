const express = require('express');
const adminController = require('../controllers/adminController');
const authGuard = require('../middleware/authGuard');
const roleGuard = require('../middleware/roleGuard');
const validate = require('../middleware/validate');
const { createMentorSchema, updateMentorSchema, updateConfigSchema } = require('../utils/schemas');

const router = express.Router();

// Every route here requires an authenticated admin. Admin accounts are
// never created via public signup (see spec section 4) - they're seeded
// or created via a protected script - and log in via the dedicated
// POST /api/auth/admin-login endpoint (see authRoutes.js), which has no
// parent/mentor role toggle at all.
router.use(authGuard, roleGuard('admin'));

router.get('/mentors', adminController.listMentors);
router.post('/mentors', validate(createMentorSchema), adminController.createMentor);
router.patch('/mentors/:id', validate(updateMentorSchema), adminController.updateMentor);
router.get('/mentors/:id/schedule', adminController.getMentorSchedule);

router.get('/config', adminController.getConfig);
router.patch('/config', validate(updateConfigSchema), adminController.updateConfig);

router.get('/bookings', adminController.listAllBookings);
router.get('/stats', adminController.getStats);

module.exports = router;
