const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const { readJson, queueWrite, readUsers, getUniversityName, setUniversityName } = require('../storage/jsonStorage');
const { withProfile, sanitizeUser, nowIso, containsCI } = require('../storage/viewHelpers');

const DEPARTMENTS = ['CSE', 'IT', 'ECE', 'EEE', 'MECH', 'AIDS', 'CSBS'];

const normalizeDepartment = (value) => {
    if (value == null || value === '') return null;
    const normalized = String(value).trim().toUpperCase();
    if (!DEPARTMENTS.includes(normalized)) return null;
    return normalized;
};

const validateGraduationYear = (value) => {
    if (value == null || value === '') return null;
    const year = parseInt(String(value), 10);
    if (Number.isNaN(year) || year < 1990 || year > 2100) return null;
    return year;
};

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

const isConnectedPair = (connections, userA, userB) =>
    connections.some(
        (c) =>
            (c.userId === userA && c.connectionId === userB) ||
            (c.userId === userB && c.connectionId === userA)
    );

const buildRecentActivities = (userId, posts, messages, jobApplications, connections) => {
    const rows = [];

    posts
        .filter((p) => p.authorId === userId)
        .forEach((p) => {
            rows.push({
                id: `post-${p.id}`,
                type: 'post',
                title: 'Achievement post created',
                subtitle: p.content,
                createdAt: p.createdAt,
            });
        });

    messages
        .filter((m) => m.senderId === userId || m.receiverId === userId)
        .forEach((m) => {
            rows.push({
                id: `message-${m.id}`,
                type: 'message',
                title: m.senderId === userId ? 'Message sent' : 'Message received',
                subtitle: m.content,
                createdAt: m.createdAt,
            });
        });

    jobApplications
        .filter((a) => a.applicantId === userId)
        .forEach((a) => {
            rows.push({
                id: `job-application-${a.id}`,
                type: 'job_application',
                title: 'Applied to a job',
                subtitle: `Application status: ${a.status}`,
                createdAt: a.createdAt,
            });
        });

    connections
        .filter((c) => c.userId === userId)
        .forEach((c) => {
            rows.push({
                id: `connection-${c.id}`,
                type: 'connection',
                title: 'New connection added',
                subtitle: 'You connected with another user',
                createdAt: c.createdAt,
            });
        });

    return rows
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 12);
};

