const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getAlumniList, searchAlumni } = require('../controllers/profileController');

router.get('/', protect, getAlumniList);
router.get('/search', protect, searchAlumni);

module.exports = router;
