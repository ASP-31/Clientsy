const Client = require('../Models/Client');
const Project = require('../Models/Project');
const Invoice = require('../Models/Invoice');
const Proposal = require('../Models/Proposal');
const IntakeForm = require('../Models/IntakeForm');
const Review = require('../Models/Review');
const { asyncHandler } = require('../Middleware/security');

// Helper to get client matching logged-in user
const getClientForRecord = async (userEmail) => {
  const clients = await Client.find({ email: String(userEmail || '').toLowerCase() });
  if (clients.length !== 1) {
    return null;
  }
  return clients[0];
};

exports.getPortalData = asyncHandler(async (req, res) => {
  const clientRecord = await getClientForRecord(req.user.email);
  if (!clientRecord) {
    return res.status(404).json({ success: false, message: 'No client profile matches your registered email.' });
  }

  const clientId = clientRecord._id;
  const ownerId = clientRecord.owner;

  // Fetch active projects
  const projects = await Project.find({ client: clientId, owner: ownerId });

  // Fetch invoices/quotes (exclude drafts)
  const invoices = await Invoice.find({ client: clientId, owner: ownerId, status: { $ne: 'draft' } });

  // Fetch proposals (exclude drafts)
  const proposals = await Proposal.find({ client: clientId, owner: ownerId, status: { $ne: 'draft' } });

  // Fetch intake forms
  const intakeForms = await IntakeForm.find({ client: clientId, owner: ownerId });

  // Fetch reviews
  const reviews = await Review.find({ client: clientId, owner: ownerId }).populate('project', 'name');

  res.status(200).json({
    success: true,
    data: {
      client: clientRecord,
      projects,
      invoices,
      proposals,
      intakeForms,
      reviews
    }
  });
});

exports.signProposal = asyncHandler(async (req, res) => {
  const clientRecord = await getClientForRecord(req.user.email);
  if (!clientRecord) {
    return res.status(404).json({ success: false, message: 'Client profile not found.' });
  }

  const { signatureData, signedBy } = req.body;
  if (!signatureData) {
    return res.status(400).json({ success: false, message: 'Signature is required' });
  }

  const proposal = await Proposal.findOne({ _id: req.params.id, client: clientRecord._id, owner: clientRecord.owner });

  if (!proposal) {
    return res.status(404).json({ success: false, message: 'Proposal not found' });
  }

  if (proposal.status === 'signed') {
    return res.status(400).json({ success: false, message: 'Proposal is already signed' });
  }

  proposal.status = 'signed';
  proposal.signature = {
    signedBy: signedBy || clientRecord.name,
    signedAt: Date.now(),
    ipAddress: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
    signatureData
  };

  await proposal.save();
  res.status(200).json({ success: true, data: proposal });
});

exports.payInvoice = asyncHandler(async (req, res) => {
  const clientRecord = await getClientForRecord(req.user.email);
  if (!clientRecord) {
    return res.status(404).json({ success: false, message: 'Client profile not found.' });
  }

  const invoice = await Invoice.findOne({ _id: req.params.id, client: clientRecord._id, owner: clientRecord.owner });
  if (!invoice) {
    return res.status(404).json({ success: false, message: 'Invoice not found' });
  }

  if (invoice.status === 'paid') {
    return res.status(400).json({ success: false, message: 'Invoice is already paid' });
  }

  // Set invoice as paid
  invoice.status = 'paid';
  invoice.updatedAt = Date.now();
  await invoice.save();

  res.status(200).json({ success: true, data: invoice });
});