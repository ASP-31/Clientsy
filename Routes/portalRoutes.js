const express = require('express');
const router = express.Router();
const portalController = require('../Controllers/portalController');

router.get('/dashboard', portalController.getPortalData);
router.post('/proposals/:id/sign', portalController.signProposal);
router.post('/invoices/:id/pay', portalController.payInvoice);

module.exports = router;
