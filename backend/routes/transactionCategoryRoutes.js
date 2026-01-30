const express = require('express');
const router = express.Router();
const transactionCategoryController = require('../controllers/transactionCategoryController');

router.get('/', transactionCategoryController.getAllCategories);
router.post('/', transactionCategoryController.createCategory);
router.get('/:id', transactionCategoryController.getCategoryById);
router.delete('/:id', transactionCategoryController.deleteCategory);

module.exports = router;
