const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { adminOnly } = require('../middleware/role');
const { registerUser, alumniRegister, loginUser, getMe, checkEmailExists, bootstrapAdmin } = require('../controllers/authController');

// Public registration is disabled for general users — admins create accounts.
// Alumni can self-register but start in PENDING status until admin approves.
router.post('/register', registerUser);
router.post('/alumni/register', alumniRegister);
router.post('/login', loginUser);
router.post('/bootstrap-admin', bootstrapAdmin);
router.get('/me', protect, getMe);
router.get('/check-email', protect, adminOnly, checkEmailExists);

module.exports = router;
