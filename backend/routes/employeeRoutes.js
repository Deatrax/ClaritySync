const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const { verifyToken } = require('../middleware/authMiddleware');

// Public (any authenticated user) – list & view
router.get('/', verifyToken, employeeController.getAllEmployees);
router.get('/:id', verifyToken, employeeController.getEmployeeById);

// Admin-only – create, update, delete (role check handled in frontend; backend trusts token)
router.post('/', verifyToken, employeeController.createEmployee);
router.put('/:id', verifyToken, employeeController.updateEmployee);
router.delete('/:id', verifyToken, employeeController.deleteEmployee);

module.exports = router;
