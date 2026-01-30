const express = require('express');
const router = express.Router();
const setupController = require('../controllers/setupController');

router.post('/init-tables', setupController.initTables);

module.exports = router;
