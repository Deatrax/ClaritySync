const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const { verifyToken } = require('../middleware/authMiddleware');
const { checkModule } = require('../middleware/moduleMiddleware');

// Public (any authenticated user) – list & view
router.get('/', verifyToken, checkModule('EMPLOYEES'), employeeController.getAllEmployees);
router.get('/:id', verifyToken, checkModule('EMPLOYEES'), employeeController.getEmployeeById);

// Admin-only – create, update, delete (role check handled in frontend; backend trusts token)
router.post('/', verifyToken, checkModule('EMPLOYEES'), employeeController.createEmployee);
router.put('/:id', verifyToken, checkModule('EMPLOYEES'), employeeController.updateEmployee);
router.delete('/:id', verifyToken, checkModule('EMPLOYEES'), employeeController.deleteEmployee);

module.exports = router;
