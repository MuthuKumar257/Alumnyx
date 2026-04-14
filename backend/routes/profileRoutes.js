const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getProfileById, createProfile, updateProfileById } = require('../controllers/profileController');

router.get('/:id', protect, getProfileById);
router.put('/:id', protect, updateProfileById);
router.post('/', protect, createProfile);

module.exports = router;
