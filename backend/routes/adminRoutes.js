const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect } = require('../middleware/auth');
const { adminOnly } = require('../middleware/role');
const {
    getUniversityConfig,
    updateUniversityConfig,
    getDepartments,
    addDepartment,
    deleteDepartment,
    assignDepartmentAdmin,
    getDepartmentAdmins,
    getAllUsers,
    getAdmins,
    createUser,
    createAdmin,
    createAlumni,
    verifyAlumni,
    getPendingAlumni,
    getApprovedAlumni,
    rejectAlumni,
    bulkVerifyAlumni,
    bulkRejectAlumni,
    deleteUser,
    resetPassword,
    updateUserDetails,
    bulkCreateUsers,
    bulkCreateAlumni,
    getAllPosts,
    deletePost,
    getAllJobs,
    deleteJob,
    getAdminLogs,
    getStats,
    getAllMentorshipRequests,
    getMentorshipMonitoring,
    deleteMentorshipRequest,
    updateMentorshipStatus,
    deleteAdmin,
} = require('../controllers/adminController');
router.get('/departments-admins', getDepartmentAdmins);

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// All admin routes require authentication AND admin role
router.use(protect, adminOnly);

router.get('/university', getUniversityConfig);
router.put('/university', updateUniversityConfig);
router.get('/departments', getDepartments);
router.post('/departments', addDepartment);
router.delete('/departments', deleteDepartment);
router.post('/departments/assign-admin', assignDepartmentAdmin);
router.get('/stats', getStats);
router.get('/users', getAllUsers);
router.post('/users', createUser);
router.post('/users/bulk', upload.single('file'), bulkCreateUsers);
router.put('/users/:id', updateUserDetails);
router.put('/users/:id/reset-password', resetPassword);
router.get('/admins', getAdmins);
router.post('/admins', createAdmin);
router.delete('/admins/:id', deleteAdmin);
router.get('/alumni', getApprovedAlumni);
router.post('/alumni', createAlumni);
router.post('/alumni/bulk', upload.single('file'), bulkCreateAlumni);
router.get('/alumni/pending', getPendingAlumni);
router.put('/verify-alumni', verifyAlumni);
router.put('/users/:id/verify', verifyAlumni);
router.put('/alumni/verify/:id', verifyAlumni);
router.put('/alumni/reject/:id', rejectAlumni);
router.put('/alumni/bulk-verify', bulkVerifyAlumni);
router.put('/alumni/bulk-reject', bulkRejectAlumni);
router.delete('/users/:id', deleteUser);
router.get('/posts', getAllPosts);
router.delete('/posts/:id', deletePost);
router.get('/jobs', getAllJobs);
router.delete('/jobs/:id', deleteJob);
router.get('/mentorships', getAllMentorshipRequests);
router.get('/mentorship', getMentorshipMonitoring);
router.put('/mentorships/:id/status', updateMentorshipStatus);
router.delete('/mentorships/:id', deleteMentorshipRequest);
router.get('/logs', getAdminLogs);

module.exports = router;
