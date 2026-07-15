const mongoose = require('mongoose');
const { Schema } = mongoose;

const clientSchema = new Schema({
  owner: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    trim: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  company: {
    type: String,
    trim: true
  },
  website: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  status: {
    type: String,
    enum: ['lead', 'active', 'on-hold', 'completed'],
    default: 'active'
  },
  leadStage: {
    type: String,
    enum: ['new', 'in-talks', 'proposal-sent', 'won', 'lost', 'none'],
    default: 'none'
  },
  leadValue: {
    type: Number,
    default: 0
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

// Indexes for faster queries
clientSchema.index({ owner: 1, email: 1 });
clientSchema.index({ owner: 1, status: 1 });
clientSchema.index({ name: 'text' });

module.exports = mongoose.model('Client', clientSchema);