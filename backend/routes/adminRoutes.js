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
router.post('/university/update', updateUniversityConfig);
router.get('/departments', getDepartments);
router.post('/departments', addDepartment);
router.delete('/departments', deleteDepartment);
router.post('/departments/delete', deleteDepartment);
router.post('/departments/assign-admin', assignDepartmentAdmin);
router.get('/stats', getStats);
router.get('/users', getAllUsers);
router.post('/users', createUser);
router.post('/users/bulk', upload.single('file'), bulkCreateUsers);
router.put('/users/:id', updateUserDetails);
router.post('/users/:id/update', updateUserDetails);
router.put('/users/:id/reset-password', resetPassword);
router.post('/users/:id/reset-password', resetPassword);
router.get('/admins', getAdmins);
router.post('/admins', createAdmin);
router.delete('/admins/:id', deleteAdmin);
router.post('/admins/:id/delete', deleteAdmin);
router.get('/alumni', getApprovedAlumni);
router.post('/alumni', createAlumni);
router.post('/alumni/bulk', upload.single('file'), bulkCreateAlumni);
router.get('/alumni/pending', getPendingAlumni);
router.put('/verify-alumni', verifyAlumni);
router.put('/users/:id/verify', verifyAlumni);
router.put('/alumni/verify/:id', verifyAlumni);
router.post('/alumni/verify/:id', verifyAlumni);
router.put('/alumni/reject/:id', rejectAlumni);
router.post('/alumni/reject/:id', rejectAlumni);
router.put('/alumni/bulk-verify', bulkVerifyAlumni);
router.post('/alumni/bulk-verify', bulkVerifyAlumni);
router.put('/alumni/bulk-reject', bulkRejectAlumni);
router.post('/alumni/bulk-reject', bulkRejectAlumni);
router.delete('/users/:id', deleteUser);
router.post('/users/:id/delete', deleteUser);
router.get('/posts', getAllPosts);
router.delete('/posts/:id', deletePost);
router.post('/posts/:id/delete', deletePost);
router.get('/jobs', getAllJobs);
router.delete('/jobs/:id', deleteJob);
router.post('/jobs/:id/delete', deleteJob);
router.get('/mentorships', getAllMentorshipRequests);
router.get('/mentorship', getMentorshipMonitoring);
router.put('/mentorships/:id/status', updateMentorshipStatus);
router.post('/mentorships/:id/status', updateMentorshipStatus);
router.delete('/mentorships/:id', deleteMentorshipRequest);
router.post('/mentorships/:id/delete', deleteMentorshipRequest);
router.get('/logs', getAdminLogs);

module.exports = router;
