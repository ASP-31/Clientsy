const Document = require('../Models/Document');
const { assertOwnedClient, asyncHandler, omitProtectedFields } = require('../Middleware/security');

// @desc    Get all documents
// @route   GET /api/documents
// @access  Private
exports.getDocuments = asyncHandler(async (req, res) => {
  const documents = await Document.find({ uploadedBy: req.user.id }).populate('client', 'name email').sort({ uploadedAt: -1 });
  res.status(200).json({ success: true, data: documents });
});

// @desc    Get single document
// @route   GET /api/documents/:id
// @access  Private
exports.getDocumentById = asyncHandler(async (req, res) => {
  const document = await Document.findOne({ _id: req.params.id, uploadedBy: req.user.id }).populate('client', 'name email');
  if (!document) {
    return res.status(404).json({ success: false, message: 'Document not found' });
  }
  res.status(200).json({ success: true, data: document });
});

// @desc    Create new document
// @route   POST /api/documents
// @access  Private
exports.createDocument = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Please upload a file' });
  }
  await assertOwnedClient(req.body.client, req.user.id);
  const payload = omitProtectedFields(req.body);

  // Parse tags array or comma separated string if present
  let tags = [];
  if (payload.tags) {
    if (Array.isArray(payload.tags)) {
      tags = payload.tags;
    } else if (typeof payload.tags === 'string') {
      tags = payload.tags.split(',').map(t => t.trim()).filter(Boolean);
    }
  }

  const document = await Document.create({
    ...payload,
    tags,
    fileUrl: req.file.path,
    publicId: req.file.filename,
    fileType: req.file.mimetype,
    fileSize: req.file.size,
    uploadedBy: req.user.id
  });
  res.status(201).json({ success: true, data: document });
});

// @desc    Update document
// @route   PUT /api/documents/:id
// @access  Private
exports.updateDocument = asyncHandler(async (req, res) => {
  if (req.body.client) {
    await assertOwnedClient(req.body.client, req.user.id);
  }
  const payload = omitProtectedFields(req.body);
  payload.updatedAt = Date.now();
  const document = await Document.findOneAndUpdate(
    { _id: req.params.id, uploadedBy: req.user.id },
    payload,
    {
      new: true,
      runValidators: true
    }
  );
  if (!document) {
    return res.status(404).json({ success: false, message: 'Document not found' });
  }
  res.status(200).json({ success: true, data: document });
});

// @desc    Delete document
// @route   DELETE /api/documents/:id
// @access  Private
exports.deleteDocument = asyncHandler(async (req, res) => {
  const document = await Document.findOne({ _id: req.params.id, uploadedBy: req.user.id });
  if (!document) {
    return res.status(404).json({ success: false, message: 'Document not found' });
  }

  // Call Cloudinary to destroy the file if publicId is present
  if (document.publicId) {
    const { cloudinary } = require('../config/cloudinary');
    try {
      await cloudinary.uploader.destroy(document.publicId);
    } catch (err) {
      console.error(`Failed to destroy Cloudinary asset ${document.publicId}:`, err);
    }
  }

  await Document.deleteOne({ _id: req.params.id });
  res.status(200).json({ success: true, data: {} });
});