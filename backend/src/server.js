const app = require('./app');
const env = require('./config/env');
const connectDB = require('./config/db');
const { startReminderJob } = require('./jobs/reminderJob');
const { runSeed } = require('./scripts/seed');

async function start() {
  await connectDB();

  // Auto-seed on startup only in development, and only when explicitly
  // enabled - never in production, and the seed itself is idempotent
  // (upsert-by-email) so it never wipes or duplicates data even if this
  // runs on every restart. See spec section 6.
  if (env.NODE_ENV !== 'production' && env.AUTO_SEED_ON_STARTUP) {
    console.log('[startup] AUTO_SEED_ON_STARTUP enabled, running seed...');
    await runSeed();
  }

  startReminderJob();

  app.listen(env.PORT, () => {
    console.log(`[server] CodeYoung backend listening on port ${env.PORT} (${env.NODE_ENV})`);
  });
}

start().catch((err) => {
  console.error('[startup] fatal error:', err);
  process.exit(1);
});
