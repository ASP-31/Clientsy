const Client = require('../Models/Client');
const Document = require('../Models/Document');
const Project = require('../Models/Project');
const Invoice = require('../Models/Invoice');
const Proposal = require('../Models/Proposal');
const IntakeForm = require('../Models/IntakeForm');
const Meeting = require('../Models/Meeting');
const Review = require('../Models/Review');
const { handleControllerError, omitProtectedFields } = require('../Middleware/security');

// @desc    Get all clients
// @route   GET /api/clients
// @access  Private
exports.getClients = async (req, res) => {
  try {
    const clients = await Client.find({ owner: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: clients });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Get single client
// @route   GET /api/clients/:id
// @access  Private
exports.getClientById = async (req, res) => {
  try {
    const client = await Client.findOne({ _id: req.params.id, owner: req.user.id });
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }
    res.status(200).json({ success: true, data: client });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Create new client
// @route   POST /api/clients
// @access  Private
exports.createClient = async (req, res) => {
  try {
    const payload = omitProtectedFields(req.body);
    const client = await Client.create({
      ...payload,
      owner: req.user.id
    });
    res.status(201).json({ success: true, data: client });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Update client
// @route   PUT /api/clients/:id
// @access  Private
exports.updateClient = async (req, res) => {
  try {
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
  } catch (error) {
    handleControllerError(res, error);
  }
};

// @desc    Delete client
// @route   DELETE /api/clients/:id
// @access  Private
exports.deleteClient = async (req, res) => {
  try {
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
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
