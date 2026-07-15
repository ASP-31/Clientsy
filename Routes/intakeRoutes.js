const express = require('express');
const router = express.Router();
const intakeController = require('../Controllers/intakeController');

router.route('/')
  .get(intakeController.getIntakeForms)
  .post(intakeController.createIntakeForm);

router.route('/:id')
  .get(intakeController.getIntakeFormById)
  .put(intakeController.updateIntakeForm)
  .delete(intakeController.deleteIntakeForm);

module.exports = router;
