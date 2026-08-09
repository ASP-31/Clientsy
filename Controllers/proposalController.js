const Proposal = require('../Models/Proposal');
const { assertOwnedClient, asyncHandler, omitProtectedFields } = require('../Middleware/security');

exports.getProposals = asyncHandler(async (req, res) => {
  const proposals = await Proposal.find({ owner: req.user.id }).populate('client', 'name email company');
  res.status(200).json({ success: true, data: proposals });
});

exports.getProposalById = asyncHandler(async (req, res) => {
  const proposal = await Proposal.findOne({ _id: req.params.id, owner: req.user.id }).populate('client', 'name email company');
  if (!proposal) {
    return res.status(404).json({ success: false, message: 'Proposal not found' });
  }
  res.status(200).json({ success: true, data: proposal });
});

exports.createProposal = asyncHandler(async (req, res) => {
  if (!req.body.client || !req.body.title || !req.body.content) {
    return res.status(400).json({ success: false, message: 'Please provide a client, title and scope content' });
  }
  await assertOwnedClient(req.body.client, req.user.id);
  const payload = omitProtectedFields(req.body);
  const proposal = await Proposal.create({ ...payload, owner: req.user.id });
  res.status(201).json({ success: true, data: proposal });
});

exports.updateProposal = asyncHandler(async (req, res) => {
  if (req.body.client) {
    await assertOwnedClient(req.body.client, req.user.id);
  }
  const payload = omitProtectedFields(req.body);
  const proposal = await Proposal.findOneAndUpdate(
    { _id: req.params.id, owner: req.user.id },
    { ...payload, updatedAt: Date.now() },
    { new: true, runValidators: true }
  );
  if (!proposal) {
    return res.status(404).json({ success: false, message: 'Proposal not found' });
  }
  res.status(200).json({ success: true, data: proposal });
});

exports.deleteProposal = asyncHandler(async (req, res) => {
  const proposal = await Proposal.findOneAndDelete({ _id: req.params.id, owner: req.user.id });
  if (!proposal) {
    return res.status(404).json({ success: false, message: 'Proposal not found' });
  }
  res.status(200).json({ success: true, data: {} });
});