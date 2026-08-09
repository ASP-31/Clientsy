const Invoice = require('../Models/Invoice');
const { assertOwnedClient, asyncHandler, omitProtectedFields } = require('../Middleware/security');

exports.getInvoices = asyncHandler(async (req, res) => {
  const invoices = await Invoice.find({ owner: req.user.id }).populate('client', 'name email company address');
  res.status(200).json({ success: true, data: invoices });
});

exports.getInvoiceById = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findOne({ _id: req.params.id, owner: req.user.id }).populate('client', 'name email company address');
  if (!invoice) {
    return res.status(404).json({ success: false, message: 'Invoice/Quotation not found' });
  }
  res.status(200).json({ success: true, data: invoice });
});

exports.createInvoice = asyncHandler(async (req, res) => {
  if (!req.body.client || !req.body.invoiceNumber) {
    return res.status(400).json({ success: false, message: 'Please provide a client and document number' });
  }
  await assertOwnedClient(req.body.client, req.user.id);
  const payload = omitProtectedFields(req.body);
  const invoice = await Invoice.create({ ...payload, owner: req.user.id });
  res.status(201).json({ success: true, data: invoice });
});

exports.updateInvoice = asyncHandler(async (req, res) => {
  if (req.body.client) {
    await assertOwnedClient(req.body.client, req.user.id);
  }
  const payload = omitProtectedFields(req.body);
  const invoice = await Invoice.findOneAndUpdate(
    { _id: req.params.id, owner: req.user.id },
    { ...payload, updatedAt: Date.now() },
    { new: true, runValidators: true }
  );
  if (!invoice) {
    return res.status(404).json({ success: false, message: 'Invoice/Quotation not found' });
  }
  res.status(200).json({ success: true, data: invoice });
});

exports.deleteInvoice = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findOneAndDelete({ _id: req.params.id, owner: req.user.id });
  if (!invoice) {
    return res.status(404).json({ success: false, message: 'Invoice/Quotation not found' });
  }
  res.status(200).json({ success: true, data: {} });
});