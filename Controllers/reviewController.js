const Review = require('../Models/Review');
const Project = require('../Models/Project');
const Client = require('../Models/Client');
const User = require('../Models/User');
const jwt = require('jsonwebtoken');
const { asyncHandler, getJwtSecret, omitProtectedFields } = require('../Middleware/security');

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

exports.getReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ owner: req.user.id })
    .populate('client', 'name company')
    .populate('project', 'name')
    .sort({ createdAt: -1 });
  res.status(200).json({ success: true, data: reviews });
});

exports.createReview = asyncHandler(async (req, res) => {
  const { client, project, rating, feedback } = req.body;

  if (!client || !project) {
    return res.status(400).json({ success: false, message: 'Please provide a client and project' });
  }

  // Verify the project belongs to an owned client
  const ownedProject = await Project.findOne({ _id: project, client, owner: req.user.id });
  if (!ownedProject) {
    return res.status(404).json({ success: false, message: 'Project not found for this client' });
  }

  const review = await Review.create({
    ...omitProtectedFields(req.body),
    owner: req.user.id,
    client,
    project
  });
  res.status(201).json({ success: true, data: review });
});

// PUBLIC ENDPOINTS

exports.getPublicReviewsForUser = asyncHandler(async (req, res) => {
  // We can fetch by the owner's user ID
  const reviews = await Review.find({ owner: req.params.userId })
    .populate('client', 'name company')
    .populate('project', 'name')
    .sort({ createdAt: -1 });
  res.status(200).json({ success: true, data: reviews });
});

exports.submitPublicReview = asyncHandler(async (req, res) => {
  const { clientId, projectId } = req.params;
  const { rating, feedback } = req.body;

  const numericRating = Math.round(Number(rating));
  if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
    return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
  }

  if (!feedback || typeof feedback !== 'string' || feedback.trim().length < 3) {
    return res.status(400).json({ success: false, message: 'Please provide feedback of at least 3 characters' });
  }

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
    rating: numericRating,
    feedback: feedback.trim().slice(0, 5000),
    isVerified
  });

  res.status(201).json({ success: true, data: review });
});