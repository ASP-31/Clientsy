const express = require('express');
const router = express.Router();
const clientController = require('../Controllers/clientController');
const { createClientValidators, updateClientValidators } = require('../Middleware/validators');

// Client routes
router.route('/')
  .get(clientController.getClients)
  .post(createClientValidators, clientController.createClient);

router.route('/:id')
  .get(clientController.getClientById)
  .put(updateClientValidators, clientController.updateClient)
  .delete(clientController.deleteClient);

module.exports = router;