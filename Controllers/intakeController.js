const IntakeForm = require('../Models/IntakeForm');
const crypto = require('crypto');
const { assertOwnedClient, handleControllerError, omitProtectedFields } = require('../Middleware/security');

exports.getIntakeForms = async (req, res) => {
  try {
    const forms = await IntakeForm.find({ owner: req.user.id }).populate('client', 'name email company');
    res.status(200).json({ success: true, data: forms });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.getIntakeFormById = async (req, res) => {
  try {
    const form = await IntakeForm.findOne({ _id: req.params.id, owner: req.user.id }).populate('client', 'name email company');
    if (!form) {
      return res.status(404).json({ success: false, message: 'Intake Form not found' });
    }
    res.status(200).json({ success: true, data: form });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.createIntakeForm = async (req, res) => {
  try {
    await assertOwnedClient(req.body.client, req.user.id);
    const token = crypto.randomBytes(16).toString('hex');
    const payload = omitProtectedFields(req.body);
    const form = await IntakeForm.create({
      ...payload,
      token,
      owner: req.user.id
    });
    res.status(201).json({ success: true, data: form });
  } catch (error) {
    handleControllerError(res, error);
  }
};

exports.updateIntakeForm = async (req, res) => {
  try {
    if (req.body.client) {
      await assertOwnedClient(req.body.client, req.user.id);
    }
    const payload = omitProtectedFields(req.body, ['owner', 'token', 'submissions']);
    const form = await IntakeForm.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.id },
      payload,
      { new: true, runValidators: true }
    );
    if (!form) {
      return res.status(404).json({ success: false, message: 'Intake Form not found' });
    }
    res.status(200).json({ success: true, data: form });
  } catch (error) {
    handleControllerError(res, error);
  }
};

exports.deleteIntakeForm = async (req, res) => {
  try {
    const form = await IntakeForm.findOneAndDelete({ _id: req.params.id, owner: req.user.id });
    if (!form) {
      return res.status(404).json({ success: false, message: 'Intake Form not found' });
    }
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// PUBLIC ENDPOINTS

exports.getPublicIntakeByToken = async (req, res) => {
  try {
    const form = await IntakeForm.findOne({ token: req.params.token })
      .select('title description fields client')
      .populate('client', 'name company');
    if (!form) {
      return res.status(404).json({ success: false, message: 'Form not found or link has expired' });
    }
    res.status(200).json({ success: true, data: form });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.submitPublicIntake = async (req, res) => {
  try {
    const form = await IntakeForm.findOne({ token: req.params.token });
    if (!form) {
      return res.status(404).json({ success: false, message: 'Form not found or link has expired' });
    }

    form.submissions.push({
      submittedAt: Date.now(),
      answers: req.body.answers // Array of { label, value }
    });

    await form.save();
    res.status(200).json({ success: true, message: 'Form submitted successfully!' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};
