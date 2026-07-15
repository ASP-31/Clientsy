const express = require('express');
const router = express.Router();
const meetingController = require('../Controllers/meetingController');

router.route('/')
  .get(meetingController.getMeetings)
  .post(meetingController.createMeeting);

router.route('/:id')
  .delete(meetingController.deleteMeeting);

module.exports = router;
