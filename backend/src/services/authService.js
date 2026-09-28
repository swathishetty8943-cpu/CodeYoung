const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, MentorProfile, AdminConfig, EmailOtp } = require('../models');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const { verifyGoogleToken } = require('../config/googleAuth');
const { generateOtp, hashOtp, compareOtp } = require('../utils/otp');
const emailService = require('./emailService');
const { isValidIanaZone } = require('../utils/timezone');

const SALT_ROUNDS = 10;

function signToken(user) {
  return jwt.sign(
    { id: user._id.toString(), role: user.role, email: user.email },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRY }
  );
}

/**
 * Builds the user object sent to clients. For parents this also resolves
 * the current admin-configured free trial allowance (default 5, editable
 * from the admin Config page) and how many the family has left, so the
 * frontend never has to hardcode "1 free trial" anywhere.
 */
async function toPublicUser(user) {
  const config = await AdminConfig.getSingleton();
  const maxFreeTrialsPerFamily = config.maxFreeTrialsPerFamily;
  const freeTrialsUsedCount = user.freeTrialsUsedCount || 0;

  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    timezone: user.timezone,
    country: user.country,
    // True for a parent whose country isn't known yet (i.e. signed up with
    // Google, which has no country step). The frontend uses this to ask for
    // it the first time they land on the dashboard.
    needsCountry: user.role === 'parent' && !user.country,
    mustResetPassword: user.mustResetPassword,
    freeTrialsUsedCount,
    maxFreeTrialsPerFamily,
    freeTrialsRemaining: Math.max(0, maxFreeTrialsPerFamily - freeTrialsUsedCount),
  };
}

function otpExpiryDate() {
  return new Date(Date.now() + env.SIGNUP_OTP_EXPIRY_MINUTES * 60 * 1000);
}

/**
 * Step 1 of parent signup: validates the input, checks the email isn't
 * already a real account, then stashes the signup details + a hashed
 * 4-digit code in EmailOtp - NOT in User. No account exists yet. Even if a
 * client somehow sends `role: "mentor"` in the request body, this function
 * never reads a role from its input - the caller (controller) must not pass
 * one through. This is the "never trust the client" rule from the spec.
 *
 * A fresh attempt for the same email overwrites (upserts) any previous
 * pending OTP record, so retrying signup before an old code expires can
 * never leave two live codes for one address.
 */
