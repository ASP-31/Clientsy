const express = require('express');
const router = express.Router();
const proposalController = require('../Controllers/proposalController');

router.route('/')
  .get(proposalController.getProposals)
  .post(proposalController.createProposal);

router.route('/:id')
  .get(proposalController.getProposalById)
  .put(proposalController.updateProposal)
  .delete(proposalController.deleteProposal);

module.exports = router;
