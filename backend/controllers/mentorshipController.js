const { v4: uuidv4 } = require('uuid');
const { readJson, queueWrite, readUsers } = require('../storage/jsonStorage');
const { withProfile, sanitizeUser, nowIso, containsCI } = require('../storage/viewHelpers');

const userView = (users, profiles, id) => {
    const user = users.find((u) => u.id === id);
    return user ? sanitizeUser(withProfile(user, profiles)) : null;
};

const getMentorshipRequests = async (req, res) => {
    try {
        const [requests, users, profiles] = await Promise.all([
            readJson('mentorshipRequests'),
            readUsers(),
            readJson('profiles'),
        ]);

        const data = requests
            .filter((r) => r.studentId === req.user.id || r.mentorId === req.user.id)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .map((r) => ({
                ...r,
                student: userView(users, profiles, r.studentId),
                mentor: userView(users, profiles, r.mentorId),
            }));

        res.json(data);
    } catch (error) {
        console.error('GetMentorshipRequests error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getAvailableMentors = async (req, res) => {
    try {
        const { search, company } = req.query;
        const [users, profiles] = await Promise.all([readUsers(), readJson('profiles')]);

        let mentors = users
            .filter((u) => u.role === 'ALUMNI' || u.role === 'ADMIN')
            .map((u) => sanitizeUser(withProfile(u, profiles)));

        if (search) {
            mentors = mentors.filter((m) =>
                containsCI(m.profile?.firstName, search) ||
                containsCI(m.profile?.lastName, search) ||
                containsCI(m.profile?.college, search)
            );
        }
        if (company) mentors = mentors.filter((m) => containsCI(m.profile?.currentCompany, company));

        mentors.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        res.json(mentors);
    } catch (error) {
        console.error('GetAvailableMentors error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const createMentorshipRequest = async (req, res) => {
    try {
        const { mentorId, message } = req.body;
        if (!mentorId) return res.status(400).json({ message: 'mentorId is required' });
        if (mentorId === req.user.id) return res.status(400).json({ message: 'Cannot request mentorship from yourself' });

        const [users, profiles, requests] = await Promise.all([
            readUsers(),
            readJson('profiles'),
            readJson('mentorshipRequests'),
        ]);

        const mentor = users.find((u) => u.id === mentorId);
        if (!mentor) return res.status(404).json({ message: 'Mentor not found' });
        if (mentor.role !== 'ALUMNI' && mentor.role !== 'ADMIN') {
            return res.status(400).json({ message: 'Selected user is not an alumni mentor' });
        }

        const exists = requests.find((r) => r.studentId === req.user.id && r.mentorId === mentorId);
        if (exists) {
            return res.status(400).json({ message: 'You have already sent a mentorship request to this person' });
        }

        const now = nowIso();
        const request = {
            id: uuidv4(),
            studentId: req.user.id,
            mentorId,
            message: message || null,
            status: 'PENDING',
            createdAt: now,
            updatedAt: now,
        };

        await queueWrite('mentorshipRequests', [...requests, request]);
        res.status(201).json({
            ...request,
            student: userView(users, profiles, request.studentId),
            mentor: userView(users, profiles, request.mentorId),
        });
    } catch (error) {
        console.error('CreateMentorshipRequest error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const updateMentorshipStatus = async (req, res) => {
    try {
        const status = String(req.body.status || '').toUpperCase();
        const validStatuses = ['ACCEPTED', 'REJECTED'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: 'Status must be ACCEPTED or REJECTED' });
        }

        const [requests, users, profiles] = await Promise.all([
            readJson('mentorshipRequests'),
            readUsers(),
            readJson('profiles'),
        ]);

        const idx = requests.findIndex((r) => r.id === req.params.id);
        if (idx === -1) return res.status(404).json({ message: 'Mentorship request not found' });
        if (requests[idx].mentorId !== req.user.id) {
            return res.status(403).json({ message: 'Only the mentor can update this request' });
        }

        const updated = { ...requests[idx], status, updatedAt: nowIso() };
        const next = [...requests];
        next[idx] = updated;
        await queueWrite('mentorshipRequests', next);

        res.json({
            ...updated,
            student: userView(users, profiles, updated.studentId),
            mentor: userView(users, profiles, updated.mentorId),
        });
    } catch (error) {
        console.error('UpdateMentorshipStatus error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Required alias endpoints
const acceptMentorship = async (req, res) => {
    req.body.status = 'ACCEPTED';
    req.params.id = req.body.requestId || req.body.id || req.params.id;
    return updateMentorshipStatus(req, res);
};

const rejectMentorship = async (req, res) => {
    req.body.status = 'REJECTED';
    req.params.id = req.body.requestId || req.body.id || req.params.id;
    return updateMentorshipStatus(req, res);
};

module.exports = {
    getMentorshipRequests,
    getAvailableMentors,
    createMentorshipRequest,
    updateMentorshipStatus,
    acceptMentorship,
    rejectMentorship,
};
