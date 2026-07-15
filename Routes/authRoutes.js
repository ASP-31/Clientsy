const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getMe, googleAuthRedirect, googleAuthCallback } = require('../Controllers/authController');
const { protect } = require('../Middleware/auth');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', protect, getMe);

// Google OAuth
router.get('/google', googleAuthRedirect);
router.get('/google/callback', googleAuthCallback);

module.exports = router;
