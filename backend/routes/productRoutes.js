const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { checkModule } = require('../middleware/moduleMiddleware');

router.get('/', checkModule('INVENTORY'), productController.getAllProducts);
router.post('/', checkModule('INVENTORY'), productController.createProduct);
router.post('/with-attributes', checkModule('INVENTORY'), productController.createProductWithAttributes);
router.get('/:id', productController.getProductById);
router.put('/:id', productController.updateProduct);
router.delete('/:id', checkModule('INVENTORY'), productController.deleteProduct);

module.exports = router;
