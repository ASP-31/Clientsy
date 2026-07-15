const express = require('express');
const router = express.Router();
const invoiceController = require('../Controllers/invoiceController');

router.route('/')
  .get(invoiceController.getInvoices)
  .post(invoiceController.createInvoice);

router.route('/:id')
  .get(invoiceController.getInvoiceById)
  .put(invoiceController.updateInvoice)
  .delete(invoiceController.deleteInvoice);

module.exports = router;
