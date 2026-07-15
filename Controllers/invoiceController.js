const Invoice = require('../Models/Invoice');
const { assertOwnedClient, handleControllerError, omitProtectedFields } = require('../Middleware/security');

exports.getInvoices = async (req, res) => {
  try {
    const invoices = await Invoice.find({ owner: req.user.id }).populate('client', 'name email company address');
    res.status(200).json({ success: true, data: invoices });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.getInvoiceById = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, owner: req.user.id }).populate('client', 'name email company address');
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice/Quotation not found' });
    }
    res.status(200).json({ success: true, data: invoice });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.createInvoice = async (req, res) => {
  try {
    await assertOwnedClient(req.body.client, req.user.id);
    const payload = omitProtectedFields(req.body);
    const invoice = await Invoice.create({ ...payload, owner: req.user.id });
    res.status(201).json({ success: true, data: invoice });
  } catch (error) {
    handleControllerError(res, error);
  }
};

exports.updateInvoice = async (req, res) => {
  try {
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
  } catch (error) {
    handleControllerError(res, error);
  }
};

exports.deleteInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findOneAndDelete({ _id: req.params.id, owner: req.user.id });
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice/Quotation not found' });
    }
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
