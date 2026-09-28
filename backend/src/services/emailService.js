const nodemailer = require('nodemailer');
const env = require('../config/env');
const { formatLocal } = require('../utils/timezone');

let transporter = null;

/**
 * Sends via Resend's HTTPS API (https://api.resend.com/emails) rather than
 * SMTP. Preferred whenever RESEND_API_KEY is set: it travels over port 443
 * like any normal web request, so it isn't affected by networks, ISPs, or
 * firewalls that block outbound SMTP ports (25/465/587) - a very common
 * cause of email sends hanging or silently failing when using nodemailer's
 * SMTP transport against smtp.resend.com.
 */
async function sendViaResendApi({ to, subject, text, html }) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to,
      subject,
      text,
      ...(html ? { html } : {}),
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Resend API error (${response.status}): ${body || response.statusText}`);
  }

  return response.json();
}

/**
 * Sends via SendGrid's HTTPS API (https://api.sendgrid.com/v3/mail/send).
 * Same rationale as Resend above - plain HTTPS, not affected by blocked
 * outbound SMTP ports. Checked after RESEND_API_KEY; set SENDGRID_API_KEY
 * instead if you've verified a Single Sender with SendGrid rather than a
 * Resend domain - Single Sender Verification lets you send to any
 * recipient without owning a domain, which Resend's sandbox mode does not.
 */
async function sendViaSendGridApi({ to, subject, text, html }) {
  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.SENDGRID_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: env.EMAIL_FROM },
      subject,
      content: [
        { type: 'text/plain', value: text },
        ...(html ? [{ type: 'text/html', value: html }] : []),
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`SendGrid API error (${response.status}): ${body || response.statusText}`);
  }

  // SendGrid returns 202 Accepted with an empty body on success - unlike
  // Resend there's no JSON payload to parse.
  return { accepted: true };
}

function getTransporter() {
  if (transporter) return transporter;

  const hasRealConfig = env.SMTP_SERVICE || env.SMTP_HOST;

  if (!hasRealConfig) {
    // Dev fallback: log emails to the console instead of failing outright,
    // so the rest of the booking flow can still be exercised without SMTP
    // credentials configured.
    transporter = {
      sendMail: async (options) => {
        console.log('[email:dev-mode] SMTP not configured, logging email instead:\n', {
          to: options.to,
          subject: options.subject,
          text: options.text,
        });
        return { messageId: 'dev-mode-noop' };
      },
    };
    return transporter;
  }

  if (env.SMTP_SERVICE) {
    // Easiest path (e.g. SMTP_SERVICE=gmail): nodemailer's built-in
    // "service" shorthand knows the right host/port for well-known
    // providers, so we only need the account + app password.
    //
    // Same fail-fast reasoning as the host/port branch below: without an
    // explicit timeout, a blocked/slow outbound connection (common on
    // hosts like Render) falls back to nodemailer's ~2 minute default,
    // which leaves the frontend's request hanging instead of erroring
    // back quickly.
    transporter = nodemailer.createTransport({
      service: env.SMTP_SERVICE,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 10_000,
    });
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    // Fail fast instead of hanging for nodemailer's ~2 minute defaults -
    // if the network silently drops outbound SMTP (common on locked-down
    // networks/ISPs), we want a clear error in seconds, not a request that
    // hangs on the frontend until the browser eventually gives up.
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 10_000,
  });
  return transporter;
}

async function sendMail({ to, subject, text, html }) {
  // Prefer Resend's HTTP API when configured - see sendViaResendApi above
  // for why this is the more reliable path, especially for Resend users.
  if (env.RESEND_API_KEY) {
    return sendViaResendApi({ to, subject, text, html });
  }

  // SendGrid's HTTP API is the next preference - same reliability benefit
  // as Resend, and a good option if you've done Single Sender Verification
  // there instead of a Resend domain.
  if (env.SENDGRID_API_KEY) {
    return sendViaSendGridApi({ to, subject, text, html });
  }

  const mailer = getTransporter();
  return mailer.sendMail({ from: env.EMAIL_FROM, to, subject, text, html });
}

/**
 * Sends the booking-confirmed email to a single recipient, formatting the
 * class time in THAT recipient's own local timezone (parent gets their
 * local time, mentor gets theirs) - this is why the function takes the
 * recipient's timezone explicitly rather than reading a single shared
 * value.
 */
async function sendBookingConfirmation({
  to,
  recipientName,
  counterpartName,
  startTimeUTC,
  requestedTimeUTC,
  recipientTimezone,
  meetLink,
  isForMentor,
  bookingType = 'trial',
  studentDetails,
}) {
  const localTime = formatLocal(startTimeUTC, recipientTimezone);
  const isFullCoaching = bookingType === 'full_coaching';

  const subject = isFullCoaching
    ? 'Your CodeYoung coaching session is confirmed'
    : 'Your CodeYoung trial class is confirmed';

  const classNoun = isFullCoaching ? 'coaching session' : 'free trial class';
  const roleLine = isForMentor
    ? `You've been matched with a new ${classNoun} with ${counterpartName}.`
    : `You're booked in for a ${classNoun} with your mentor, ${counterpartName}.`;

  const lines = [
    `Hi ${recipientName},`,
    '',
    roleLine,
    `Date & time: ${localTime}`,
  ];

  // requestedTimeUTC is only set when the parent's originally-chosen time
  // had no mentor free and the system auto-adjusted to the nearest
  // bookable slot - call that out explicitly so nobody is surprised by a
  // time they didn't pick.
  if (requestedTimeUTC) {
    const requestedLocal = formatLocal(requestedTimeUTC, recipientTimezone);
    lines.push(
      '',
      `Note: your originally requested time (${requestedLocal}) wasn't available, ` +
        `so we automatically moved this to the nearest open time above.`
    );
  }

  // Full Coaching bookings carry intake details so the mentor arrives
  // prepared; the parent gets them back too as a receipt of what they
  // submitted.
  if (isFullCoaching && studentDetails) {
    lines.push(
      '',
      'Student details:',
      `  Name: ${studentDetails.childName}`,
      `  Age/Grade: ${studentDetails.ageOrGrade}`,
      `  Subject of interest: ${studentDetails.subject}`,
      `  Learning goals: ${studentDetails.goals}`,
      `  Contact number: ${studentDetails.contactPhone}`
    );
  }

  lines.push('', `Join link: ${meetLink}`, '', "We'll send you a reminder 1 hour before class starts.", '', '— The CodeYoung Team');

  return sendMail({ to, subject, text: lines.join('\n') });
}

