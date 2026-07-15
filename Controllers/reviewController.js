const Review = require('../Models/Review');
const Project = require('../Models/Project');
const Client = require('../Models/Client');
const User = require('../Models/User');
const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../Middleware/security');

const getOptionalUser = async (req) => {
  try {
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ')) {
      return null;
    }

    const decoded = jwt.verify(auth.split(' ')[1], getJwtSecret());
    return User.findById(decoded.id);
  } catch (error) {
    return null;
  }
};

exports.getReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ owner: req.user.id })
      .populate('client', 'name company')
      .populate('project', 'name')
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: reviews });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.createReview = async (req, res) => {
  try {
    const review = await Review.create({ ...req.body, owner: req.user.id });
    res.status(201).json({ success: true, data: review });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};

// PUBLIC ENDPOINTS

exports.getPublicReviewsForUser = async (req, res) => {
  try {
    // We can fetch by the owner's user ID
    const reviews = await Review.find({ owner: req.params.userId })
      .populate('client', 'name company')
      .populate('project', 'name')
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: reviews });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.submitPublicReview = async (req, res) => {
  try {
    const { clientId, projectId } = req.params;
    const { rating, feedback } = req.body;

    const project = await Project.findOne({ _id: projectId, client: clientId });
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const client = await Client.findOne({ _id: clientId, owner: project.owner });
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    const optionalUser = await getOptionalUser(req);
    const isVerified = Boolean(
      optionalUser &&
      optionalUser.role === 'client' &&
      optionalUser.email === client.email
    );

    const review = await Review.create({
      client: clientId,
      project: projectId,
      owner: project.owner, // Review is owned by the developer who owns the project
      rating,
      feedback,
      isVerified
    });

    res.status(201).json({ success: true, data: review });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};
