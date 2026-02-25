const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

router.get('/', productController.getAllProducts);
router.post('/', productController.createProduct);
router.post('/with-attributes', productController.createProductWithAttributes);
router.delete('/:id', productController.deleteProduct);

module.exports = router;
