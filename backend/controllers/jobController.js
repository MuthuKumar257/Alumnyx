const { v4: uuidv4 } = require('uuid');
const { readJson, queueWrite, readUsers } = require('../storage/jsonStorage');
const { withProfile, sanitizeUser, nowIso, containsCI } = require('../storage/viewHelpers');

const enrichJob = (job, users, profiles, applications) => {
    const poster = users.find((u) => u.id === job.posterId);
    return {
        ...job,
        poster: poster ? sanitizeUser(withProfile(poster, profiles)) : null,
        applications: applications
            .filter((a) => a.jobId === job.id)
            .map((a) => ({ id: a.id, applicantId: a.applicantId, status: a.status })),
    };
};

const getJobs = async (req, res) => {
    try {
        const { search, company, location } = req.query;
        const [jobs, users, profiles, applications] = await Promise.all([
            readJson('jobs'),
            readUsers(),
            readJson('profiles'),
            readJson('jobApplications'),
        ]);

        let filtered = [...jobs];
        if (search) {
            filtered = filtered.filter((j) =>
                containsCI(j.title, search) || containsCI(j.company, search) || containsCI(j.description, search)
            );
        }
        if (company) filtered = filtered.filter((j) => containsCI(j.company, company));
        if (location) filtered = filtered.filter((j) => containsCI(j.location, location));

        filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        res.json(filtered.map((job) => enrichJob(job, users, profiles, applications)));
    } catch (error) {
        console.error('GetJobs error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getJobById = async (req, res) => {
    try {
        const [jobs, users, profiles, applications] = await Promise.all([
            readJson('jobs'),
            readUsers(),
            readJson('profiles'),
            readJson('jobApplications'),
        ]);
        const job = jobs.find((j) => j.id === req.params.id);
        if (!job) return res.status(404).json({ message: 'Job not found' });
        res.json(enrichJob(job, users, profiles, applications));
    } catch (error) {
        console.error('GetJobById error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const createJob = async (req, res) => {
    try {
        const { title, company, location, description, requirements, salary } = req.body;
        if (!title || !company || !description) {
            return res.status(400).json({ message: 'Title, company, and description are required' });
        }

        const [jobs, users, profiles, applications] = await Promise.all([
            readJson('jobs'),
            readUsers(),
            readJson('profiles'),
            readJson('jobApplications'),
        ]);

        const now = nowIso();
        const job = {
            id: uuidv4(),
            title,
            company,
            location: location || null,
            description,
            requirements: requirements || null,
            salary: salary || null,
            posterId: req.user.id,
            createdAt: now,
            updatedAt: now,
        };

        await queueWrite('jobs', [...jobs, job]);
        res.status(201).json(enrichJob(job, users, profiles, applications));
    } catch (error) {
        console.error('CreateJob error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const deleteJob = async (req, res) => {
    try {
        const [jobs, applications] = await Promise.all([readJson('jobs'), readJson('jobApplications')]);
        const idx = jobs.findIndex((j) => j.id === req.params.id);
        if (idx === -1) return res.status(404).json({ message: 'Job not found' });

        const job = jobs[idx];
        if (job.posterId !== req.user.id && req.user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Not authorized to delete this job' });
        }

        const nextJobs = jobs.filter((j) => j.id !== req.params.id);
        const nextApplications = applications.filter((a) => a.jobId !== req.params.id);
        await queueWrite('jobs', nextJobs);
        await queueWrite('jobApplications', nextApplications);

        res.json({ message: 'Job deleted successfully' });
    } catch (error) {
        console.error('DeleteJob error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const applyForJob = async (req, res) => {
    try {
        const jobId = req.params.id || req.body.jobId;
        const {
            coverNote,
            fullName,
            email,
            phone,
            resumeUrl,
            portfolioUrl,
            linkedInUrl,
        } = req.body;
        if (!jobId) return res.status(400).json({ message: 'jobId is required' });

        const [jobs, applications, users, profiles] = await Promise.all([
            readJson('jobs'),
            readJson('jobApplications'),
            readUsers(),
            readJson('profiles'),
        ]);
        const job = jobs.find((j) => j.id === jobId);
        if (!job) return res.status(404).json({ message: 'Job not found' });
        if (job.posterId === req.user.id) {
            return res.status(400).json({ message: 'You cannot apply to your own job posting' });
        }

        const applicant = users.find((u) => u.id === req.user.id);
        if (!applicant) {
            return res.status(404).json({ message: 'Applicant account not found' });
        }

        const applicantProfile = profiles.find((p) => p.userId === req.user.id);
        if (!applicantProfile) {
            return res.status(400).json({ message: 'Complete your profile before applying to jobs' });
        }

        const isVerifiedApplicant = Boolean(applicant.isVerified);
        if (!isVerifiedApplicant) {
            return res.status(403).json({ message: 'Your account must be verified before applying for jobs' });
        }

        if (
            String(applicant.role || '').toUpperCase() === 'ALUMNI' &&
            !['APPROVED', 'VERIFIED'].includes(String(applicant.alumniStatus || '').toUpperCase())
        ) {
            return res.status(403).json({ message: 'Your alumni account is not approved yet' });
        }

        const profileRequired = [
            { key: 'firstName', label: 'first name' },
            { key: 'lastName', label: 'last name' },
            { key: 'college', label: 'college' },
            { key: 'department', label: 'department' },
            { key: 'graduationYear', label: 'graduation year' },
            { key: 'resumeUrl', label: 'resume URL' },
        ];
        const missingFields = profileRequired
            .filter((f) => {
                const value = applicantProfile[f.key];
                if (value === null || value === undefined) return true;
                if (typeof value === 'string' && !value.trim()) return true;
                return false;
            })
            .map((f) => f.label);
        if (missingFields.length) {
            return res.status(400).json({ message: `Complete profile before applying. Missing: ${missingFields.join(', ')}` });
        }

        const existing = applications.find((a) => a.jobId === jobId && a.applicantId === req.user.id);
        if (existing) return res.status(400).json({ message: 'You have already applied to this job' });

        const normalizedEmail = String(applicant.email || email || '').trim();
        const normalizedFullName = `${String(applicantProfile.firstName || '').trim()} ${String(applicantProfile.lastName || '').trim()}`.trim();
        const hasEnhancedFormInput = [fullName, email, phone, resumeUrl, portfolioUrl, linkedInUrl].some((v) => v !== undefined);
        if (hasEnhancedFormInput) {
            if (!normalizedFullName || !normalizedEmail) {
                return res.status(400).json({ message: 'Full name and email are required' });
            }
            if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
                return res.status(400).json({ message: 'Please provide a valid email address' });
            }
        }

        const now = nowIso();
        const application = {
            id: uuidv4(),
            jobId,
            applicantId: req.user.id,
            coverNote: coverNote || null,
            fullName: normalizedFullName || null,
            email: normalizedEmail || null,
            phone: String(phone || '').trim() || null,
            resumeUrl: String(applicantProfile.resumeUrl || resumeUrl || '').trim() || null,
            portfolioUrl: String(portfolioUrl || '').trim() || null,
            linkedInUrl: String(linkedInUrl || '').trim() || null,
            status: 'PENDING',
            createdAt: now,
            updatedAt: now,
        };

        await queueWrite('jobApplications', [...applications, application]);
        res.status(201).json({ message: 'Application submitted successfully', application });
    } catch (error) {
        console.error('ApplyForJob error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getJobApplications = async (req, res) => {
    try {
        const [jobs, applications, users, profiles] = await Promise.all([
            readJson('jobs'),
            readJson('jobApplications'),
            readUsers(),
            readJson('profiles'),
        ]);

        const job = jobs.find((j) => j.id === req.params.id);
        if (!job) return res.status(404).json({ message: 'Job not found' });
        if (job.posterId !== req.user.id && req.user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const data = applications
            .filter((a) => a.jobId === req.params.id)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .map((a) => {
                const applicant = users.find((u) => u.id === a.applicantId);
                return {
                    ...a,
                    applicant: applicant ? sanitizeUser(withProfile(applicant, profiles)) : null,
                };
            });

        res.json(data);
    } catch (error) {
        console.error('GetJobApplications error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { getJobs, getJobById, createJob, deleteJob, applyForJob, getJobApplications };