const getUsers = async (req, res) => {
    try {
        const { role, search, company, graduationYear } = req.query;
        const users = await readUsers();
        const profiles = await readJson('profiles');

        let filtered = users.map((u) => withProfile(u, profiles));

        if (role) {
            filtered = filtered.filter((u) => u.role === String(role).toUpperCase());
        }
        if (search) {
            filtered = filtered.filter((u) =>
                containsCI(u.profile?.firstName, search) ||
                containsCI(u.profile?.lastName, search) ||
                containsCI(u.profile?.college, search) ||
                containsCI(u.email, search)
            );
        }
        if (company) {
            filtered = filtered.filter((u) => containsCI(u.profile?.currentCompany, company));
        }
        if (graduationYear) {
            filtered = filtered.filter((u) => String(u.profile?.graduationYear || '') === String(graduationYear));
        }

        filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        res.json(filtered.map(sanitizeUser));
    } catch (error) {
        console.error('GetUsers error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getUserById = async (req, res) => {
    try {
        const users = await readUsers();
        const profiles = await readJson('profiles');
        const user = users.find((u) => u.id === req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(sanitizeUser(withProfile(user, profiles)));
    } catch (error) {
        console.error('GetUserById error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const updateProfile = async (req, res) => {
    try {
        const profiles = await readJson('profiles');
        const users = await readUsers();
        let universityName = await getUniversityName();

        const existingUser = users.find((u) => u.id === req.user.id);
        if (!existingUser) return res.status(404).json({ message: 'User not found' });

        const idx = profiles.findIndex((p) => p.userId === req.user.id);
        const current = idx >= 0
            ? profiles[idx]
            : {
                id: uuidv4(),
                userId: req.user.id,
                firstName: '',
                lastName: '',
                college: universityName,
                department: null,
                graduationYear: null,
                skills: [],
                currentCompany: null,
                bio: null,
                profilePicture: null,
                resumeUrl: null,
                createdAt: nowIso(),
            };

        if (Object.prototype.hasOwnProperty.call(req.body, 'college') && req.user?.isSuperAdmin) {
            try {
                universityName = await setUniversityName(req.body.college);
            } catch (error) {
                if (error?.code === 'UNIVERSITY_NAME_LOCKED') {
                    return res.status(409).json({ message: 'University name is already set and cannot be edited' });
                }
                throw error;
            }
        }

        if (req.body.department !== undefined && req.body.department !== null && req.body.department !== '') {
            const department = normalizeDepartment(req.body.department);
            if (!department) {
                return res.status(400).json({ message: `Department must be one of: ${DEPARTMENTS.join(', ')}` });
            }
        }

        if (req.body.graduationYear !== undefined && req.body.graduationYear !== null && req.body.graduationYear !== '') {
            const year = validateGraduationYear(req.body.graduationYear);
            if (!year) {
                return res.status(400).json({ message: 'Graduation year must be a valid year between 1990 and 2100' });
            }
        }

        const updated = {
            ...current,
            firstName: req.body.firstName !== undefined ? req.body.firstName : current.firstName,
            lastName: req.body.lastName !== undefined ? req.body.lastName : current.lastName,
            college: universityName,
            department: req.body.department !== undefined
                ? normalizeDepartment(req.body.department)
                : current.department,
            graduationYear: req.body.graduationYear !== undefined
                ? validateGraduationYear(req.body.graduationYear)
                : current.graduationYear,
            skills: req.body.skills !== undefined
                ? (Array.isArray(req.body.skills)
                    ? req.body.skills
                    : String(req.body.skills).split(',').map((s) => s.trim()).filter(Boolean))
                : current.skills,
            currentCompany: req.body.currentCompany !== undefined ? req.body.currentCompany : current.currentCompany,
            bio: req.body.bio !== undefined ? req.body.bio : current.bio,
            profilePicture: req.body.profilePicture !== undefined ? req.body.profilePicture : current.profilePicture,
            resumeUrl: req.body.resumeUrl !== undefined ? req.body.resumeUrl : current.resumeUrl,
            updatedAt: nowIso(),
        };

        const nextProfiles = [...profiles];
        if (idx >= 0) nextProfiles[idx] = updated;
        else nextProfiles.push(updated);

        await queueWrite('profiles', nextProfiles);
        res.json({ ...updated, name: `${updated.firstName} ${updated.lastName}`.trim() });
    } catch (error) {
        console.error('UpdateProfile error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getDashboard = async (req, res) => {
    try {
        const [users, profiles, posts, messages, jobApplications, connections, savedJobs] = await Promise.all([
            readUsers(),
            readJson('profiles'),
            readJson('posts'),
            readJson('messages'),
            readJson('jobApplications'),
            readJson('connections'),
            readJson('savedJobs'),
        ]);

        const user = users.find((u) => u.id === req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const profile = profiles.find((p) => p.userId === req.user.id) || null;
        const recentActivities = buildRecentActivities(req.user.id, posts, messages, jobApplications, connections);

        const myConnections = connections.filter((c) => c.userId === req.user.id);
        const mySaved = savedJobs.filter((s) => s.userId === req.user.id);

        res.json({
            overview: {
                id: user.id,
                name: `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim() || user.email,
                email: user.email,
                role: user.role,
                college: profile?.college || null,
                graduationYear: profile?.graduationYear || null,
                department: profile?.department || null,
                profileImage: profile?.profilePicture || null,
                resumeUrl: profile?.resumeUrl || null,
                bio: profile?.bio || null,
                skills: Array.isArray(profile?.skills) ? profile.skills : [],
                connectionsCount: myConnections.length,
                savedJobsCount: mySaved.length,
                applicationsCount: jobApplications.filter((a) => a.applicantId === req.user.id).length,
            },
            recentActivities,
            quickAccess: [
                { key: 'profile', label: 'Profile' },
                { key: 'connections', label: 'My Connections' },
                { key: 'jobs', label: 'Jobs & Internships' },
                { key: 'messages', label: 'Chat' },
                { key: 'achievements', label: 'Achievement Posts' },
            ],
        });
    } catch (error) {
        console.error('GetDashboard error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getConnections = async (req, res) => {
    try {
        const [connections, users, profiles] = await Promise.all([
            readJson('connections'),
            readUsers(),
            readJson('profiles'),
        ]);

        const list = connections
            .filter((c) => c.userId === req.user.id)
            .map((c) => {
                const connectionUser = users.find((u) => u.id === c.connectionId);
                if (!connectionUser) return null;
                return {
                    id: c.id,
                    connectedAt: c.createdAt,
                    user: sanitizeUser(withProfile(connectionUser, profiles)),
                };
            })
            .filter(Boolean);

        res.json(list);
    } catch (error) {
        console.error('GetConnections error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getConnectionRequests = async (req, res) => {
    try {
        const [requests, users, profiles] = await Promise.all([
            readJson('connectionRequests'),
            readUsers(),
            readJson('profiles'),
        ]);

        const incoming = requests
            .filter((r) => r.receiverId === req.user.id && r.status === 'PENDING')
            .map((r) => {
                const requester = users.find((u) => u.id === r.requesterId);
                return {
                    ...r,
                    requester: requester ? sanitizeUser(withProfile(requester, profiles)) : null,
                };
            })
            .filter((r) => r.requester)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        const outgoing = requests
            .filter((r) => r.requesterId === req.user.id && r.status === 'PENDING')
            .map((r) => {
                const receiver = users.find((u) => u.id === r.receiverId);
                return {
                    ...r,
                    receiver: receiver ? sanitizeUser(withProfile(receiver, profiles)) : null,
                };
            })
            .filter((r) => r.receiver)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.json({ incoming, outgoing });
    } catch (error) {
        console.error('GetConnectionRequests error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const addConnection = async (req, res) => {
    try {
        const targetUserId = req.params.targetUserId;
        if (!targetUserId) return res.status(400).json({ message: 'targetUserId is required' });
        if (targetUserId === req.user.id) return res.status(400).json({ message: 'You cannot connect with yourself' });

        const [connections, users, profiles, requests] = await Promise.all([
            readJson('connections'),
            readUsers(),
            readJson('profiles'),
            readJson('connectionRequests'),
        ]);

        const target = users.find((u) => u.id === targetUserId);
        if (!target) return res.status(404).json({ message: 'User not found' });

        const alreadyConnected = isConnectedPair(connections, req.user.id, targetUserId);
        if (alreadyConnected) return res.status(400).json({ message: 'Connection already exists' });

        const outgoingPending = requests.find(
            (r) =>
                r.requesterId === req.user.id &&
                r.receiverId === targetUserId &&
                r.status === 'PENDING'
        );
        if (outgoingPending) {
            return res.status(400).json({ message: 'Connection request already sent' });
        }

        const incomingPending = requests.find(
            (r) =>
                r.requesterId === targetUserId &&
                r.receiverId === req.user.id &&
                r.status === 'PENDING'
        );

        const now = nowIso();
        if (incomingPending) {
            const nextConnections = [
                ...connections,
                { id: uuidv4(), userId: req.user.id, connectionId: targetUserId, createdAt: now, updatedAt: now },
                { id: uuidv4(), userId: targetUserId, connectionId: req.user.id, createdAt: now, updatedAt: now },
            ];

            const nextRequests = requests.map((r) =>
                r.id === incomingPending.id ? { ...r, status: 'ACCEPTED', updatedAt: now } : r
            );

            await Promise.all([
                queueWrite('connections', nextConnections),
                queueWrite('connectionRequests', nextRequests),
            ]);

            return res.status(201).json({
                message: 'Connection request accepted and connection added successfully',
                user: sanitizeUser(withProfile(target, profiles)),
            });
        }

        const request = {
            id: uuidv4(),
            requesterId: req.user.id,
            receiverId: targetUserId,
            status: 'PENDING',
            createdAt: now,
            updatedAt: now,
            seenByReceiver: false,
            actionBy: null,
            actionAt: null,
        };

        const nextRequests = [
            ...requests,
            request,
        ];

        await queueWrite('connectionRequests', nextRequests);
        res.status(201).json({
            message: 'Connection request sent',
            request,
            user: sanitizeUser(withProfile(target, profiles)),
        });
    } catch (error) {
        console.error('AddConnection error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const respondConnectionRequest = async (req, res) => {
    try {
        const requestId = req.params.requestId;
        const action = String(req.body?.action || '').toUpperCase();
        if (!requestId) return res.status(400).json({ message: 'requestId is required' });
        if (!['ACCEPT', 'REJECT'].includes(action)) {
            return res.status(400).json({ message: 'action must be ACCEPT or REJECT' });
        }

        const [requests, connections, users, profiles] = await Promise.all([
            readJson('connectionRequests'),
            readJson('connections'),
            readUsers(),
            readJson('profiles'),
        ]);

        const idx = requests.findIndex((r) => r.id === requestId);
        if (idx === -1) return res.status(404).json({ message: 'Connection request not found' });

        const request = requests[idx];
        if (request.receiverId !== req.user.id) {
            return res.status(403).json({ message: 'You are not allowed to respond to this request' });
        }
        if (request.status !== 'PENDING') {
            return res.status(400).json({ message: `Request already ${String(request.status || '').toLowerCase()}` });
        }

        const now = nowIso();
        const updatedRequest = {
            ...request,
            status: action === 'ACCEPT' ? 'ACCEPTED' : 'REJECTED',
            updatedAt: now,
            seenByReceiver: true,
            actionBy: req.user.id,
            actionAt: now,
        };

        const nextRequests = [...requests];
        nextRequests[idx] = updatedRequest;

        if (action === 'ACCEPT' && !isConnectedPair(connections, request.requesterId, request.receiverId)) {
            const nextConnections = [
                ...connections,
                { id: uuidv4(), userId: request.requesterId, connectionId: request.receiverId, createdAt: now, updatedAt: now },
                { id: uuidv4(), userId: request.receiverId, connectionId: request.requesterId, createdAt: now, updatedAt: now },
            ];
            await Promise.all([
                queueWrite('connectionRequests', nextRequests),
                queueWrite('connections', nextConnections),
            ]);
        } else {
            await queueWrite('connectionRequests', nextRequests);
        }

        const otherUser = users.find((u) => u.id === request.requesterId);
        res.json({
            message: action === 'ACCEPT' ? 'Connection request accepted' : 'Connection request rejected',
            request: {
                ...updatedRequest,
                requester: otherUser ? sanitizeUser(withProfile(otherUser, profiles)) : null,
            },
        });
    } catch (error) {
        console.error('RespondConnectionRequest error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const removeConnection = async (req, res) => {
    try {
        const targetUserId = req.params.targetUserId;
        if (!targetUserId) return res.status(400).json({ message: 'targetUserId is required' });

        const connections = await readJson('connections');
        const next = connections.filter(
            (c) => !(
                (c.userId === req.user.id && c.connectionId === targetUserId) ||
                (c.userId === targetUserId && c.connectionId === req.user.id)
            )
        );

        await queueWrite('connections', next);
        res.json({ message: 'Connection removed successfully' });
    } catch (error) {
        console.error('RemoveConnection error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getSavedJobs = async (req, res) => {
    try {
        const [savedJobs, jobs, users, profiles, applications] = await Promise.all([
            readJson('savedJobs'),
            readJson('jobs'),
            readUsers(),
            readJson('profiles'),
            readJson('jobApplications'),
        ]);

        const jobIds = new Set(
            savedJobs
                .filter((s) => s.userId === req.user.id)
                .map((s) => s.jobId)
        );

        const data = jobs
            .filter((j) => jobIds.has(j.id))
            .map((j) => enrichJob(j, users, profiles, applications));

        res.json(data);
    } catch (error) {
        console.error('GetSavedJobs error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const saveJob = async (req, res) => {
    try {
        const jobId = req.params.jobId;
        if (!jobId) return res.status(400).json({ message: 'jobId is required' });

        const [savedJobs, jobs] = await Promise.all([readJson('savedJobs'), readJson('jobs')]);
        const job = jobs.find((j) => j.id === jobId);
        if (!job) return res.status(404).json({ message: 'Job not found' });

        const exists = savedJobs.find((s) => s.userId === req.user.id && s.jobId === jobId);
        if (exists) return res.status(400).json({ message: 'Job already saved' });

        const now = nowIso();
        const entry = { id: uuidv4(), userId: req.user.id, jobId, createdAt: now, updatedAt: now };
        await queueWrite('savedJobs', [...savedJobs, entry]);

        res.status(201).json({ message: 'Job saved successfully' });
    } catch (error) {
        console.error('SaveJob error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const unsaveJob = async (req, res) => {
    try {
        const jobId = req.params.jobId;
        if (!jobId) return res.status(400).json({ message: 'jobId is required' });

        const savedJobs = await readJson('savedJobs');
        const next = savedJobs.filter((s) => !(s.userId === req.user.id && s.jobId === jobId));
        await queueWrite('savedJobs', next);

        res.json({ message: 'Saved job removed successfully' });
    } catch (error) {
        console.error('UnsaveJob error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getMyAchievementPosts = async (req, res) => {
    try {
        const posts = await readJson('posts');
        const data = posts
            .filter((p) => p.authorId === req.user.id)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .map((p) => ({
                id: p.id,
                userId: p.authorId,
                image: p.mediaUrl || null,
                description: p.content,
                createdAt: p.createdAt,
                updatedAt: p.updatedAt,
            }));

        res.json(data);
    } catch (error) {
        console.error('GetMyAchievementPosts error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const createAchievementPost = async (req, res) => {
    try {
        const description = String(req.body.description || '').trim();
        const image = req.body.image || null;
        if (!image) {
            return res.status(400).json({ message: 'Image is required' });
        }

        const posts = await readJson('posts');
        const now = nowIso();
        const post = {
            id: uuidv4(),
            authorId: req.user.id,
            content: description || 'New post',
            mediaUrl: image,
            likes: [],
            createdAt: now,
            updatedAt: now,
        };

        await queueWrite('posts', [...posts, post]);

        res.status(201).json({
            id: post.id,
            userId: post.authorId,
            image: post.mediaUrl,
            description: post.content,
            createdAt: post.createdAt,
            updatedAt: post.updatedAt,
        });
    } catch (error) {
        console.error('CreateAchievementPost error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body || {};
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'currentPassword and newPassword are required' });
        }
        if (String(newPassword).length < 8) {
            return res.status(400).json({ message: 'New password must be at least 8 characters long' });
        }

        const users = await readUsers();
        const idx = users.findIndex((u) => u.id === req.user.id);
        if (idx === -1) return res.status(404).json({ message: 'User not found' });

        const user = users[idx];
        const ok = await bcrypt.compare(String(currentPassword), String(user.password || ''));
        if (!ok) {
            return res.status(401).json({ message: 'Current password is incorrect' });
        }

        const hashed = await bcrypt.hash(String(newPassword), 10);
        const updated = { ...user, password: hashed, updatedAt: nowIso() };
        const nextUsers = [...users];
        nextUsers[idx] = updated;
        await queueWrite('users', nextUsers);

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('ChangePassword error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
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
};
