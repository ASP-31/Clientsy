const express = require('express');
const router = express.Router();
const intakeController = require('../Controllers/intakeController');
const reviewController = require('../Controllers/reviewController');

// Public Intake forms
router.get('/intake/:token', intakeController.getPublicIntakeByToken);
router.post('/intake/:token/submit', intakeController.submitPublicIntake);

// Public Reviews
router.get('/reviews/:userId', reviewController.getPublicReviewsForUser);
router.post('/reviews/:clientId/:projectId', reviewController.submitPublicReview);

module.exports = router;
