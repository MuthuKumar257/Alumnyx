const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
	getUsers,
	getUserById,
	updateProfile,
	getDashboard,
	getConnections,
	getConnectionRequests,
	addConnection,
	respondConnectionRequest,
	removeConnection,
	getSavedJobs,
	saveJob,
	unsaveJob,
	getMyAchievementPosts,
	createAchievementPost,
	changePassword,
} = require('../controllers/userController');

// GET /api/users?role=ALUMNI&search=...&company=...&graduationYear=...
router.get('/', protect, getUsers);
router.get('/dashboard', protect, getDashboard);
router.get('/connections', protect, getConnections);
router.get('/connections/requests', protect, getConnectionRequests);
router.post('/connections/:targetUserId', protect, addConnection);
router.put('/connections/requests/:requestId', protect, respondConnectionRequest);
router.delete('/connections/:targetUserId', protect, removeConnection);
router.get('/saved-jobs', protect, getSavedJobs);
router.post('/saved-jobs/:jobId', protect, saveJob);
router.delete('/saved-jobs/:jobId', protect, unsaveJob);
router.put('/change-password', protect, changePassword);
router.get('/achievement-posts', protect, getMyAchievementPosts);
router.post('/achievement-posts', protect, createAchievementPost);
router.get('/:id', protect, getUserById);
router.put('/profile', protect, updateProfile);

module.exports = router;
