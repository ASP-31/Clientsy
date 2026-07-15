const mongoose = require('mongoose');
const { Schema } = mongoose;

const fieldSchema = new Schema({
  label: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['text', 'textarea', 'checkbox'],
    default: 'text'
  },
  required: {
    type: Boolean,
    default: false
  }
});

const submissionSchema = new Schema({
  submittedAt: {
    type: Date,
    default: Date.now
  },
  answers: [{
    label: String,
    value: String
  }]
});

const intakeFormSchema = new Schema({
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
  fields: [fieldSchema],
  token: {
    type: String,
    required: true,
    unique: true
  },
  submissions: [submissionSchema],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

intakeFormSchema.index({ owner: 1, client: 1 });

module.exports = mongoose.model('IntakeForm', intakeFormSchema);
