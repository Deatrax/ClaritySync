const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const verifyToken = require('../middleware/authMiddleware');

// /me routes must come BEFORE /:id to avoid collision
router.get('/me', verifyToken, employeeController.getMyProfile);
router.put('/me', verifyToken, employeeController.updateMyProfile);

// All authenticated users – list & view
router.get('/', verifyToken, employeeController.getAllEmployees);
router.get('/:id', verifyToken, employeeController.getEmployeeById);

// Write operations (admin-only enforced on frontend)
router.post('/', verifyToken, employeeController.createEmployee);
router.put('/:id', verifyToken, employeeController.updateEmployee);
router.delete('/:id', verifyToken, employeeController.deleteEmployee);

module.exports = router;
