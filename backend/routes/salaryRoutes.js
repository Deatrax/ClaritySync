const express = require('express');
const router = express.Router();
const salaryController = require('../controllers/salaryController');
const verifyToken = require('../middleware/authMiddleware');

// Component type management (admin)
router.get('/components', verifyToken, salaryController.getComponents);
router.post('/components', verifyToken, salaryController.createComponent);
router.delete('/components/:id', verifyToken, salaryController.deleteComponent);

// Employee self-service — /me MUST come before /:employeeId
router.get('/me', verifyToken, salaryController.getMyMonthlySalary);

// Admin — specific employee
router.get('/:employeeId', verifyToken, salaryController.getEmployeeSalary);
router.put('/:employeeId', verifyToken, salaryController.upsertEmployeeSalary);

module.exports = router;
