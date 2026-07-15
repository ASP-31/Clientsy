const mongoose = require('mongoose');
const { Schema } = mongoose;

const reviewSchema = new Schema({
  client: {
    type: Schema.Types.ObjectId,
    ref: 'Client',
    required: true
  },
  project: {
    type: Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  owner: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  feedback: {
    type: String,
    required: true,
    trim: true
  },
  isVerified: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

reviewSchema.index({ owner: 1, createdAt: -1 });
reviewSchema.index({ client: 1 });
reviewSchema.index({ project: 1 });

module.exports = mongoose.model('Review', reviewSchema);
