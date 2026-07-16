const Meeting = require('../Models/Meeting');
const { assertOwnedClient, handleControllerError, omitProtectedFields } = require('../Middleware/security');

// @desc    Get all meetings
// @route   GET /api/meetings
// @access  Private
exports.getMeetings = async (req, res) => {
  try {
    const meetings = await Meeting.find({ owner: req.user.id }).populate('client', 'name email company');
    res.status(200).json({ success: true, data: meetings });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Create a meeting
// @route   POST /api/meetings
// @access  Private
exports.createMeeting = async (req, res) => {
  try {
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
  } catch (error) {
    handleControllerError(res, error);
  }
};

// @desc    Delete meeting
// @route   DELETE /api/meetings/:id
// @access  Private
exports.deleteMeeting = async (req, res) => {
  try {
    const meeting = await Meeting.findOne({ _id: req.params.id, owner: req.user.id });
    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    await Meeting.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
