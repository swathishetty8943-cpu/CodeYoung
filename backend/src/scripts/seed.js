/**
 * Idempotent seed script (spec section 6). Safe to run multiple times:
 * mentors are upserted by email so re-running never duplicates or wipes
 * data. Can be run directly (`npm run seed`) or imported and called once
 * from server.js on startup in development.
 */
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const { User, MentorProfile, AdminConfig } = require('../models');

const MENTOR_NAMES = [
  'Ananya Sharma',
  'Rohan Verma',
  'Priya Nair',
  'Karan Mehta',
  'Sneha Iyer',
  'Arjun Reddy',
  'Divya Menon',
  'Vikram Singh',
  'Neha Gupta',
  'Aditya Rao',
];

async function seedMentors() {
  let createdCount = 0;

  for (let i = 0; i < MENTOR_NAMES.length; i++) {
    const email = `mentor${i + 1}@codeyoung.dev`;
    const name = MENTOR_NAMES[i];

    let user = await User.findOne({ email });
    if (!user) {
      // Default password is the mentor's own email address, same as the
      // admin "create mentor" flow - mustResetPassword forces a real
      // password to be chosen on first login.
      const passwordHash = await bcrypt.hash(email, 10);
      user = await User.create({
        name,
        email,
        passwordHash,
        role: 'mentor',
        timezone: 'Asia/Kolkata',
        active: true,
        mustResetPassword: true,
      });
      createdCount++;
    }

    const existingProfile = await MentorProfile.findOne({ userId: user._id });
    if (!existingProfile) {
      await MentorProfile.create({
        userId: user._id,
        // null => falls back to AdminConfig.defaultMaxClassesPerDay (2)
        maxClassesPerDay: null,
        active: true,
        expertise: ['Scratch', 'Python', 'Web Development'],
      });
    }
  }

  console.log(
    `[seed] mentors: ${createdCount} created, ${MENTOR_NAMES.length - createdCount} already existed`
  );
}

async function seedAdmin() {
  const adminEmail = 'admin@coach.edu';
  const existing = await User.findOne({ email: adminEmail, role: 'admin' });
  if (existing) {
    console.log('[seed] admin: already exists, skipping');
    return;
  }
  // Default seeded admin credentials. Purely a starting point - the admin
  // app has a "change password" flow (Settings page / PATCH
  // /api/auth/change-password) so this should be rotated after first login.
  const passwordHash = await bcrypt.hash('@admin123', 10);
  await User.create({
    name: 'CodeYoung Admin',
    email: adminEmail,
    passwordHash,
    role: 'admin',
    timezone: 'Asia/Kolkata',
    active: true,
  });
  console.log('[seed] admin: created (admin@coach.edu / @admin123 - change this after first login)');
}

async function seedAdminConfig() {
  await AdminConfig.getSingleton(); // creates the singleton with defaults if missing
  console.log('[seed] admin config: ensured singleton exists');
}

async function runSeed() {
  await seedAdmin();
  await seedMentors();
  await seedAdminConfig();
}

// Allow `node src/scripts/seed.js` to run standalone with its own DB
// connection, while also being importable (runSeed) from server.js
// without opening a second connection.
if (require.main === module) {
  (async () => {
    await connectDB();
    await runSeed();
    console.log('[seed] done');
    await mongoose.connection.close();
    process.exit(0);
  })().catch((err) => {
    console.error('[seed] failed:', err);
    process.exit(1);
  });
}

module.exports = { runSeed };
