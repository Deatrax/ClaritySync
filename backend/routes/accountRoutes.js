const express = require('express');
const router = express.Router();
const accountController = require('../controllers/accountController');
const { checkModule } = require('../middleware/moduleMiddleware');

router.get('/', checkModule('BANKING'), accountController.getAllAccounts);
router.post('/', checkModule('BANKING'), accountController.createAccount);
router.delete('/:id', checkModule('BANKING'), accountController.deleteAccount);

module.exports = router;
