const express = require('express');
const router = express.Router();
const rolesController = require('../controllers/rolesController');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');

router.get('/', verifyToken, isAdmin, rolesController.getAllRoles);
router.post('/', verifyToken, isAdmin, rolesController.createRole);
router.get('/:roleId', verifyToken, isAdmin, rolesController.getRoleById);
router.put('/:roleId', verifyToken, isAdmin, rolesController.updateRole);
router.delete('/:roleId', verifyToken, isAdmin, rolesController.deleteRole);

module.exports = router;
