const express = require('express');
const router = express.Router();
const documentController = require('../Controllers/documentController');

// Document routes
router.route('/')
  .get(documentController.getDocuments)
  .post(documentController.createDocument);

router.route('/:id')
  .get(documentController.getDocumentById)
  .put(documentController.updateDocument) // need to implement
  .delete(documentController.deleteDocument); // need to implement

module.exports = router;