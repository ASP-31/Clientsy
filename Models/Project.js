const mongoose = require('mongoose');
const { Schema } = mongoose;

const taskSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['to-do', 'doing', 'done'],
    default: 'to-do'
  },
  assignedTo: {
    type: String, // name or email of team member
    trim: true
  }
});

const projectSchema = new Schema({
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
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['to-do', 'doing', 'done'],
    default: 'to-do'
  },
  budget: {
    type: Number,
    default: 0
  },
  deadline: {
    type: Date
  },
  tasks: [taskSchema],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

projectSchema.index({ owner: 1, client: 1 });
projectSchema.index({ status: 1 });

module.exports = mongoose.model('Project', projectSchema);
