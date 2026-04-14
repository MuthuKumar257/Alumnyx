const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { alumniRegister, loginUser, getMe } = require('../controllers/authController');

// Public registration is disabled for general users — admins create accounts.
// Alumni can self-register but start in PENDING status until admin approves.
router.post('/alumni/register', alumniRegister);
router.post('/login', loginUser);
router.get('/me', protect, getMe);

module.exports = router;
