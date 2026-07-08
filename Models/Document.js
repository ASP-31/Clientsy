const mongoose = require('mongoose');
const { Schema } = mongoose;

const documentSchema = new Schema({
  client: {
    type: Schema.Types.ObjectId,
    ref: 'Client',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  fileUrl: {
    type: String, // URL to stored file (e.g., AWS S3, local uploads)
    required: true
  },
  fileType: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number, // in bytes
    required: true
  },
  uploadedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User', // Reference to User model (to be created later)
    required: false
  },
  category: {
    type: String,
    enum: ['invoice', 'receipt', 'contract', 'proposal', 'other'],
    default: 'other'
  },
  tags: [{
    type: String,
    trim: true
  }],
  isPublic: {
    type: Boolean,
    default: false
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes
documentSchema.index({ client: 1, uploadedAt: -1 });
documentSchema.index({ fileType: 1 });
documentSchema.index({ category: 1 });

module.exports = mongoose.model('Document', documentSchema);