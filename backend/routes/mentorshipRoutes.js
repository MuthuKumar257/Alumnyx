const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
    getMentorshipRequests,
    getAvailableMentors,
    createMentorshipRequest,
    updateMentorshipStatus,
    acceptMentorship,
    rejectMentorship,
} = require('../controllers/mentorshipController');

// GET /api/mentorship - get my mentorship requests (as student or mentor)
router.get('/', protect, getMentorshipRequests);

// GET /api/mentorship/mentors - browse available alumni mentors
router.get('/mentors', protect, getAvailableMentors);

// POST /api/mentorship - send a new mentorship request
router.post('/', protect, createMentorshipRequest);
router.post('/request', protect, createMentorshipRequest);

// Required alias endpoints
router.put('/accept', protect, acceptMentorship);
router.put('/reject', protect, rejectMentorship);

// PUT /api/mentorship/:id - accept or reject a request (mentor only)
router.put('/:id', protect, updateMentorshipStatus);

module.exports = router;