async function startParentSignup({ name, email, password, timezone, country }) {
  const normalizedEmail = email.toLowerCase();

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    throw ApiError.conflict('An account with this email already exists');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const code = generateOtp();
  const otpHash = await hashOtp(code);

  await EmailOtp.findOneAndUpdate(
    { email: normalizedEmail },
    {
      email: normalizedEmail,
      name,
      passwordHash,
      timezone: timezone || 'UTC',
      country: country || null,
      otpHash,
      attemptCount: 0,
      lastSentAt: new Date(),
      expiresAt: otpExpiryDate(),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await emailService.sendSignupOtp({
    to: normalizedEmail,
    name,
    code,
    expiryMinutes: env.SIGNUP_OTP_EXPIRY_MINUTES,
  });

  return { email: normalizedEmail, expiresInMinutes: env.SIGNUP_OTP_EXPIRY_MINUTES };
}

/**
 * Step 2: checks the submitted code against the stored hash. Only on a
 * correct, non-expired code does the real `User` record get created (and a
 * session token issued) - this is the single place a parent account is ever
 * created via the password-signup path.
 *
 * Wrong codes increment attemptCount; once it reaches
 * env.SIGNUP_OTP_MAX_ATTEMPTS the pending record is deleted outright so the
 * user must request a new code rather than keep guessing against the same
 * one.
 */
async function verifyParentSignupOtp({ email, code }) {
  const normalizedEmail = email.toLowerCase();
  const pending = await EmailOtp.findOne({ email: normalizedEmail });

  if (!pending) {
    throw ApiError.badRequest('No pending signup found for this email. Please sign up again.');
  }

  if (pending.expiresAt.getTime() < Date.now()) {
    await EmailOtp.deleteOne({ _id: pending._id });
    throw ApiError.badRequest('This code has expired. Please request a new one.');
  }

  const valid = await compareOtp(code, pending.otpHash);
  if (!valid) {
    pending.attemptCount += 1;
    if (pending.attemptCount >= env.SIGNUP_OTP_MAX_ATTEMPTS) {
      await EmailOtp.deleteOne({ _id: pending._id });
      throw ApiError.badRequest(
        'Too many incorrect attempts. Please request a new code.'
      );
    }
    await pending.save();
    throw ApiError.badRequest('Incorrect code. Please try again.');
  }

  // Re-check for a race where the email got registered (e.g. via Google)
  // while the code was pending.
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    await EmailOtp.deleteOne({ _id: pending._id });
    throw ApiError.conflict('An account with this email already exists');
  }

  const user = await User.create({
    name: pending.name,
    email: normalizedEmail,
    passwordHash: pending.passwordHash,
    role: 'parent',
    timezone: pending.timezone || 'UTC',
    country: pending.country || null,
  });

  await EmailOtp.deleteOne({ _id: pending._id });

  const token = signToken(user);
  return { token, user: await toPublicUser(user) };
}

/**
 * Step 2b: issues a fresh code for an in-progress signup, reusing the
 * name/password/timezone already captured in step 1 (the user doesn't
 * re-enter anything). Enforces env.SIGNUP_OTP_RESEND_COOLDOWN_SECONDS
 * between requests so this can't be spammed, and resets attemptCount along
 * with the expiry since it's effectively a brand new code.
 */
async function resendParentSignupOtp({ email }) {
  const normalizedEmail = email.toLowerCase();
  const pending = await EmailOtp.findOne({ email: normalizedEmail });

  if (!pending) {
    throw ApiError.badRequest('No pending signup found for this email. Please sign up again.');
  }

  const secondsSinceLastSend = (Date.now() - pending.lastSentAt.getTime()) / 1000;
  if (secondsSinceLastSend < env.SIGNUP_OTP_RESEND_COOLDOWN_SECONDS) {
    const retryAfterSeconds = Math.ceil(
      env.SIGNUP_OTP_RESEND_COOLDOWN_SECONDS - secondsSinceLastSend
    );
    throw ApiError.badRequest(
      `Please wait ${retryAfterSeconds}s before requesting another code.`,
      { retryAfterSeconds }
    );
  }

  const code = generateOtp();
  pending.otpHash = await hashOtp(code);
  pending.attemptCount = 0;
  pending.lastSentAt = new Date();
  pending.expiresAt = otpExpiryDate();
  await pending.save();

  await emailService.sendSignupOtp({
    to: normalizedEmail,
    name: pending.name,
    code,
    expiryMinutes: env.SIGNUP_OTP_EXPIRY_MINUTES,
  });

  return { email: normalizedEmail, expiresInMinutes: env.SIGNUP_OTP_EXPIRY_MINUTES };
}

/**
 * Login requires the client to send the role they believe the account is
 * ("I am a Parent" / "I am a Mentor" toggle). We verify that against the
 * stored role and reject with a clear, specific error on mismatch, per
 * spec section B.
 */
async function loginWithPassword({ email, password, selectedRole }) {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    throw ApiError.badRequest('No account found with this email');
  }
  if (!user.passwordHash) {
    throw ApiError.badRequest('This account uses Google Sign-In. Please continue with Google.');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw ApiError.badRequest('Incorrect password');
  }

  if (user.role !== selectedRole) {
    throw ApiError.badRequest(
      `This account is registered as a ${capitalize(user.role)}. Please log in from the ${capitalize(
        user.role
      )} tab.`
    );
  }

  if (!user.active) {
    throw ApiError.forbidden('This account has been deactivated. Please contact support.');
  }

  const token = signToken(user);
  return { token, user: await toPublicUser(user) };
}

/**
 * Google OAuth login/signup. Behavior per spec:
 * - If the Google account already exists in our DB, log in as that user's
 *   existing role (mentors already exist with role pre-assigned by admin,
 *   so they never hit a role-confirmation step).
 * - If it's a brand new Google identity, the frontend must have already
 *   collected a role confirmation for first-time signups. Since public
 *   Google signup can only ever create parents (mentors are never
 *   self-service, matching the password-signup rule), we ignore any role
 *   the client claims and always create new Google accounts as parents.
 */
