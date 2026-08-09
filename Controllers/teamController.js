const TeamMember = require('../Models/TeamMember');
const { asyncHandler, omitProtectedFields } = require('../Middleware/security');

exports.getTeamMembers = asyncHandler(async (req, res) => {
  const members = await TeamMember.find({ owner: req.user.id }).sort({ createdAt: -1 });
  res.status(200).json({ success: true, data: members });
});

exports.createTeamMember = asyncHandler(async (req, res) => {
  if (!req.body.name || !req.body.email || !req.body.role) {
    return res.status(400).json({ success: false, message: 'Please provide a name, email and role' });
  }
  const payload = omitProtectedFields(req.body);
  const member = await TeamMember.create({
    ...payload,
    owner: req.user.id
  });
  res.status(201).json({ success: true, data: member });
});

exports.updateTeamMember = asyncHandler(async (req, res) => {
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
});

exports.recordPayment = asyncHandler(async (req, res) => {
  const member = await TeamMember.findOne({ _id: req.params.id, owner: req.user.id });
  if (!member) {
    return res.status(404).json({ success: false, message: 'Team member not found' });
  }

  const amount = Number(req.body.amount);
  if (!amount || Number.isNaN(amount) || amount <= 0) {
    return res.status(400).json({ success: false, message: 'Please provide a valid payment amount greater than 0' });
  }

  member.payments.push({
    amount,
    date: req.body.date || Date.now(),
    notes: req.body.notes
  });

  await member.save();
  res.status(200).json({ success: true, data: member });
});

exports.deleteTeamMember = asyncHandler(async (req, res) => {
  const member = await TeamMember.findOneAndDelete({ _id: req.params.id, owner: req.user.id });
  if (!member) {
    return res.status(404).json({ success: false, message: 'Team member not found' });
  }
  res.status(200).json({ success: true, data: {} });
});