const Meeting = require('../Models/Meeting');
const { assertOwnedClient, asyncHandler, omitProtectedFields } = require('../Middleware/security');

// @desc    Get all meetings
// @route   GET /api/meetings
// @access  Private
exports.getMeetings = asyncHandler(async (req, res) => {
  const meetings = await Meeting.find({ owner: req.user.id }).populate('client', 'name email company');
  res.status(200).json({ success: true, data: meetings });
});

// @desc    Create a meeting
// @route   POST /api/meetings
// @access  Private
exports.createMeeting = asyncHandler(async (req, res) => {
  if (!req.body.client || !req.body.startAt || !req.body.endAt) {
    return res.status(400).json({ success: false, message: 'Please provide a client, start and end time' });
  }

  if (new Date(req.body.endAt) <= new Date(req.body.startAt)) {
    return res.status(400).json({ success: false, message: 'End time must be after start time' });
  }

  await assertOwnedClient(req.body.client, req.user.id);

  // Generate simple mock video call link
  const letters = 'abcdefghijklmnopqrstuvwxyz';
  const randPart = (len) => Array.from({length: len}, () => letters[Math.floor(Math.random() * 26)]).join('');
  const meetLink = `https://meet.google.com/${randPart(3)}-${randPart(4)}-${randPart(3)}`;

  const payload = omitProtectedFields(req.body);
  const meeting = await Meeting.create({
    ...payload,
    meetLink,
    owner: req.user.id
  });
  res.status(201).json({ success: true, data: meeting });
});

// @desc    Delete meeting
// @route   DELETE /api/meetings/:id
// @access  Private
exports.deleteMeeting = asyncHandler(async (req, res) => {
  const meeting = await Meeting.findOne({ _id: req.params.id, owner: req.user.id });
  if (!meeting) {
    return res.status(404).json({ success: false, message: 'Meeting not found' });
  }

  await Meeting.findByIdAndDelete(req.params.id);
  res.status(200).json({ success: true, data: {} });
});