const express = require('express');
const router = express.Router();
const adminUsersController = require('../controllers/adminUsersController');
const verifyToken = require('../middleware/authMiddleware');

// All endpoints require authentication
router.get('/', verifyToken, adminUsersController.getAdminUsers);
router.put('/:employeeId/role', verifyToken, adminUsersController.changeEmployeeRole);
router.put('/:userId/toggle', verifyToken, adminUsersController.toggleUserAccount);
router.post('/', verifyToken, adminUsersController.createUserAccount);

module.exports = router;
