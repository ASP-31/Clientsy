const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getMe } = require('../Controllers/authController');
const { protect } = require('../Middleware/auth');
const { registerValidators, loginValidators } = require('../Middleware/validators');

router.post('/register', registerValidators, registerUser);
router.post('/login', loginValidators, loginUser);
router.get('/me', protect, getMe);

module.exports = router;
