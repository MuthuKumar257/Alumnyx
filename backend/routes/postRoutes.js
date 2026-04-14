const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getPosts, getPostById, createPost, deletePost, toggleLikePost } = require('../controllers/postController');

router.get('/', protect, getPosts);
router.get('/:id', protect, getPostById);
router.post('/', protect, createPost);
router.delete('/:id', protect, deletePost);
router.post('/:id/like', protect, toggleLikePost);

module.exports = router;
