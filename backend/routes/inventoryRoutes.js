const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const { checkModule } = require('../middleware/moduleMiddleware');

router.get('/', checkModule('INVENTORY'), inventoryController.getInventory);
router.post('/add', checkModule('INVENTORY'), inventoryController.addStock);

module.exports = router;
