const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expenseController');
const { verifyToken } = require('../middleware/authMiddleware');

// /me must be before /:id routes
router.get('/me', verifyToken, expenseController.getMyRequests);
router.post('/', verifyToken, expenseController.submitRequest);
router.get('/', verifyToken, expenseController.getAllRequests);
router.put('/:id/status', verifyToken, expenseController.updateStatus);

module.exports = router;
