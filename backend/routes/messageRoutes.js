const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getConversations, getMessages, sendMessage } = require('../controllers/messageController');

// GET /api/messages/conversations - list all conversation partners
router.get('/conversations', protect, getConversations);

// GET /api/messages/:userId - get messages with a specific user
router.get('/:userId', protect, getMessages);

// POST /api/messages - send a message
router.post('/', protect, sendMessage);

module.exports = router;
