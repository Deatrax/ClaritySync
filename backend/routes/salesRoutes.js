const express = require('express');
const router = express.Router();
const salesController = require('../controllers/salesController');

router.get('/', salesController.getAllSales);
router.post('/', salesController.createSale);
router.get('/:id', salesController.getSaleById);

module.exports = router;
