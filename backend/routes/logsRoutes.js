const express = require('express');
const router = express.Router();
const logsController = require('../controllers/logsController');
const verifyToken = require('../middleware/authMiddleware');

router.get('/system', verifyToken, logsController.getSystemLog);
router.get('/login', verifyToken, logsController.getLoginLog);

module.exports = router;
