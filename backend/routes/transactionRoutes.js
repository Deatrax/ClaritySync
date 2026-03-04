const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const { checkModule } = require('../middleware/moduleMiddleware');

router.get('/', checkModule('TRANSACTIONS'), transactionController.getAllTransactions);
router.post('/', checkModule('TRANSACTIONS'), transactionController.createTransaction);
router.get('/:id', checkModule('TRANSACTIONS'), transactionController.getTransactionById);

module.exports = router;
