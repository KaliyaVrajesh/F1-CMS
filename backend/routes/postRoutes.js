const express = require('express');
const router = express.Router();
const {
  getPosts,
  getPostById,
  createPost,
  updatePost,
  deletePost,
} = require('../controllers/postController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/').get(getPosts).post(protect, admin, createPost);
router
  .route('/:id')
  .get(getPostById)
  .put(protect, admin, updatePost)
  .delete(protect, admin, deletePost);

module.exports = router;
