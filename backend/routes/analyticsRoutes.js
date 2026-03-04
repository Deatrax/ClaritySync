const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { verifyToken } = require('../middleware/authMiddleware');

router.get('/top-products', verifyToken, analyticsController.getTopProductsByRevenue);
router.get('/sales-by-category', verifyToken, analyticsController.getSalesByCategory);
router.get('/product-margins', verifyToken, analyticsController.getProductMargins);
router.get('/category-margins', verifyToken, analyticsController.getCategoryMargins);
router.get('/claim-status', verifyToken, analyticsController.getClaimStatusOverview);
router.get('/claims-by-product', verifyToken, analyticsController.getClaimsByProduct);

module.exports = router;
