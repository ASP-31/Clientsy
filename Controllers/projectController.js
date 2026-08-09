const Project = require('../Models/Project');
const { assertOwnedClient, asyncHandler, omitProtectedFields } = require('../Middleware/security');

exports.getProjects = asyncHandler(async (req, res) => {
  const projects = await Project.find({ owner: req.user.id }).populate('client', 'name email company');
  res.status(200).json({ success: true, data: projects });
});

exports.getProjectById = asyncHandler(async (req, res) => {
  const project = await Project.findOne({ _id: req.params.id, owner: req.user.id }).populate('client', 'name email company');
  if (!project) {
    return res.status(404).json({ success: false, message: 'Project not found' });
  }
  res.status(200).json({ success: true, data: project });
});

exports.createProject = asyncHandler(async (req, res) => {
  if (!req.body.client || !req.body.name) {
    return res.status(400).json({ success: false, message: 'Please provide a client and project name' });
  }
  await assertOwnedClient(req.body.client, req.user.id);
  const payload = omitProtectedFields(req.body);
  const project = await Project.create({ ...payload, owner: req.user.id });
  res.status(201).json({ success: true, data: project });
});

exports.updateProject = asyncHandler(async (req, res) => {
  if (req.body.client) {
    await assertOwnedClient(req.body.client, req.user.id);
  }
  const payload = omitProtectedFields(req.body);
  const project = await Project.findOneAndUpdate(
    { _id: req.params.id, owner: req.user.id },
    { ...payload, updatedAt: Date.now() },
    { new: true, runValidators: true }
  );
  if (!project) {
    return res.status(404).json({ success: false, message: 'Project not found' });
  }
  res.status(200).json({ success: true, data: project });
});

exports.deleteProject = asyncHandler(async (req, res) => {
  const project = await Project.findOneAndDelete({ _id: req.params.id, owner: req.user.id });
  if (!project) {
    return res.status(404).json({ success: false, message: 'Project not found' });
  }
  res.status(200).json({ success: true, data: {} });
});