const Client = require('../Models/Client');
const Document = require('../Models/Document');
const Project = require('../Models/Project');
const Invoice = require('../Models/Invoice');
const Proposal = require('../Models/Proposal');
const IntakeForm = require('../Models/IntakeForm');
const Meeting = require('../Models/Meeting');
const Review = require('../Models/Review');
const { asyncHandler, omitProtectedFields } = require('../Middleware/security');

// @desc    Get all clients
// @route   GET /api/clients?search=&page=&limit=
// @access  Private
exports.getClients = asyncHandler(async (req, res) => {
  const { search, page = 1, limit = 50 } = req.query;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(1000, Math.max(1, parseInt(limit, 10) || 50));

  const filter = { owner: req.user.id };
  if (search && typeof search === 'string' && search.trim()) {
    const term = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { name: { $regex: term, $options: 'i' } },
      { company: { $regex: term, $options: 'i' } },
      { email: { $regex: term, $options: 'i' } },
      { phone: { $regex: term, $options: 'i' } },
      { tags: { $regex: term, $options: 'i' } }
    ];
  }

  const [clients, total] = await Promise.all([
    Client.find(filter).lean().sort({ createdAt: -1 }).skip((pageNum - 1) * limitNum).limit(limitNum),
    Client.countDocuments(filter)
  ]);

  res.status(200).json({
    success: true,
    data: clients,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum)
    }
  });
});

// @desc    Get single client
// @route   GET /api/clients/:id
// @access  Private
exports.getClientById = asyncHandler(async (req, res) => {
  const client = await Client.findOne({ _id: req.params.id, owner: req.user.id });
  if (!client) {
    return res.status(404).json({ success: false, message: 'Client not found' });
  }
  res.status(200).json({ success: true, data: client });
});

// @desc    Create new client
// @route   POST /api/clients
// @access  Private
exports.createClient = asyncHandler(async (req, res) => {
  const payload = omitProtectedFields(req.body);
  const client = await Client.create({
    ...payload,
    owner: req.user.id
  });
  res.status(201).json({ success: true, data: client });
});

// @desc    Update client
// @route   PUT /api/clients/:id
// @access  Private
exports.updateClient = asyncHandler(async (req, res) => {
  const payload = omitProtectedFields(req.body);
  payload.updatedAt = Date.now();
  const client = await Client.findOneAndUpdate(
    { _id: req.params.id, owner: req.user.id },
    payload,
    {
      new: true,
      runValidators: true
    }
  );
  if (!client) {
    return res.status(404).json({ success: false, message: 'Client not found' });
  }
  res.status(200).json({ success: true, data: client });
});

// @desc    Delete client
// @route   DELETE /api/clients/:id
// @access  Private
exports.deleteClient = asyncHandler(async (req, res) => {
  const client = await Client.findOne({ _id: req.params.id, owner: req.user.id });
  if (!client) {
    return res.status(404).json({ success: false, message: 'Client not found' });
  }

  // Cascade delete associated entities
  const documents = await Document.find({ client: req.params.id, uploadedBy: req.user.id });
  const { cloudinary } = require('../config/cloudinary');
  for (const doc of documents) {
    if (doc.publicId) {
      try {
        await cloudinary.uploader.destroy(doc.publicId);
      } catch (err) {
        console.error(`Failed to destroy Cloudinary asset ${doc.publicId} during client cascade delete:`, err);
      }
    }
  }
  await Document.deleteMany({ client: req.params.id, uploadedBy: req.user.id });
  await Project.deleteMany({ client: req.params.id, owner: req.user.id });
  await Invoice.deleteMany({ client: req.params.id, owner: req.user.id });
  await Proposal.deleteMany({ client: req.params.id, owner: req.user.id });
  await IntakeForm.deleteMany({ client: req.params.id, owner: req.user.id });
  await Meeting.deleteMany({ client: req.params.id, owner: req.user.id });
  await Review.deleteMany({ client: req.params.id, owner: req.user.id });

  await Client.findByIdAndDelete(req.params.id);

  res.status(200).json({ success: true, data: {} });
});