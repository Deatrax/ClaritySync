const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const verifyToken = require('../middleware/authMiddleware');

// Note: read-all must come BEFORE /:id/read to avoid route collision
router.get('/', verifyToken, notificationController.getMyNotifications);
router.put('/read-all', verifyToken, notificationController.markAllRead);
router.put('/:id/read', verifyToken, notificationController.markAsRead);

module.exports = router;
