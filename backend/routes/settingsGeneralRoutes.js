const express = require('express');
const router = express.Router();
const multer = require('multer');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');
const { getGeneralSettings, updateGeneralSettings, uploadAsset } = require('../controllers/settingsGeneralController');

// Use memoryStorage so we can forward the raw buffer to Supabase Storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
});

// GET /api/settings/general  — any authenticated user (sidebar needs company name/logo)
router.get('/', verifyToken, getGeneralSettings);

// PUT /api/settings/general  — admin only
router.put('/', verifyToken, isAdmin, updateGeneralSettings);

// POST /api/settings/general/upload/:asset  — admin only
router.post('/upload/:asset', verifyToken, isAdmin, upload.single('file'), uploadAsset);

module.exports = router;
