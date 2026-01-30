const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');

router.get('/', categoryController.getAllCategories);
router.post('/', categoryController.createCategory);
router.post('/seed/defaults', categoryController.seedDefaults);
router.get('/:id/attributes', categoryController.getCategoryAttributes);

module.exports = router;
