const express = require('express');
const authController = require('../controllers/authController');
const validate = require('../middleware/validate');
const authGuard = require('../middleware/authGuard');
const roleGuard = require('../middleware/roleGuard');
const {
  signupSchema,
  verifySignupOtpSchema,
  resendSignupOtpSchema,
  loginSchema,
  adminLoginSchema,
  changePasswordSchema,
  googleAuthSchema,
  setCountrySchema,
} = require('../utils/schemas');

const router = express.Router();

// Starts parent signup: validates input, emails a 4-digit code, and stores
// the pending signup - no account exists until /signup/verify-otp succeeds.
router.post('/signup', validate(signupSchema), authController.signup);
router.post(
  '/signup/verify-otp',
  validate(verifySignupOtpSchema),
  authController.verifySignupOtp
);
router.post(
  '/signup/resend-otp',
  validate(resendSignupOtpSchema),
  authController.resendSignupOtp
);
router.post('/login', validate(loginSchema), authController.login);
router.post('/admin-login', validate(adminLoginSchema), authController.adminLogin);
router.post('/google', validate(googleAuthSchema), authController.googleAuth);
// First-time country prompt for parents who signed up with Google.
router.patch(
  '/country',
  authGuard,
  roleGuard('parent'),
  validate(setCountrySchema),
  authController.setCountry
);
router.post('/logout', authController.logout);
router.get('/me', authGuard, authController.me);
// Any authenticated role (parent, mentor, admin) can change their own
// password - this is how the seeded default admin password gets rotated.
router.patch(
  '/change-password',
  authGuard,
  validate(changePasswordSchema),
  authController.changePassword
);

module.exports = router;