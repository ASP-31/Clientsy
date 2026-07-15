const express = require('express');
const router = express.Router();
const reviewController = require('../Controllers/reviewController');

router.route('/')
  .get(reviewController.getReviews)
  .post(reviewController.createReview);

module.exports = router;
