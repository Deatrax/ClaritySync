const express = require('express');
const router = express.Router();
const adminUsersController = require('../controllers/adminUsersController');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');

// All endpoints require administrator authentication
router.get('/', verifyToken, isAdmin, adminUsersController.getAdminUsers);
router.put('/:employeeId/role', verifyToken, isAdmin, adminUsersController.changeEmployeeRole);
router.put('/:userId/toggle', verifyToken, isAdmin, adminUsersController.toggleUserAccount);
router.post('/', verifyToken, isAdmin, adminUsersController.createUserAccount);

module.exports = router;
