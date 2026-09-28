const authService = require('../services/authService');
const asyncHandler = require('../utils/asyncHandler');
const env = require('../config/env');

// Render (and most PaaS deploys) put the backend and the two frontends on
// different subdomains, which browsers treat as cross-site. A `sameSite:
// 'lax'` cookie is not sent back on those cross-origin XHR/fetch calls, so
// login/signup would silently appear to "not persist". `sameSite: 'none'`
// (only valid together with `secure: true`, which Render's HTTPS satisfies)
// is required for the cookie to survive a cross-subdomain deployment; in
// local dev (http, same-site ports) we keep the stricter 'lax'.
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

function setAuthCookie(res, token) {
  res.cookie('token', token, COOKIE_OPTIONS);
}

// POST /api/auth/signup - parent only. Body validated by zod schema to
// strip anything else (including any `role` field) before it gets here,
// but we also never read req.body.role at all as a second line of
// defense against a client sending role: "mentor".
//
// This no longer creates the account directly - it starts email
// verification. No cookie is set and no user is returned; the account is
// only created once the code is verified (see verifySignupOtp below).
const signup = asyncHandler(async (req, res) => {
  const { name, email, password, timezone, country } = req.body;
  const result = await authService.startParentSignup({ name, email, password, timezone, country });
  res.status(200).json({ success: true, ...result });
});

// POST /api/auth/signup/verify-otp - the account is created here, on a
// correct, non-expired code. Response shape matches the old direct-signup
// response (user + cookie + token) so the frontend's post-signup flow is
// otherwise unchanged.
const verifySignupOtp = asyncHandler(async (req, res) => {
  const { email, code } = req.body;
  const { token, user } = await authService.verifyParentSignupOtp({ email, code });
  setAuthCookie(res, token);
  res.status(201).json({ success: true, user, token });
});

// POST /api/auth/signup/resend-otp
const resendSignupOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const result = await authService.resendParentSignupOtp({ email });
  res.status(200).json({ success: true, ...result });
});

// POST /api/auth/login - body includes selectedRole ("parent" | "mentor")
const login = asyncHandler(async (req, res) => {
  const { email, password, selectedRole } = req.body;
  const { token, user } = await authService.loginWithPassword({ email, password, selectedRole });
  setAuthCookie(res, token);
  res.json({ success: true, user, token });
});

// POST /api/auth/google
const googleAuth = asyncHandler(async (req, res) => {
  const { idToken, timezone, country } = req.body;
  const { token, user, isNewAccount } = await authService.loginOrSignupWithGoogle({
    idToken,
    timezone,
    country,
  });
  setAuthCookie(res, token);
  res.json({ success: true, user, token, isNewAccount });
});

// PATCH /api/auth/country - parent only. Completes the profile of a parent
// who signed up with Google (no country step there). Returns the updated
// user so the frontend can drop the prompt without another /me call.
const setCountry = asyncHandler(async (req, res) => {
  const { country, timezone } = req.body;
  const user = await authService.setParentCountry({ userId: req.user.id, country, timezone });
  res.json({ success: true, user });
});

// POST /api/auth/admin-login - separate from the parent/mentor login;
// no role toggle, admin accounts are pre-seeded only (see spec section D).
const adminLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const { token, user } = await authService.loginAdmin({ email, password });
  setAuthCookie(res, token);
  res.json({ success: true, user, token });
});

const logout = asyncHandler(async (req, res) => {
  res.clearCookie('token', COOKIE_OPTIONS);
  res.json({ success: true });
});

const me = asyncHandler(async (req, res) => {
  const { User } = require('../models');
  const user = await User.findById(req.user.id);
  res.json({ success: true, user: await authService.toPublicUser(user) });
});

// PATCH /api/auth/change-password - works for any authenticated role
// (parent, mentor, admin), so seeded defaults like the admin login are
// never stuck as-is.
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await authService.changePassword({
    userId: req.user.id,
    currentPassword,
    newPassword,
  });
  res.json({ success: true, user });
});

module.exports = {
  signup,
  verifySignupOtp,
  resendSignupOtp,
  login,
  googleAuth,
  setCountry,
  adminLogin,
  logout,
  me,
  changePassword,
};