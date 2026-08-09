const User = require('../Models/User');
const jwt = require('jsonwebtoken');
const { asyncHandler, getJwtSecret } = require('../Middleware/security');

const oauthStateStore = new Map();
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

// Allowed registration roles (prevents privilege escalation to admin)
const ALLOWED_ROLES = ['developer', 'client'];

// Helper to generate JWT token
const generateToken = (id) => {
  return jwt.sign(
    { id },
    getJwtSecret(),
    { expiresIn: '30d' }
  );
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
exports.registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'Please provide name, email and password' });
  }

  // Only permit developer/client registration, never admin
  const normalizedRole = ALLOWED_ROLES.includes(role) ? role : 'developer';

  // Check if user already exists
  const userExists = await User.findOne({ email: String(email).toLowerCase() });
  if (userExists) {
    return res.status(400).json({ success: false, message: 'Email is already registered' });
  }

  // Create user
  const user = await User.create({
    name,
    email,
    password,
    role: normalizedRole
  });

  if (user) {
    res.status(201).json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id)
      }
    });
  } else {
    res.status(400).json({ success: false, message: 'Invalid user data' });
  }
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Validate email & password
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Please provide email and password' });
  }

  // Check for user (emails are stored lowercase)
  const user = await User.findOne({ email: String(email).toLowerCase() }).select('+password');
  if (!user) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  // Check if password matches
  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  res.status(200).json({
    success: true,
    data: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id)
    }
  });
});

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  res.status(200).json({
    success: true,
    data: user
  });
});

module.exports.ALLOWED_ROLES = ALLOWED_ROLES;