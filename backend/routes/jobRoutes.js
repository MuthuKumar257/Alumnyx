const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const { getJobs, getJobById, createJob, deleteJob, applyForJob, getJobApplications } = require('../controllers/jobController');

// GET /api/jobs - browse all jobs (all authenticated users)
router.get('/', protect, getJobs);

// POST /api/jobs/apply - required alias endpoint (jobId in body)
router.post('/apply', protect, applyForJob);

// POST /api/jobs - alumni/admin only
router.post('/', protect, requireRole('ALUMNI', 'ADMIN'), createJob);

// DELETE /api/jobs/:id - poster or admin
router.delete('/:id', protect, deleteJob);

// POST /api/jobs/:id/apply - any authenticated user can apply
router.post('/:id/apply', protect, applyForJob);

// GET /api/jobs/:id/applications - only the job poster or admin
router.get('/:id/applications', protect, getJobApplications);

// GET /api/jobs/:id - job detail
router.get('/:id', protect, getJobById);

module.exports = router;
