const express = require('express');
const router = express.Router();
const moduleController = require('../controllers/moduleController');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');

// Get modules (any authenticated user can see state for sidebar)
router.get('/', verifyToken, moduleController.getModules);
router.put('/:moduleName', verifyToken, isAdmin, moduleController.toggleModule);

module.exports = router;
