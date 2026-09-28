const { User, MentorProfile, Booking } = require('../models');
const ApiError = require('../utils/ApiError');
const authService = require('./authService');
const emailService = require('./emailService');
const env = require('../config/env');

async function listMentors() {
  const profiles = await MentorProfile.find().populate('userId');
  return profiles
    .filter((p) => p.userId) // guard against orphaned profiles
    .map(serializeMentor);
}

function serializeMentor(profile) {
  return {
    id: profile.userId._id,
    name: profile.userId.name,
    email: profile.userId.email,
    timezone: profile.userId.timezone,
    accountActive: profile.userId.active,
    profileActive: profile.active,
    maxClassesPerDay: profile.maxClassesPerDay,
    expertise: profile.expertise,
    createdAt: profile.createdAt,
  };
}

/**
 * Admin creates a new mentor. Sends the mentor an invite email with a temp
 * password, per spec section 4.
 */
async function createMentor({ name, email, timezone, expertise, maxClassesPerDay }) {
  const { user, mentorProfile, tempPassword } = await authService.createMentorByAdmin({
    name,
    email,
    timezone,
    expertise,
    maxClassesPerDay,
  });

  await emailService.sendMentorInvite({
    to: user.email,
    mentorName: user.name,
    tempPassword,
    mentorLoginUrl: `${env.FRONTEND_URL}/login`,
  });

  return serializeMentor({ userId: user, ...mentorProfile.toObject() });
}

/**
 * Edits a mentor's profile/account fields. Deactivating a mentor here only
 * flips `active` to false on the profile+account going forward - it never
 * touches existing confirmed bookings, per spec edge case:
 * "Admin deactivating a mentor mid-day shouldn't cancel their already-
 * confirmed classes, just stop new assignments." The matching service
 * already filters on `active`, so this is sufficient to stop new
 * assignments without any extra booking-cancellation logic here.
 */
async function updateMentor(mentorUserId, updates) {
  const user = await User.findById(mentorUserId);
  if (!user || user.role !== 'mentor') throw ApiError.notFound('Mentor not found');

  const profile = await MentorProfile.findOne({ userId: mentorUserId });
  if (!profile) throw ApiError.notFound('Mentor profile not found');

  if (updates.name !== undefined) user.name = updates.name;
  if (updates.timezone !== undefined) user.timezone = updates.timezone;
  if (updates.accountActive !== undefined) user.active = updates.accountActive;

  if (updates.expertise !== undefined) profile.expertise = updates.expertise;
  if (updates.maxClassesPerDay !== undefined) profile.maxClassesPerDay = updates.maxClassesPerDay;
  if (updates.profileActive !== undefined) profile.active = updates.profileActive;

  await user.save();
  await profile.save();

  return serializeMentor({ userId: user, ...profile.toObject() });
}

async function getMentorSchedule(mentorUserId) {
  const bookings = await Booking.find({ mentorId: mentorUserId, status: 'confirmed' })
    .sort({ startTimeUTC: 1 })
    .populate('parentId', 'name email');
  return bookings;
}

module.exports = { listMentors, createMentor, updateMentor, getMentorSchedule };
