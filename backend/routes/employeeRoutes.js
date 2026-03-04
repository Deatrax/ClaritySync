const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const { verifyToken } = require('../middleware/authMiddleware');
const { checkModule } = require('../middleware/moduleMiddleware');

// /me routes must come BEFORE /:id to avoid collision
router.get('/me', verifyToken, employeeController.getMyProfile);
router.put('/me', verifyToken, employeeController.updateMyProfile);

// All authenticated users – list & view
router.get('/', verifyToken, checkModule('EMPLOYEES'), employeeController.getAllEmployees);
router.get('/:id', verifyToken, checkModule('EMPLOYEES'), employeeController.getEmployeeById);

// Write operations (admin-only enforced on frontend)
router.post('/', verifyToken, checkModule('EMPLOYEES'), employeeController.createEmployee);
router.put('/:id', verifyToken, checkModule('EMPLOYEES'), employeeController.updateEmployee);
router.delete('/:id', verifyToken, checkModule('EMPLOYEES'), employeeController.deleteEmployee);

module.exports = router;
