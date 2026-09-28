/**
 * Force-resets a mentor's password back to the default (their own email
 * address), and sets mustResetPassword back to true so they're walked
 * through the "set a new password" screen on next login.
 *
 * Unlike seed.js (which only creates a mentor if one doesn't already
 * exist), this always overwrites the password on an existing mentor
 * account - useful when an account's password has drifted from the
 * email-as-temp-password default (e.g. it was set during earlier testing,
 * before that convention existed, or was changed and needs to be handed
 * back out again).
 *
 * Usage:
 *   node src/scripts/resetMentorPassword.js mentor1@codeyoung.dev
 *   node src/scripts/resetMentorPassword.js mentor1@codeyoung.dev mentor2@codeyoung.dev
 *   node src/scripts/resetMentorPassword.js --all   (resets every mentor account)
 *
 * Only ever touches accounts with role: 'mentor' - never parent or admin
 * accounts, even if you pass their email by mistake.
 */
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const { User } = require('../models');

const SALT_ROUNDS = 10;

async function resetOneMentor(email) {
  const normalizedEmail = email.toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail, role: 'mentor' });

  if (!user) {
    console.log(`[reset-mentor-password] skipped ${normalizedEmail}: no mentor account with this email`);
    return false;
  }

  user.passwordHash = await bcrypt.hash(normalizedEmail, SALT_ROUNDS);
  user.mustResetPassword = true;
  await user.save();

  console.log(`[reset-mentor-password] reset ${normalizedEmail} - temp password is now their email, mustResetPassword: true`);
  return true;
}

async function resetAllMentors() {
  const mentors = await User.find({ role: 'mentor' });
  if (mentors.length === 0) {
    console.log('[reset-mentor-password] no mentor accounts found');
    return;
  }
  for (const mentor of mentors) {
    await resetOneMentor(mentor.email);
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: node src/scripts/resetMentorPassword.js <email> [<email> ...] | --all');
    process.exit(1);
  }

  await connectDB();

  if (args[0] === '--all') {
    await resetAllMentors();
  } else {
    for (const email of args) {
      await resetOneMentor(email);
    }
  }

  await mongoose.connection.close();
  process.exit(0);
}

main().catch((err) => {
  console.error('[reset-mentor-password] failed:', err);
  process.exit(1);
});
