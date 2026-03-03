const express = require('express');
const router = express.Router();
const logsController = require('../controllers/logsController');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');

router.get('/system', verifyToken, isAdmin, logsController.getSystemLog);
router.get('/login', verifyToken, isAdmin, logsController.getLoginLog);

module.exports = router;
