const asyncHandler = require('express-async-handler');
const Post = require('../models/Post');

/**
 * @desc    Get all posts
 * @route   GET /api/posts
 * @access  Public
 */
const getPosts = asyncHandler(async (req, res) => {
  const posts = await Post.find().populate('author', 'name email').sort({ createdAt: -1 });
  res.json(posts);
});

/**
 * @desc    Get single post
 * @route   GET /api/posts/:id
 * @access  Public
 */
const getPostById = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id).populate('author', 'name email');

  if (post) {
    res.json(post);
  } else {
    res.status(404);
    throw new Error('Post not found');
  }
});

/**
 * @desc    Create new post
 * @route   POST /api/posts
 * @access  Private/Admin
 */
const createPost = asyncHandler(async (req, res) => {
  const { title, content, imageUrl, imageAlt } = req.body;

  if (!title || !content) {
    res.status(400);
    throw new Error('Please add title and content');
  }

  const post = await Post.create({
    title,
    content,
    imageUrl: imageUrl || '',
    imageAlt: imageAlt || '',
    author: req.user._id,
  });

  const populatedPost = await Post.findById(post._id).populate('author', 'name email');
  res.status(201).json(populatedPost);
});

/**
 * @desc    Update post
 * @route   PUT /api/posts/:id
 * @access  Private/Admin
 */
const updatePost = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id);

  if (!post) {
    res.status(404);
    throw new Error('Post not found');
  }

  const updatedPost = await Post.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  ).populate('author', 'name email');

  res.json(updatedPost);
});

/**
 * @desc    Delete post
 * @route   DELETE /api/posts/:id
 * @access  Private/Admin
 */
const deletePost = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id);

  if (!post) {
    res.status(404);
    throw new Error('Post not found');
  }

  await post.deleteOne();
  res.json({ message: 'Post removed' });
});

module.exports = {
  getPosts,
  getPostById,
  createPost,
  updatePost,
  deletePost,
};
