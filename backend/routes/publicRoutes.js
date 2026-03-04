const express = require('express');
const router = express.Router();
const publicController = require('../controllers/publicController');

// Public route for viewing receipts without authentication
router.get('/receipt/:token', publicController.getPublicReceipt);

module.exports = router;
