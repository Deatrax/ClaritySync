const express = require('express');
const router = express.Router();
const logsController = require('../controllers/logsController');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');
const { checkModule } = require('../middleware/moduleMiddleware');

router.get('/system', verifyToken, isAdmin, checkModule('ACTIVITY_LOG'), logsController.getSystemLog);
router.get('/login', verifyToken, isAdmin, checkModule('ACTIVITY_LOG'), logsController.getLoginLog);

router.delete('/system/:id', verifyToken, isAdmin, checkModule('ACTIVITY_LOG'), logsController.deleteSystemLog);
router.delete('/login/:id', verifyToken, isAdmin, checkModule('ACTIVITY_LOG'), logsController.deleteLoginLog);

module.exports = router;
