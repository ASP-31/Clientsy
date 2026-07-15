const Project = require('../Models/Project');
const { assertOwnedClient, handleControllerError, omitProtectedFields } = require('../Middleware/security');

exports.getProjects = async (req, res) => {
  try {
    const projects = await Project.find({ owner: req.user.id }).populate('client', 'name email company');
    res.status(200).json({ success: true, data: projects });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.getProjectById = async (req, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, owner: req.user.id }).populate('client', 'name email company');
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    res.status(200).json({ success: true, data: project });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.createProject = async (req, res) => {
  try {
    await assertOwnedClient(req.body.client, req.user.id);
    const payload = omitProtectedFields(req.body);
    const project = await Project.create({ ...payload, owner: req.user.id });
    res.status(201).json({ success: true, data: project });
  } catch (error) {
    handleControllerError(res, error);
  }
};

exports.updateProject = async (req, res) => {
  try {
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
  } catch (error) {
    handleControllerError(res, error);
  }
};

exports.deleteProject = async (req, res) => {
  try {
    const project = await Project.findOneAndDelete({ _id: req.params.id, owner: req.user.id });
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
