const express = require('express');
const router = express.Router();
const {
    getWarrantyConfig,
    upsertWarrantyConfig,
    checkWarrantyStatus,
    getAllClaims,
    getClaimById,
    getHoldingPool,
    createClaim,
    processClaim,
    finaliseDisposition
} = require('../controllers/warrantyController');

// Warranty configuration (per product)
router.get('/config', getWarrantyConfig);
router.post('/config', upsertWarrantyConfig);

// Warranty status check — used by POS alert and claim form
router.get('/check/:inventoryId', checkWarrantyStatus);

// Holding pool — returned items awaiting final disposition
router.get('/holding', getHoldingPool);

// Claims
router.get('/claims', getAllClaims);
router.get('/claims/:id', getClaimById);
router.post('/claims', createClaim);
router.post('/claims/:id/process', processClaim);
router.post('/claims/:id/disposition', finaliseDisposition);

module.exports = router;
