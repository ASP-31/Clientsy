const express = require('express');
const router = express.Router();
const clientController = require('../Controllers/clientController');

// Client routes
router.route('/')
  .get(clientController.getClients)
  .post(clientController.createClient);

router.route('/:id')
  .get(clientController.getClientById)
  .put(clientController.updateClient)
  .delete(clientController.deleteClient);

module.exports = router;