async function loginOrSignupWithGoogle({ idToken, timezone, country }) {
  const profile = await verifyGoogleToken(idToken);
  if (!profile.emailVerified) {
    throw ApiError.badRequest('Google account email is not verified');
  }

  let user = await User.findOne({
    $or: [{ googleId: profile.googleId }, { email: profile.email.toLowerCase() }],
  });

  if (user) {
    // Backfill googleId if the account was originally created via password.
    if (!user.googleId) {
      user.googleId = profile.googleId;
      await user.save();
    }
    if (!user.active) {
      throw ApiError.forbidden('This account has been deactivated. Please contact support.');
    }
    const token = signToken(user);
    return { token, user: await toPublicUser(user), isNewAccount: false };
  }

  user = await User.create({
    name: profile.name,
    email: profile.email.toLowerCase(),
    googleId: profile.googleId,
    role: 'parent',
    timezone: timezone || 'UTC',
    country: country || null,
  });

  const token = signToken(user);
  return { token, user: await toPublicUser(user), isNewAccount: true };
}

/**
 * Saves the country (and matching timezone) for a parent who doesn't have
 * one yet - this is the "first time" prompt after a Google sign-up. It can
 * only be used while country is still unset, so it's a one-time completion
 * step rather than a general profile editor.
 */
async function setParentCountry({ userId, country, timezone }) {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('Account not found');
  if (user.role !== 'parent') throw ApiError.forbidden('Only parent accounts have a country');
  if (user.country) throw ApiError.conflict('Your country is already set.');

  if (timezone) {
    if (!isValidIanaZone(timezone)) throw ApiError.badRequest(`Invalid timezone: ${timezone}`);
    user.timezone = timezone;
  }
  user.country = country;
  await user.save();
  return await toPublicUser(user);
}

/**
 * Used by the admin "create mentor" flow: creates a mentor User + linked
 * MentorProfile, with a temp password the mentor must change on first
 * login. Never exposed as a public signup route.
 *
 * The temp password defaults to the mentor's own email address (lowercased,
 * same as how it's stored) rather than one shared password for every
 * mentor - simpler to communicate ("log in with your email as both the
 * username and password") and mustResetPassword still forces them to pick
 * a real password on first login.
 */
async function createMentorByAdmin({ name, email, timezone, expertise, maxClassesPerDay }) {
  const normalizedEmail = email.toLowerCase();
  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    throw ApiError.conflict('An account with this email already exists');
  }

  const tempPassword = normalizedEmail;
  const passwordHash = await bcrypt.hash(tempPassword, SALT_ROUNDS);

  const user = await User.create({
    name,
    email: normalizedEmail,
    passwordHash,
    role: 'mentor',
    timezone: timezone || 'Asia/Kolkata',
    mustResetPassword: true,
  });

  const mentorProfile = await MentorProfile.create({
    userId: user._id,
    maxClassesPerDay: maxClassesPerDay ?? null,
    active: true,
    expertise: expertise || [],
  });

  return { user, mentorProfile, tempPassword };
}

/**
 * Lets any logged-in user (admin included) change their own password, so
 * seeded/default credentials — like the default admin login — are never
 * permanent. Requires the current password to be re-entered as a safety
 * check, same as any account-settings password change.
 */
async function changePassword({ userId, currentPassword, newPassword }) {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('Account not found');

  if (!user.passwordHash) {
    throw ApiError.badRequest('This account uses Google Sign-In and has no password to change.');
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    throw ApiError.badRequest('Current password is incorrect');
  }

  user.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  user.mustResetPassword = false;
  await user.save();

  return await toPublicUser(user);
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Separate login path for the Admin app, which has no public signup and
 * no parent/mentor role toggle (spec section 4 + D: "Its own login (admin
 * credentials are pre-seeded - not part of the public signup/login system
 * at all)"). Kept as its own function rather than overloading
 * loginWithPassword so the two flows can never be confused - this one
 * only ever succeeds for role === 'admin'.
 */
async function loginAdmin({ email, password }) {
  const user = await User.findOne({ email: email.toLowerCase(), role: 'admin' });
  if (!user) {
    throw ApiError.badRequest('No admin account found with this email');
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw ApiError.badRequest('Incorrect password');
  }
  if (!user.active) {
    throw ApiError.forbidden('This admin account has been deactivated');
  }
  const token = signToken(user);
  return { token, user: await toPublicUser(user) };
}

module.exports = {
  signToken,
  toPublicUser,
  startParentSignup,
  verifyParentSignupOtp,
  resendParentSignupOtp,
  loginWithPassword,
  loginOrSignupWithGoogle,
  setParentCountry,
  createMentorByAdmin,
  loginAdmin,
  changePassword,
};