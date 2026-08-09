const IntakeForm = require('../Models/IntakeForm');
const crypto = require('crypto');
const { assertOwnedClient, asyncHandler, omitProtectedFields, isValidObjectId } = require('../Middleware/security');

exports.getIntakeForms = asyncHandler(async (req, res) => {
  const forms = await IntakeForm.find({ owner: req.user.id }).populate('client', 'name email company');
  res.status(200).json({ success: true, data: forms });
});

exports.getIntakeFormById = asyncHandler(async (req, res) => {
  const form = await IntakeForm.findOne({ _id: req.params.id, owner: req.user.id }).populate('client', 'name email company');
  if (!form) {
    return res.status(404).json({ success: false, message: 'Intake Form not found' });
  }
  res.status(200).json({ success: true, data: form });
});

exports.createIntakeForm = asyncHandler(async (req, res) => {
  await assertOwnedClient(req.body.client, req.user.id);
  const token = crypto.randomBytes(16).toString('hex');
  const payload = omitProtectedFields(req.body);
  const form = await IntakeForm.create({
    ...payload,
    token,
    owner: req.user.id
  });
  res.status(201).json({ success: true, data: form });
});

exports.updateIntakeForm = asyncHandler(async (req, res) => {
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
});

exports.deleteIntakeForm = asyncHandler(async (req, res) => {
  const form = await IntakeForm.findOneAndDelete({ _id: req.params.id, owner: req.user.id });
  if (!form) {
    return res.status(404).json({ success: false, message: 'Intake Form not found' });
  }
  res.status(200).json({ success: true, data: {} });
});

// PUBLIC ENDPOINTS

exports.getPublicIntakeByToken = asyncHandler(async (req, res) => {
  const form = await IntakeForm.findOne({ token: req.params.token })
    .select('title description fields client')
    .populate('client', 'name company');
  if (!form) {
    return res.status(404).json({ success: false, message: 'Form not found or link has expired' });
  }
  res.status(200).json({ success: true, data: form });
});

exports.submitPublicIntake = asyncHandler(async (req, res) => {
  const form = await IntakeForm.findOne({ token: req.params.token });
  if (!form) {
    return res.status(404).json({ success: false, message: 'Form not found or link has expired' });
  }

  // Validate answers payload shape to prevent storing junk
  const answers = Array.isArray(req.body.answers) ? req.body.answers : [];
  const clean = answers
    .filter((a) => a && typeof a === 'object')
    .map((a) => ({
      label: String(a.label || '').slice(0, 500),
      value: String(a.value ?? '').slice(0, 10000)
    }))
    .filter((a) => a.label);

  form.submissions.push({
    submittedAt: Date.now(),
    answers: clean
  });

  await form.save();
  res.status(200).json({ success: true, message: 'Form submitted successfully!' });
});