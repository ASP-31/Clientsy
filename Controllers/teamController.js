const TeamMember = require('../Models/TeamMember');
const { omitProtectedFields } = require('../Middleware/security');

exports.getTeamMembers = async (req, res) => {
  try {
    const members = await TeamMember.find({ owner: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: members });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.createTeamMember = async (req, res) => {
  try {
    const payload = omitProtectedFields(req.body);
    const member = await TeamMember.create({
      ...payload,
      owner: req.user.id
    });
    res.status(201).json({ success: true, data: member });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};

exports.updateTeamMember = async (req, res) => {
  try {
    const payload = omitProtectedFields(req.body, ['owner', 'payments']);
    const member = await TeamMember.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.id },
      payload,
      { new: true, runValidators: true }
    );
    if (!member) {
      return res.status(404).json({ success: false, message: 'Team member not found' });
    }
    res.status(200).json({ success: true, data: member });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.recordPayment = async (req, res) => {
  try {
    const member = await TeamMember.findOne({ _id: req.params.id, owner: req.user.id });
    if (!member) {
      return res.status(404).json({ success: false, message: 'Team member not found' });
    }

    member.payments.push({
      amount: req.body.amount,
      date: req.body.date || Date.now(),
      notes: req.body.notes
    });

    await member.save();
    res.status(200).json({ success: true, data: member });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.deleteTeamMember = async (req, res) => {
  try {
    const member = await TeamMember.findOneAndDelete({ _id: req.params.id, owner: req.user.id });
    if (!member) {
      return res.status(404).json({ success: false, message: 'Team member not found' });
    }
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
