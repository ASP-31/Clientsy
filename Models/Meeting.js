const mongoose = require('mongoose');
const { Schema } = mongoose;

const meetingSchema = new Schema({
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
  description: {
    type: String,
    trim: true
  },
  startAt: {
    type: Date,
    required: true
  },
  endAt: {
    type: Date,
    required: true
  },
  meetLink: {
    type: String,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

meetingSchema.index({ owner: 1, startAt: 1 });
meetingSchema.index({ client: 1 });

module.exports = mongoose.model('Meeting', meetingSchema);
