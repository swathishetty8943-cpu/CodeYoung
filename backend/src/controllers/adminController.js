const asyncHandler = require('../utils/asyncHandler');
const mentorAdminService = require('../services/mentorAdminService');
const adminConfigService = require('../services/adminConfigService');

// --- Mentor management ---

const listMentors = asyncHandler(async (req, res) => {
  const mentors = await mentorAdminService.listMentors();
  res.json({ success: true, mentors });
});

const createMentor = asyncHandler(async (req, res) => {
  const mentor = await mentorAdminService.createMentor(req.body);
  res.status(201).json({ success: true, mentor });
});

const updateMentor = asyncHandler(async (req, res) => {
  const mentor = await mentorAdminService.updateMentor(req.params.id, req.body);
  res.json({ success: true, mentor });
});

const getMentorSchedule = asyncHandler(async (req, res) => {
  const schedule = await mentorAdminService.getMentorSchedule(req.params.id);
  res.json({ success: true, schedule });
});

// --- Config ---

const getConfig = asyncHandler(async (req, res) => {
  const config = await adminConfigService.getConfig();
  res.json({ success: true, config });
});

const updateConfig = asyncHandler(async (req, res) => {
  const config = await adminConfigService.updateConfig(req.body);
  res.json({ success: true, config });
});

// --- Platform visibility ---

const listAllBookings = asyncHandler(async (req, res) => {
  const bookings = await adminConfigService.listAllBookings({
    limit: req.query.limit ? parseInt(req.query.limit, 10) : undefined,
  });
  res.json({ success: true, bookings });
});

const getStats = asyncHandler(async (req, res) => {
  const stats = await adminConfigService.getStats();
  res.json({ success: true, stats });
});

module.exports = {
  listMentors,
  createMentor,
  updateMentor,
  getMentorSchedule,
  getConfig,
  updateConfig,
  listAllBookings,
  getStats,
};
