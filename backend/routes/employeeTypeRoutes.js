const express = require('express');
const router = express.Router();
const employeeTypeController = require('../controllers/employeeTypeController');
const verifyToken = require('../middleware/authMiddleware');

router.get('/', verifyToken, employeeTypeController.getTypes);
router.get('/:id', verifyToken, employeeTypeController.getTypeById);
router.post('/', verifyToken, employeeTypeController.createType);
router.put('/:id', verifyToken, employeeTypeController.updateType);
router.delete('/:id', verifyToken, employeeTypeController.deleteType);

module.exports = router;
