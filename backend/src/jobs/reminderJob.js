const cron = require('node-cron');
const { Booking, AdminConfig } = require('../models');
const emailService = require('../services/emailService');

/**
 * Runs every minute and sends the "class starts in 1 hour" reminder for
 * any confirmed booking whose reminder window has just been reached.
 *
 * Idempotency: we only ever select bookings where `reminderSentAt` is
 * still null, and we set it (via an atomic findOneAndUpdate) BEFORE
 * sending the email in the same iteration, so if the server restarts
 * mid-run, a booking is never double-reminded - at worst a single
 * in-flight email could be lost on a hard crash between the DB update and
 * the send, which is an acceptable tradeoff over the alternative of
 * double-sending.
 */
async function runReminderSweep() {
  const config = await AdminConfig.getSingleton();
  const leadMs = config.reminderLeadTimeMinutes * 60 * 1000;
  const now = Date.now();

  // Bookings whose start time falls within [now, now + leadTime] and that
  // haven't been reminded yet. We look slightly into the past too (a small
  // grace window) in case a previous tick was delayed, so nothing slips
  // through the cracks.
  const windowStart = new Date(now + leadMs - 60 * 1000); // 1 min grace
  const windowEnd = new Date(now + leadMs + 60 * 1000);

  const dueBookings = await Booking.find({
    status: 'confirmed',
    reminderSentAt: null,
    startTimeUTC: { $gte: windowStart, $lte: windowEnd },
  })
    .populate('parentId', 'name email timezone')
    .populate('mentorId', 'name email timezone');

  for (const booking of dueBookings) {
    // Atomically claim this booking's reminder slot so a concurrent tick
    // (or a restart racing this same tick) can't send it twice.
    const claimed = await Booking.findOneAndUpdate(
      { _id: booking._id, reminderSentAt: null },
      { reminderSentAt: new Date() },
      { new: true }
    );
    if (!claimed) continue; // someone else already claimed it

    try {
      await Promise.all([
        emailService.sendClassReminder({
          to: booking.contactEmail,
          recipientName: booking.parentId.name,
          counterpartName: booking.mentorId.name,
          startTimeUTC: booking.startTimeUTC,
          recipientTimezone: booking.parentId.timezone,
          meetLink: booking.meetLink,
        }),
        emailService.sendClassReminder({
          to: booking.mentorId.email,
          recipientName: booking.mentorId.name,
          counterpartName: booking.parentId.name,
          startTimeUTC: booking.startTimeUTC,
          recipientTimezone: booking.mentorId.timezone,
          meetLink: booking.meetLink,
        }),
      ]);
    } catch (err) {
      console.error(`[reminderJob] failed to send reminder for booking ${booking._id}:`, err);
      // We intentionally leave reminderSentAt set even on email failure to
      // avoid retry storms; a production system might instead reset it and
      // let a retry policy handle transient SMTP failures.
    }
  }
}

function startReminderJob() {
  // Every minute.
  cron.schedule('* * * * *', () => {
    runReminderSweep().catch((err) => console.error('[reminderJob] sweep error:', err));
  });
  console.log('[reminderJob] scheduled (every minute)');
}

module.exports = { startReminderJob, runReminderSweep };
