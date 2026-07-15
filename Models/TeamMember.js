const mongoose = require('mongoose');
const { Schema } = mongoose;

const paymentSchema = new Schema({
  amount: {
    type: Number,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String,
    trim: true
  }
});

const teamMemberSchema = new Schema({
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
  role: {
    type: String, // developer, designer, writer, project_manager, etc
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  payments: [paymentSchema],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

teamMemberSchema.index({ owner: 1, email: 1 });

module.exports = mongoose.model('TeamMember', teamMemberSchema);
