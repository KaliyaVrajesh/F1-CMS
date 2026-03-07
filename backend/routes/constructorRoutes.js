const express = require('express');
const router = express.Router();
const {
  getConstructors,
  getConstructorById,
  createConstructor,
  updateConstructor,
  deleteConstructor,
} = require('../controllers/constructorController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/').get(getConstructors).post(protect, admin, createConstructor);
router
  .route('/:id')
  .get(getConstructorById)
  .put(protect, admin, updateConstructor)
  .delete(protect, admin, deleteConstructor);

module.exports = router;
