const express = require('express');
const router = express.Router();
const salesController = require('../controllers/salesController');
const { checkModule } = require('../middleware/moduleMiddleware');
const { verifyToken } = require('../middleware/authMiddleware');

router.get('/', checkModule('SALES'), verifyToken, salesController.getAllSales);
router.post('/', checkModule('SALES'), verifyToken, salesController.createSale);
router.get('/:id', checkModule('SALES'), verifyToken, salesController.getSaleById);

module.exports = router;
