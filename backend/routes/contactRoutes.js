const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');
const { checkModule } = require('../middleware/moduleMiddleware');

router.get('/', checkModule('CONTACTS'), contactController.getAllContacts);
router.post('/', checkModule('CONTACTS'), contactController.createContact);
router.get('/:id', checkModule('CONTACTS'), contactController.getContactById);
router.put('/:id', checkModule('CONTACTS'), contactController.updateContact);
router.get('/:id/history', checkModule('CONTACTS'), contactController.getContactHistory);

module.exports = router;
