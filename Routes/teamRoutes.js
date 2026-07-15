const express = require('express');
const router = express.Router();
const teamController = require('../Controllers/teamController');

router.route('/')
  .get(teamController.getTeamMembers)
  .post(teamController.createTeamMember);

router.route('/:id')
  .put(teamController.updateTeamMember)
  .delete(teamController.deleteTeamMember);

router.route('/:id/payments')
  .post(teamController.recordPayment);

module.exports = router;
