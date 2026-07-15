const Proposal = require('../Models/Proposal');
const { assertOwnedClient, handleControllerError, omitProtectedFields } = require('../Middleware/security');

exports.getProposals = async (req, res) => {
  try {
    const proposals = await Proposal.find({ owner: req.user.id }).populate('client', 'name email company');
    res.status(200).json({ success: true, data: proposals });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.getProposalById = async (req, res) => {
  try {
    const proposal = await Proposal.findOne({ _id: req.params.id, owner: req.user.id }).populate('client', 'name email company');
    if (!proposal) {
      return res.status(404).json({ success: false, message: 'Proposal not found' });
    }
    res.status(200).json({ success: true, data: proposal });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.createProposal = async (req, res) => {
  try {
    await assertOwnedClient(req.body.client, req.user.id);
    const payload = omitProtectedFields(req.body);
    const proposal = await Proposal.create({ ...payload, owner: req.user.id });
    res.status(201).json({ success: true, data: proposal });
  } catch (error) {
    handleControllerError(res, error);
  }
};

exports.updateProposal = async (req, res) => {
  try {
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
  } catch (error) {
    handleControllerError(res, error);
  }
};

exports.deleteProposal = async (req, res) => {
  try {
    const proposal = await Proposal.findOneAndDelete({ _id: req.params.id, owner: req.user.id });
    if (!proposal) {
      return res.status(404).json({ success: false, message: 'Proposal not found' });
    }
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
