const express = require('express');
const router = express.Router();
const invoiceController = require('../Controllers/invoiceController');
const { invoiceValidators } = require('../Middleware/validators');

router.route('/')
  .get(invoiceController.getInvoices)
  .post(invoiceValidators, invoiceController.createInvoice);

router.route('/:id')
  .get(invoiceController.getInvoiceById)
  .put(invoiceValidators, invoiceController.updateInvoice)
  .delete(invoiceController.deleteInvoice);

module.exports = router;
