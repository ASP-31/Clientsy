const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getMe } = require('../Controllers/authController');
const { protect } = require('../Middleware/auth');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', protect, getMe);

module.exports = router;
