// Central place that loads and validates environment variables.
// Every other module should read config from here instead of calling
// process.env directly, so there is exactly one source of truth.
require('dotenv').config();

function required(name, fallback = undefined) {
  const value = process.env[name] ?? fallback;
  return value;
}

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),

  MONGO_URI: required('MONGO_URI', 'mongodb://localhost:27017/codeyoung'),

  JWT_SECRET: required('JWT_SECRET', 'dev-secret-change-me'),
  JWT_EXPIRY: process.env.JWT_EXPIRY || '7d',

  // Firebase project ID - verifies the Firebase ID token the frontend gets
  // back from `signInWithPopup(auth, new GoogleAuthProvider())`, checked
  // directly against Google's public keys (see config/googleAuth.js). Not
  // a secret - it's the same value as `projectId` in the frontend's
  // firebaseConfig, and defaults to what you're already using.
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || 'codeyoung-b618a',

  // Easiest path: set SMTP_SERVICE=gmail + SMTP_USER + SMTP_PASS (a Gmail
  // App Password) and nodemailer's "service" shorthand handles host/port.
  // Alternative path: leave SMTP_SERVICE unset and provide SMTP_HOST/PORT
  // for Outlook or any other provider. Leaving everything unset keeps the
  // app in dev/dummy mode (emails are logged, not sent).
  SMTP_SERVICE: process.env.SMTP_SERVICE || '',
  SMTP_HOST: process.env.SMTP_HOST || '',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  EMAIL_FROM: process.env.SMTP_FROM || process.env.EMAIL_FROM || process.env.SMTP_USER || 'noreply@codeyoung.example',

  // Preferred email-sending path: Resend's HTTPS API. When set, this is
  // used instead of the SMTP_* settings above (see emailService.js) -
  // it's not affected by networks that block outbound SMTP ports, which
  // is the most common cause of signup/booking emails hanging or failing.
  RESEND_API_KEY: process.env.RESEND_API_KEY || '',

  // Alternative HTTPS API path: SendGrid. Checked after RESEND_API_KEY -
  // set this instead of RESEND_API_KEY if you're using SendGrid's Single
  // Sender Verification (lets you send to any recipient without owning a
  // domain, unlike Resend's sandbox mode which only delivers to the
  // address you signed up with).
  SENDGRID_API_KEY: process.env.SENDGRID_API_KEY || '',

  REMINDER_LEAD_TIME_MINUTES: parseInt(process.env.REMINDER_LEAD_TIME_MINUTES || '60', 10),
  DEFAULT_MAX_CLASSES_PER_MENTOR_PER_DAY: parseInt(
    process.env.DEFAULT_MAX_CLASSES_PER_MENTOR_PER_DAY || '2',
    10
  ),
  SLOT_DURATION_MINUTES: parseInt(process.env.SLOT_DURATION_MINUTES || '30', 10),

  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  ADMIN_FRONTEND_URL: process.env.ADMIN_FRONTEND_URL || 'http://localhost:5174',

  // Parent signup email-verification (OTP) settings. See
  // services/authService.js's startParentSignup/verifyParentSignupOtp.
  SIGNUP_OTP_EXPIRY_MINUTES: parseInt(process.env.SIGNUP_OTP_EXPIRY_MINUTES || '10', 10),
  SIGNUP_OTP_RESEND_COOLDOWN_SECONDS: parseInt(
    process.env.SIGNUP_OTP_RESEND_COOLDOWN_SECONDS || '60',
    10
  ),
  SIGNUP_OTP_MAX_ATTEMPTS: parseInt(process.env.SIGNUP_OTP_MAX_ATTEMPTS || '5', 10),

  AUTO_SEED_ON_STARTUP: (process.env.AUTO_SEED_ON_STARTUP || 'false').toLowerCase() === 'true',
};

module.exports = env;
