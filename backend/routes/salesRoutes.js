const express = require('express');
const router = express.Router();
const salesController = require('../controllers/salesController');
const { checkModule } = require('../middleware/moduleMiddleware');

router.get('/', checkModule('SALES'), salesController.getAllSales);
router.post('/', checkModule('SALES'), salesController.createSale);
router.get('/:id', checkModule('SALES'), salesController.getSaleById);

module.exports = router;
