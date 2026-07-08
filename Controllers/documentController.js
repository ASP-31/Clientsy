const Document = require('../Models/Document');

// @desc    Get all documents
// @route   GET /api/documents
// @access  Public
exports.getDocuments = async (req, res) => {
  try {
    const documents = await Document.find().populate('client', 'name email').sort({ uploadedAt: -1 });
    res.status(200).json({ success: true, data: documents });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Get single document
// @route   GET /api/documents/:id
// @access  Public
exports.getDocumentById = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id).populate('client', 'name email');
    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }
    res.status(200).json({ success: true, data: document });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Create new document
// @route   POST /api/documents
// @access  Public
exports.createDocument = async (req, res) => {
  try {
    const document = await Document.create(req.body);
    res.status(201).json({ success: true, data: document });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Update document
// @route   PUT /api/documents/:id
// @access  Public
exports.updateDocument = async (req, res) => {
  try {
    req.body.updatedAt = Date.now();
    const document = await Document.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }
    res.status(200).json({ success: true, data: document });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Delete document
// @route   DELETE /api/documents/:id
// @access  Public
exports.deleteDocument = async (req, res) => {
  try {
    const document = await Document.findByIdAndDelete(req.params.id);
    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};