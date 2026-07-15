const mongoose = require('mongoose');
const { Schema } = mongoose;

const invoiceItemSchema = new Schema({
  description: {
    type: String,
    required: true,
    trim: true
  },
  qty: {
    type: Number,
    required: true,
    default: 1
  },
  rate: {
    type: Number,
    required: true,
    default: 0
  },
  amount: {
    type: Number,
    required: true,
    default: 0
  }
});

const invoiceSchema = new Schema({
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
  invoiceNumber: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['invoice', 'quotation'],
    default: 'invoice'
  },
  status: {
    type: String,
    enum: ['draft', 'sent', 'paid', 'approved', 'declined'],
    default: 'draft'
  },
  issueDate: {
    type: Date,
    default: Date.now
  },
  dueDate: {
    type: Date
  },
  items: [invoiceItemSchema],
  taxRate: {
    type: Number, // percentage, e.g. 18 for 18% GST
    default: 18
  },
  taxAmount: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    default: 0
  },
  notes: {
    type: String,
    trim: true
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

invoiceSchema.index({ owner: 1, invoiceNumber: 1 });
invoiceSchema.index({ client: 1 });
invoiceSchema.index({ type: 1, status: 1 });

module.exports = mongoose.model('Invoice', invoiceSchema);
