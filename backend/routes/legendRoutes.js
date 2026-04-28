const express = require('express');
const router = express.Router();
const { getLegends, updateLegendImages } = require('../controllers/legendController');
const { protect, admin } = require('../middleware/authMiddleware');

router.get('/', getLegends);
router.put('/:legendId', protect, admin, updateLegendImages);

module.exports = router;
