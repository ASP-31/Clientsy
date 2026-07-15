const mongoose = require('mongoose');
const { Schema } = mongoose;

const proposalSchema = new Schema({
  client: {
    type: Schema.Types.ObjectId,
    ref: 'Client',
    required: true
  },
  owner: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String, // scope / pricing details
    required: true
  },
  terms: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['draft', 'sent', 'signed', 'declined'],
    default: 'draft'
  },
  signature: {
    signedBy: String,
    signedAt: Date,
    ipAddress: String,
    signatureData: String // base64 drawing data
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

proposalSchema.index({ owner: 1, client: 1 });
proposalSchema.index({ status: 1 });

module.exports = mongoose.model('Proposal', proposalSchema);