/**
 * Sends the "class starts in 1 hour" reminder, again formatted in the
 * recipient's own local time.
 */
async function sendClassReminder({ to, recipientName, counterpartName, startTimeUTC, recipientTimezone, meetLink }) {
  const localTime = formatLocal(startTimeUTC, recipientTimezone);
  const subject = 'Reminder: your CodeYoung trial class starts in 1 hour';
  const text = [
    `Hi ${recipientName},`,
    '',
    `Just a reminder that your trial class with ${counterpartName} starts soon.`,
    `Date & time: ${localTime}`,
    `Join link: ${meetLink}`,
    '',
    '— The CodeYoung Team',
  ].join('\n');

  return sendMail({ to, subject, text });
}

/**
 * Sends the 4-digit signup verification code to a would-be parent, before
 * their account exists. `expiryMinutes` is interpolated into the copy so
 * the email always matches whatever env.SIGNUP_OTP_EXPIRY_MINUTES is set
 * to, rather than a hardcoded number going stale.
 */
async function sendSignupOtp({ to, name, code, expiryMinutes }) {
  const subject = `Your CodeYoung verification code is ${code}`;
  const text = [
    `Hi ${name},`,
    '',
    `Your CodeYoung verification code is: ${code}`,
    `This code expires in ${expiryMinutes} minutes.`,
    '',
    "If you didn't request this, you can safely ignore this email.",
    '',
    '— The CodeYoung Team',
  ].join('\n');

  return sendMail({ to, subject, text });
}

/**
 * Sent by the admin-create-mentor flow so new mentors can log in.
 */
async function sendMentorInvite({ to, mentorName, tempPassword, mentorLoginUrl }) {
  const subject = 'You have been added as a CodeYoung mentor';
  const text = [
    `Hi ${mentorName},`,
    '',
    "You've been added as a mentor on CodeYoung.",
    `Log in here: ${mentorLoginUrl}`,
    `Your default password is your email address: ${tempPassword}`,
    "You'll be asked to set a new password on first login.",
    '',
    '— The CodeYoung Team',
  ].join('\n');

  return sendMail({ to, subject, text });
}

module.exports = {
  sendMail,
  sendBookingConfirmation,
  sendClassReminder,
  sendMentorInvite,
  sendSignupOtp,
};
