const getDepartmentAdmins = async (req, res) => {
    try {
        const deptAdmins = await readDepartmentAdmins();
        res.json(deptAdmins);
    } catch (error) {
        console.error('Admin getDepartmentAdmins error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { readJson, queueWrite, readUsers, readStudents, readAdmins, readAlumni, writeUsers, getUniversityName, setUniversityName, isUniversityNameLocked } = require('../storage/jsonStorage');
const { withProfile, sanitizeUser, nowIso } = require('../storage/viewHelpers');

const normalizeRole = (role) => {
    const value = String(role || '').toUpperCase();
    if (['STUDENT', 'ALUMNI', 'ADMIN'].includes(value)) return value;
    return 'STUDENT';
};

const SUPER_ADMIN_EMAILS = ['admin@alumnyx.com', 'superadmin@alumnyx.com'];
const isSuperAdminUser = (user) => Boolean(user?.isSuperAdmin || SUPER_ADMIN_EMAILS.includes(String(user?.email || '').toLowerCase()));
const DEFAULT_PASSWORDS = { STUDENT: 'student@123', ALUMNI: 'alumin@123', ADMIN: 'admin@123' };
const DEFAULT_DEPARTMENTS = ['cse', 'it', 'ece', 'eee', 'mech', 'aids', 'csbs'];
const DEPARTMENT_ADMINS_FILE = 'departments_admins';
const readDepartmentAdmins = async () => await readJson(DEPARTMENT_ADMINS_FILE);
const writeDepartmentAdmins = async (data) => await queueWrite(DEPARTMENT_ADMINS_FILE, data);

const getAdminDepartment = async (adminId) => {
    const deptAdmins = await readDepartmentAdmins();
    for (const [dept, adminIdInDept] of Object.entries(deptAdmins)) {
        if (adminIdInDept === adminId) return dept;
    }
    return null;
};

const logAdminAction = async (adminId, action, targetId = null, metadata = null) => {
    try {
        const logs = await readJson('adminLogs');
        logs.push({
            id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
            adminId,
            action,
            targetId,
            metadata,
            createdAt: nowIso(),
        });
        await queueWrite('adminLogs', logs);
    } catch (error) {
        // Logging must never break the user-facing admin action.
        console.warn('Admin log write skipped:', error?.message || error);
    }
};

const getDepartments = async (req, res) => {
    try {
        const [storedDepartments, profiles] = await Promise.all([readJson('departments'), readJson('profiles')]);

        const normalizedStored = storedDepartments
            .map((d) => String(d || '').trim().toLowerCase())
            .filter(Boolean);

        if (normalizedStored.length > 0) {
            return res.json([...new Set(normalizedStored)].sort());
        }

        const profileDepartments = profiles
            .map((p) => String(p?.department || '').trim().toLowerCase())
            .filter(Boolean);

        const merged = [...new Set([...DEFAULT_DEPARTMENTS, ...profileDepartments])].sort();
        await queueWrite('departments', merged);
        res.json(merged);
    } catch (error) {
        console.error('Admin getDepartments error:', error);
        res.status(200).json(DEFAULT_DEPARTMENTS);
    }
};

const getUniversityConfig = async (req, res) => {
    try {
        const [universityName, locked] = await Promise.all([
            getUniversityName(),
            isUniversityNameLocked(),
        ]);
        res.json({ universityName, locked });
    } catch (error) {
        console.error('Admin getUniversityConfig error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const updateUniversityConfig = async (req, res) => {
    try {
        if (!isSuperAdminUser(req.user)) {
            return res.status(403).json({ message: 'Only Super Admin can update university name' });
        }

        const value = String(req.body?.universityName || '').trim();
        if (!value) return res.status(400).json({ message: 'universityName is required' });

        const universityName = await setUniversityName(value, { allowLockedUpdate: true });
        await logAdminAction(req.user.id, 'UPDATE_UNIVERSITY_NAME', null, universityName);
        res.json({ message: 'University name set successfully', universityName, locked: true });
    } catch (error) {
        if (error?.code === 'UNIVERSITY_NAME_LOCKED') {
            return res.status(409).json({ message: 'University name is already set and cannot be edited' });
        }
        console.error('Admin updateUniversityConfig error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const addDepartment = async (req, res) => {
    try {
        if (!isSuperAdminUser(req.user)) {
            return res.status(403).json({ message: 'Only Super Admin can add departments' });
        }

        const nameRaw = String(req.body?.name || '').trim().toLowerCase();
        if (!nameRaw) return res.status(400).json({ message: 'Department name is required' });

        const name = nameRaw.replace(/\s+/g, '');
        if (!/^[a-z0-9]{2,20}$/.test(name)) {
            return res.status(400).json({ message: 'Department must be 2-20 chars (letters/numbers only)' });
        }

        const departments = await readJson('departments');
        const normalized = departments.map((d) => String(d || '').trim().toLowerCase()).filter(Boolean);

        if (normalized.includes(name)) {
            return res.status(400).json({ message: 'Department already exists' });
        }

        const nextDepartments = [...new Set([...normalized, name])].sort();
        await queueWrite('departments', nextDepartments);
        // Add department to department_admins file
        const deptAdmins = await readDepartmentAdmins();
        deptAdmins[name] = null;
        await writeDepartmentAdmins(deptAdmins);
        await logAdminAction(req.user.id, 'ADD_DEPARTMENT', null, name);

        res.status(201).json({ message: 'Department added successfully', departments: nextDepartments });
    } catch (error) {
        console.error('Admin addDepartment error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const deleteDepartment = async (req, res) => {
    try {
        if (!isSuperAdminUser(req.user)) {
            return res.status(403).json({ message: 'Only Super Admin can delete departments' });
        }
        const { department } = req.body;
        if (!department) {
            return res.status(400).json({ message: 'Department is required' });
        }
        const departments = await readJson('departments');
        if (!departments.includes(department)) {
            return res.status(400).json({ message: 'Department does not exist' });
        }
        const nextDepartments = departments.filter((d) => d !== department);
        await queueWrite('departments', nextDepartments);
        
        const deptAdmins = await readDepartmentAdmins();
        delete deptAdmins[department];
        await writeDepartmentAdmins(deptAdmins);
        
        await logAdminAction(req.user.id, 'DELETE_DEPARTMENT', null, department);
        res.json({ message: 'Department deleted successfully', departments: nextDepartments });
    } catch (error) {
        console.error('Admin deleteDepartment error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const assignDepartmentAdmin = async (req, res) => {
    try {
        if (!isSuperAdminUser(req.user)) {
            return res.status(403).json({ message: 'Only Super Admin can assign department admins' });
        }
        const { department, adminId } = req.body;
        if (!department) {
            return res.status(400).json({ message: 'Department is required' });
        }
        const departments = await readJson('departments');
        if (!departments.includes(department)) {
            return res.status(400).json({ message: 'Department does not exist' });
        }
        
        // Allow unassignment by passing null or empty string
        if (adminId === null || adminId === '' || adminId === undefined) {
            const deptAdmins = await readDepartmentAdmins();
            const previousAdmin = deptAdmins[department];
            deptAdmins[department] = null;
            await writeDepartmentAdmins(deptAdmins);
            await logAdminAction(req.user.id, 'UNASSIGN_DEPARTMENT_ADMIN', previousAdmin, department);
            return res.json({ message: 'Admin unassigned from department', department, adminId: null });
        }
        
        const users = await readUsers();
        const admin = users.find((u) => u.id === adminId && u.role === 'ADMIN');
        if (!admin) {
            return res.status(400).json({ message: 'Admin not found' });
        }
        const deptAdmins = await readDepartmentAdmins();
        deptAdmins[department] = adminId;
        await writeDepartmentAdmins(deptAdmins);
        await logAdminAction(req.user.id, 'ASSIGN_DEPARTMENT_ADMIN', adminId, department);
        res.json({ message: 'Admin assigned to department', department, adminId });
    } catch (error) {
        console.error('Admin assignDepartmentAdmin error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
const getAllUsers = async (req, res) => {
    try {
        const [students, profiles] = await Promise.all([readStudents(), readJson('profiles')]);
        const data = students
            .map((u) => sanitizeUser(withProfile(u, profiles)))
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        res.json(data);
    } catch (error) {
        console.error('Admin getAllUsers error:', error);
        res.status(200).json([]);
    }
};

const verifyAlumni = async (req, res) => {
    try {
        const userId = req.params.id || req.body.userId;
        if (!userId) return res.status(400).json({ message: 'userId is required' });

        const [users, profiles] = await Promise.all([readUsers(), readJson('profiles')]);
        const idx = users.findIndex((u) => u.id === userId);
        if (idx === -1) return res.status(404).json({ message: 'User not found' });

        const targetUser = users[idx];
        const targetProfile = profiles.find((p) => p.userId === userId);

        const adminDept = await getAdminDepartment(req.user.id);
        if (!isSuperAdminUser(req.user) && adminDept) {
            const targetDept = String(targetProfile?.department || '').toLowerCase();
            if (targetDept !== adminDept.toLowerCase()) {
                return res.status(403).json({ message: 'You can only verify alumni from your assigned department' });
            }
        }

        const updatedUser = { ...targetUser, isVerified: true, alumniStatus: 'APPROVED', updatedAt: nowIso() };
        const nextUsers = [...users];
        nextUsers[idx] = updatedUser;

        await writeUsers(nextUsers);
        await logAdminAction(req.user.id, 'VERIFY_ALUMNI', userId);

        res.json({ message: 'User verified successfully', user: sanitizeUser(withProfile(updatedUser, profiles)) });
    } catch (error) {
        console.error('Admin verifyAlumni error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getPendingAlumni = async (req, res) => {
    try {
        const [alumniUsers, profiles] = await Promise.all([readAlumni(), readJson('profiles')]);
        
        let pending = alumniUsers
            .filter((u) => u.alumniStatus === 'PENDING' || !u.alumniStatus)
            .map((u) => sanitizeUser(withProfile(u, profiles)));

        const adminDept = await getAdminDepartment(req.user.id);
        if (!isSuperAdminUser(req.user) && adminDept) {
            pending = pending.filter((p) => 
                String(p.profile?.department || '').toLowerCase() === adminDept.toLowerCase()
            );
        }

        pending.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        res.json(pending);
    } catch (error) {
        console.error('Admin getPendingAlumni error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getApprovedAlumni = async (req, res) => {
    try {
        const [alumniUsers, profiles] = await Promise.all([readAlumni(), readJson('profiles')]);
        
        let approved = alumniUsers
            .filter((u) => ['APPROVED', 'VERIFIED'].includes(String(u.alumniStatus || '').toUpperCase()))
            .map((u) => sanitizeUser(withProfile(u, profiles)));

        const adminDept = await getAdminDepartment(req.user.id);
        if (!isSuperAdminUser(req.user) && adminDept) {
            approved = approved.filter((a) => 
                String(a.profile?.department || '').toLowerCase() === adminDept.toLowerCase()
            );
        }

        approved.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        res.json(approved);
    } catch (error) {
        console.error('Admin getApprovedAlumni error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const rejectAlumni = async (req, res) => {
    try {
        const userId = req.params.id || req.body.userId;
        if (!userId) return res.status(400).json({ message: 'userId is required' });

        const [users, profiles, posts, jobs, mentorships, messages, applications] = await Promise.all([
            readUsers(),
            readJson('profiles'),
            readJson('posts'),
            readJson('jobs'),
            readJson('mentorshipRequests'),
            readJson('messages'),
            readJson('jobApplications'),
        ]);

        const targetUser = users.find((u) => u.id === userId);
        if (!targetUser) return res.status(404).json({ message: 'User not found' });

        const targetProfile = profiles.find((p) => p.userId === userId);

        const adminDept = await getAdminDepartment(req.user.id);
        if (!isSuperAdminUser(req.user) && adminDept) {
            const targetDept = String(targetProfile?.department || '').toLowerCase();
            if (targetDept !== adminDept.toLowerCase()) {
                return res.status(403).json({ message: 'You can only reject alumni from your assigned department' });
            }
        }

        // Remove only the rejected alumni and their related data
        const updatedUsers = users.filter((u) => u.id !== userId);
        await writeUsers(updatedUsers);

        await queueWrite('profiles', profiles.filter((p) => p.userId !== userId));
        await queueWrite('posts', posts.filter((p) => p.authorId !== userId));
        await queueWrite('jobs', jobs.filter((j) => j.posterId !== userId));
        await queueWrite('mentorshipRequests', mentorships.filter((m) => m.studentId !== userId && m.mentorId !== userId));
        await queueWrite('messages', messages.filter((m) => m.senderId !== userId && m.receiverId !== userId));
        await queueWrite('jobApplications', applications.filter((a) => a.applicantId !== userId));

        await logAdminAction(req.user.id, 'REJECT_ALUMNI', userId, targetUser.email);

        res.json({ 
            message: `Alumni rejected and all their data removed.`,
            userDeleted: userId
        });
    } catch (error) {
        console.error('Admin rejectAlumni error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const bulkVerifyAlumni = async (req, res) => {
    try {
        const { ids } = req.body;
        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ message: 'ids array is required' });
        }

        const [users, profiles] = await Promise.all([readUsers(), readJson('profiles')]);
        const adminDept = await getAdminDepartment(req.user.id);
        
        const nextUsers = [...users];
        const updated = [];
        const notFound = [];
        const unauthorized = [];

        for (const userId of ids) {
            const idx = nextUsers.findIndex((u) => u.id === userId);
            if (idx === -1) {
                notFound.push(userId);
                continue;
            }

            const targetUser = nextUsers[idx];
            const targetProfile = profiles.find((p) => p.userId === userId);

            if (!isSuperAdminUser(req.user) && adminDept) {
                const targetDept = String(targetProfile?.department || '').toLowerCase();
                if (targetDept !== adminDept.toLowerCase()) {
                    unauthorized.push(userId);
                    continue;
                }
            }

            nextUsers[idx] = { ...targetUser, isVerified: true, alumniStatus: 'APPROVED', updatedAt: nowIso() };
            updated.push(userId);
        }

        await writeUsers(nextUsers);
        
        for (const userId of updated) {
            await logAdminAction(req.user.id, 'VERIFY_ALUMNI', userId);
        }

        res.json({
            message: `Bulk verification complete. ${updated.length} approved, ${notFound.length} not found, ${unauthorized.length} unauthorized.`,
            approved: updated.length,
            notFound,
            unauthorized,
        });
    } catch (error) {
        console.error('Admin bulkVerifyAlumni error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const bulkRejectAlumni = async (req, res) => {
    try {
        const { ids } = req.body;
        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ message: 'ids array is required' });
        }

        const [users, profiles, posts, jobs, mentorships, messages, applications] = await Promise.all([
            readUsers(),
            readJson('profiles'),
            readJson('posts'),
            readJson('jobs'),
            readJson('mentorshipRequests'),
            readJson('messages'),
            readJson('jobApplications'),
        ]);
        
        const adminDept = await getAdminDepartment(req.user.id);
        
        const targetUsers = users.filter((u) => ids.includes(u.id));
        const notFound = ids.filter((id) => !users.find((u) => u.id === id));
        const unauthorized = [];

        for (const user of targetUsers) {
            const targetProfile = profiles.find((p) => p.userId === user.id);
            if (!isSuperAdminUser(req.user) && adminDept) {
                const targetDept = String(targetProfile?.department || '').toLowerCase();
                if (targetDept !== adminDept.toLowerCase()) {
                    unauthorized.push(user.id);
                }
            }
        }

        const toDelete = targetUsers.filter((u) => !unauthorized.includes(u.id));
        
        const superAdminUsers = users.filter((u) => u.role === 'ADMIN' || isSuperAdminUser(u));
        const nonAdminUsers = users.filter((u) => u.role !== 'ADMIN' && !isSuperAdminUser(u));
        
        await writeUsers(superAdminUsers);
        await queueWrite('profiles', profiles.filter((p) => 
            superAdminUsers.some((u) => u.id === p.userId)
        ));
        await queueWrite('posts', posts.filter((p) => 
            superAdminUsers.some((u) => u.id === p.authorId)
        ));
        await queueWrite('jobs', jobs.filter((j) => 
            superAdminUsers.some((u) => u.id === j.posterId)
        ));
        await queueWrite('mentorshipRequests', mentorships.filter((m) => 
            superAdminUsers.some((u) => u.id === m.studentId) || 
            superAdminUsers.some((u) => u.id === m.mentorId)
        ));
        await queueWrite('messages', messages.filter((m) => 
            superAdminUsers.some((u) => u.id === m.senderId) || 
            superAdminUsers.some((u) => u.id === m.receiverId)
        ));
        await queueWrite('jobApplications', applications.filter((a) => 
            superAdminUsers.some((u) => u.id === a.applicantId)
        ));
        
        for (const user of toDelete) {
            await logAdminAction(req.user.id, 'BULK_REJECT_ALUMNI', user.id, user.email);
        }

        res.json({
            message: `Bulk rejection complete. All non-admin users removed. ${nonAdminUsers.length} users deleted, ${notFound.length} not found, ${unauthorized.length} unauthorized.`,
            usersDeleted: nonAdminUsers.length,
            notFound,
            unauthorized,
        });
    } catch (error) {
        console.error('Admin bulkRejectAlumni error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const deleteUser = async (req, res) => {
    try {
        if (req.params.id === req.user.id) {
            return res.status(400).json({ message: 'You cannot delete your own admin account' });
        }

        const [users, profiles, posts, jobs, mentorships, messages, applications] = await Promise.all([
            readUsers(),
            readJson('profiles'),
            readJson('posts'),
            readJson('jobs'),
            readJson('mentorshipRequests'),
            readJson('messages'),
            readJson('jobApplications'),
        ]);

        const user = users.find((u) => u.id === req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (user.role === 'ADMIN' && !isSuperAdminUser(req.user)) {
            return res.status(403).json({ message: 'Only Super Admin can delete admin accounts' });
        }

        if (user.role === 'ADMIN' && isSuperAdminUser(user) && !isSuperAdminUser(req.user)) {
            return res.status(403).json({ message: 'Only Super Admin can delete another Super Admin account' });
        }

        const superAdminUsers = users.filter((u) => u.role === 'ADMIN' || isSuperAdminUser(u));
        const nonAdminUsers = users.filter((u) => u.role !== 'ADMIN' && !isSuperAdminUser(u));
        
        await writeUsers(superAdminUsers);
        await queueWrite('profiles', profiles.filter((p) => 
            superAdminUsers.some((u) => u.id === p.userId)
        ));
        await queueWrite('posts', posts.filter((p) => 
            superAdminUsers.some((u) => u.id === p.authorId)
        ));
        await queueWrite('jobs', jobs.filter((j) => 
            superAdminUsers.some((u) => u.id === j.posterId)
        ));
        await queueWrite('mentorshipRequests', mentorships.filter((m) => 
            superAdminUsers.some((u) => u.id === m.studentId) || 
            superAdminUsers.some((u) => u.id === m.mentorId)
        ));
        await queueWrite('messages', messages.filter((m) => 
            superAdminUsers.some((u) => u.id === m.senderId) || 
            superAdminUsers.some((u) => u.id === m.receiverId)
        ));
        await queueWrite('jobApplications', applications.filter((a) => 
            superAdminUsers.some((u) => u.id === a.applicantId)
        ));

        await logAdminAction(req.user.id, 'DELETE_USER', req.params.id, user.email);

        res.json({ 
            message: `User deleted and all non-admin users removed. ${nonAdminUsers.length} users deleted.`,
            usersDeleted: nonAdminUsers.length 
        });
    } catch (error) {
        console.error('Admin deleteUser error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getAllPosts = async (req, res) => {
    try {
        const [posts, users, profiles] = await Promise.all([readJson('posts'), readUsers(), readJson('profiles')]);
        const data = posts
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .map((p) => {
                const author = users.find((u) => u.id === p.authorId);
                const likes = Array.isArray(p.likes) ? p.likes : [];
                return {
                    ...p,
                    author: author ? sanitizeUser(withProfile(author, profiles)) : null,
                    likeCount: likes.length,
                };
            });
        res.json(data);
    } catch (error) {
        console.error('Admin getAllPosts error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const deletePost = async (req, res) => {
    try {
        const posts = await readJson('posts');
        const post = posts.find((p) => p.id === req.params.id);
        if (!post) return res.status(404).json({ message: 'Post not found' });

        await queueWrite('posts', posts.filter((p) => p.id !== req.params.id));
        await logAdminAction(req.user.id, 'DELETE_POST', req.params.id);
        res.json({ message: 'Post deleted successfully' });
    } catch (error) {
        console.error('Admin deletePost error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getAllJobs = async (req, res) => {
    try {
        const [jobs, users, profiles, applications] = await Promise.all([
            readJson('jobs'),
            readUsers(),
            readJson('profiles'),
            readJson('jobApplications'),
        ]);
        const data = jobs
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .map((j) => {
                const poster = users.find((u) => u.id === j.posterId);
                return {
                    ...j,
                    poster: poster ? sanitizeUser(withProfile(poster, profiles)) : null,
                    applicationCount: applications.filter((a) => a.jobId === j.id).length,
                };
            });
        res.json(data);
    } catch (error) {
        console.error('Admin getAllJobs error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const deleteJob = async (req, res) => {
    try {
        const [jobs, applications] = await Promise.all([readJson('jobs'), readJson('jobApplications')]);
        const job = jobs.find((j) => j.id === req.params.id);
        if (!job) return res.status(404).json({ message: 'Job not found' });

        await queueWrite('jobs', jobs.filter((j) => j.id !== req.params.id));
        await queueWrite('jobApplications', applications.filter((a) => a.jobId !== req.params.id));
        await logAdminAction(req.user.id, 'DELETE_JOB', req.params.id);
        res.json({ message: 'Job deleted successfully' });
    } catch (error) {
        console.error('Admin deleteJob error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getAdminLogs = async (req, res) => {
    try {
        const [logs, users, profiles] = await Promise.all([readJson('adminLogs'), readUsers(), readJson('profiles')]);
        const data = logs
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 200)
            .map((l) => {
                const admin = users.find((u) => u.id === l.adminId);
                return { ...l, admin: admin ? sanitizeUser(withProfile(admin, profiles)) : null };
            });
        res.json(data);
    } catch (error) {
        console.error('Admin getAdminLogs error:', error);
        res.status(200).json([]);
    }
};

const getStats = async (req, res) => {
    try {
        const [users, posts, jobs, mentorships] = await Promise.all([
            readUsers(),
            readJson('posts'),
            readJson('jobs'),
            readJson('mentorshipRequests'),
        ]);

        res.json({
            users: {
                total: users.length,
                alumni: users.filter((u) => u.role === 'ALUMNI').length,
                students: users.filter((u) => u.role === 'STUDENT').length,
            },
            posts: posts.length,
            jobs: jobs.length,
            activeMentorships: mentorships.filter((m) => m.status === 'ACCEPTED').length,
        });
    } catch (error) {
        console.error('Admin getStats error:', error);
        res.status(200).json({
            users: { total: 0, alumni: 0, students: 0 },
            posts: 0,
            jobs: 0,
            activeMentorships: 0,
            warning: 'Fallback stats: data source temporarily unavailable',
        });
    }
};

const getAllMentorshipRequests = async (req, res) => {
    try {
        const [requests, users, profiles] = await Promise.all([
            readJson('mentorshipRequests'),
            readUsers(),
            readJson('profiles'),
        ]);

        const data = requests
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .map((r) => {
                const student = users.find((u) => u.id === r.studentId);
                const mentor = users.find((u) => u.id === r.mentorId);
                return {
                    ...r,
                    student: student ? sanitizeUser(withProfile(student, profiles)) : null,
                    mentor: mentor ? sanitizeUser(withProfile(mentor, profiles)) : null,
                };
            });

        res.json(data);
    } catch (error) {
        console.error('Admin getAllMentorshipRequests error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getMentorshipMonitoring = async (req, res) => getAllMentorshipRequests(req, res);

const deleteMentorshipRequest = async (req, res) => {
    try {
        const requests = await readJson('mentorshipRequests');
        const req_ = requests.find((r) => r.id === req.params.id);
        if (!req_) return res.status(404).json({ message: 'Mentorship request not found' });

        await queueWrite('mentorshipRequests', requests.filter((r) => r.id !== req.params.id));
        await logAdminAction(req.user.id, 'DELETE_MENTORSHIP', req.params.id);
        res.json({ message: 'Mentorship request deleted successfully' });
    } catch (error) {
        console.error('Admin deleteMentorshipRequest error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const updateMentorshipStatus = async (req, res) => {
    try {
        const status = String(req.body.status || '').toUpperCase();
        const validStatuses = ['PENDING', 'ACCEPTED', 'REJECTED'];
        if (!validStatuses.includes(status)) return res.status(400).json({ message: 'Invalid status' });

        const requests = await readJson('mentorshipRequests');
        const idx = requests.findIndex((r) => r.id === req.params.id);
        if (idx === -1) return res.status(404).json({ message: 'Mentorship request not found' });

        const updated = { ...requests[idx], status, updatedAt: nowIso() };
        const next = [...requests];
        next[idx] = updated;
        await queueWrite('mentorshipRequests', next);

        await logAdminAction(req.user.id, 'UPDATE_MENTORSHIP_STATUS', req.params.id, status);
        res.json(updated);
    } catch (error) {
        console.error('Admin updateMentorshipStatus error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const createUser = async (req, res) => {
    try {
        const { email, role, firstName, lastName, college, graduationYear, department } = req.body;
        if (!email || !firstName || !lastName) {
            return res.status(400).json({ message: 'Email, first name, and last name are required' });
        }

        const [users, profiles, universityName] = await Promise.all([readUsers(), readJson('profiles'), getUniversityName()]);

        const existingUser = users.find((u) => u.email.toLowerCase() === String(email).toLowerCase());
        if (existingUser) {
            return res.status(400).json({ message: 'A user with this email already exists' });
        }

        const userRole = normalizeRole(role);
        const defaultPassword = DEFAULT_PASSWORDS[userRole] || DEFAULT_PASSWORDS.STUDENT;

        const id = uuidv4();
        const timestamp = nowIso();
        const hashedPassword = await bcrypt.hash(defaultPassword, 10);

        if (userRole === 'ADMIN' && !isSuperAdminUser(req.user)) {
            return res.status(403).json({ message: 'Only Super Admin can create admin accounts' });
        }

        const user = {
            id,
            email: String(email).trim(),
            password: hashedPassword,
            role: userRole,
            isVerified: userRole === 'ADMIN',
            alumniStatus: userRole === 'ALUMNI' ? 'PENDING' : null,
            isSuperAdmin: false,
            createdAt: timestamp,
            updatedAt: timestamp,
        };

        const profile = {
            id: uuidv4(),
            userId: id,
            firstName: String(firstName).trim(),
            lastName: String(lastName).trim(),
            college: universityName,
            graduationYear: graduationYear ? parseInt(graduationYear, 10) : null,
            department: department || null,
            skills: [],
            currentCompany: null,
            bio: null,
            profilePicture: null,
        };

        await writeUsers([...users, user]);
        await queueWrite('profiles', [...profiles, profile]);
        await logAdminAction(req.user.id, 'CREATE_USER', id, { email, defaultPassword });

        res.status(201).json({
            message: `User created successfully. Default password: ${defaultPassword}`,
            user: sanitizeUser(withProfile(user, [...profiles, profile])),
        });
    } catch (error) {
        console.error('Admin createUser error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getAdmins = async (req, res) => {
    try {
        const [adminsList, profiles] = await Promise.all([readAdmins(), readJson('profiles')]);
        const admins = adminsList
            .map((u) => sanitizeUser(withProfile({ ...u, isSuperAdmin: isSuperAdminUser(u) }, profiles)))
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.json(admins);
    } catch (error) {
        console.error('Admin getAdmins error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const createAdmin = async (req, res) => {
    try {
        if (!isSuperAdminUser(req.user)) {
            return res.status(403).json({ message: 'Only Super Admin can create admin accounts' });
        }

        const { name, email } = req.body;
        if (!name || !email) {
            return res.status(400).json({ message: 'Name and email are required' });
        }

        const [users, profiles, universityName] = await Promise.all([readUsers(), readJson('profiles'), getUniversityName()]);
        const existingUser = users.find((u) => u.email.toLowerCase() === String(email).toLowerCase());
        if (existingUser) {
            return res.status(400).json({ message: 'A user with this email already exists' });
        }

        const fullName = String(name).trim().replace(/\s+/g, ' ');
        const parts = fullName.split(' ');
        const firstName = parts.shift() || fullName;
        const lastName = parts.join(' ');

        const id = uuidv4();
        const timestamp = nowIso();
        const defaultPassword = DEFAULT_PASSWORDS.ADMIN;
        const hashedPassword = await bcrypt.hash(defaultPassword, 10);

        const user = {
            id,
            email: String(email).trim(),
            password: hashedPassword,
            role: 'ADMIN',
            isVerified: true,
            isSuperAdmin: false,
            alumniStatus: null,
            createdAt: timestamp,
            updatedAt: timestamp,
        };

        const profile = {
            id: uuidv4(),
            userId: id,
            firstName,
            lastName,
            college: universityName,
            graduationYear: null,
            department: null,
            skills: [],
            currentCompany: null,
            bio: null,
            profilePicture: null,
        };

        await writeUsers([...users, user]);
        await queueWrite('profiles', [...profiles, profile]);
        await logAdminAction(req.user.id, 'CREATE_ADMIN', id, { email, defaultPassword });

        res.status(201).json({
            message: `Admin created successfully. Default password: ${defaultPassword}`,
            user: sanitizeUser(withProfile(user, [...profiles, profile])),
        });
    } catch (error) {
        console.error('Admin createAdmin error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const deleteAdmin = async (req, res) => {
    try {
        if (!isSuperAdminUser(req.user)) {
            return res.status(403).json({ message: 'Only Super Admin can delete admin accounts' });
        }

        const adminId = req.params.id;
        if (adminId === req.user.id) {
            return res.status(400).json({ message: 'You cannot delete your own Super Admin account' });
        }

        const [users, profiles] = await Promise.all([readUsers(), readJson('profiles')]);
        const target = users.find((u) => u.id === adminId);
        if (!target) return res.status(404).json({ message: 'Admin not found' });
        if (target.role !== 'ADMIN') return res.status(400).json({ message: 'Target user is not an admin' });

        if (isSuperAdminUser(target)) {
            return res.status(400).json({ message: 'Super Admin account cannot be deleted' });
        }

        const remainingAdmins = users.filter((u) => u.role === 'ADMIN' && u.id !== adminId);
        if (remainingAdmins.length === 0) {
            return res.status(400).json({ message: 'At least one admin account must remain' });
        }

        await writeUsers(users.filter((u) => u.id !== adminId));
        await queueWrite('profiles', profiles.filter((p) => p.userId !== adminId));
        await logAdminAction(req.user.id, 'DELETE_ADMIN', adminId, target.email);

        res.json({ message: 'Admin deleted successfully' });
    } catch (error) {
        console.error('Admin deleteAdmin error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const createAlumni = async (req, res) => {
    try {
        const { name, email, college, graduationYear, department } = req.body;
        if (!name || !email || !college || !graduationYear || !department) {
            return res.status(400).json({ message: 'Name, email, college, graduation year, and department are required' });
        }

        const [users, profiles, universityName] = await Promise.all([readUsers(), readJson('profiles'), getUniversityName()]);
        const existingUser = users.find((u) => u.email.toLowerCase() === String(email).toLowerCase());
        if (existingUser) {
            return res.status(400).json({ message: 'A user with this email already exists' });
        }

        const fullName = String(name).trim().replace(/\s+/g, ' ');
        const parts = fullName.split(' ');
        const firstName = parts.shift() || fullName;
        const lastName = parts.join(' ');

        const id = uuidv4();
        const timestamp = nowIso();
        const defaultPassword = DEFAULT_PASSWORDS.ALUMNI;
        const hashedPassword = await bcrypt.hash(defaultPassword, 10);

        const user = {
            id,
            email: String(email).trim(),
            password: hashedPassword,
            role: 'ALUMNI',
            isVerified: true,
            alumniStatus: 'APPROVED',
            createdAt: timestamp,
            updatedAt: timestamp,
        };

        const profile = {
            id: uuidv4(),
            userId: id,
            firstName,
            lastName,
            college: universityName,
            graduationYear: parseInt(graduationYear, 10),
            department: String(department).trim(),
            skills: [],
            currentCompany: null,
            bio: null,
            profilePicture: null,
        };

        await writeUsers([...users, user]);
        await queueWrite('profiles', [...profiles, profile]);
        await logAdminAction(req.user.id, 'CREATE_ALUMNI', id, { email, defaultPassword });

        res.status(201).json({
            message: `Alumni created successfully. Default password: ${defaultPassword}`,
            user: sanitizeUser(withProfile(user, [...profiles, profile])),
        });
    } catch (error) {
        console.error('Admin createAlumni error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const resetPassword = async (req, res) => {
    try {
        const { id } = req.params;
        const users = await readUsers();
        const idx = users.findIndex((u) => u.id === id);
        if (idx === -1) return res.status(404).json({ message: 'User not found' });

        const user = users[idx];
        if (isSuperAdminUser(user) && !isSuperAdminUser(req.user)) {
            return res.status(403).json({ message: 'Cannot reset password of a Super Admin' });
        }

        const defaultPassword = DEFAULT_PASSWORDS[user.role] || 'student@123';
        const hashedPassword = await bcrypt.hash(defaultPassword, 10);
        const nextUsers = [...users];
        nextUsers[idx] = { ...user, password: hashedPassword, updatedAt: nowIso() };

        await writeUsers(nextUsers);
        await logAdminAction(req.user.id, 'RESET_PASSWORD', id, user.email);

        res.json({ message: `Password reset to default: ${defaultPassword}` });
    } catch (error) {
        console.error('Admin resetPassword error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const updateUserDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const payload = req.body || {};
        const [users, profiles] = await Promise.all([readUsers(), readJson('profiles')]);

        const userIdx = users.findIndex((u) => u.id === id);
        if (userIdx === -1) return res.status(404).json({ message: 'User not found' });

        const target = users[userIdx];
        const requesterIsSuperAdmin = isSuperAdminUser(req.user);

        if (target.role === 'ADMIN' && !requesterIsSuperAdmin) {
            return res.status(403).json({ message: 'Only Super Admin can edit admin accounts' });
        }

        const hasEmail = Object.prototype.hasOwnProperty.call(payload, 'email');
        const nextEmail = hasEmail ? String(payload.email || '').trim().toLowerCase() : target.email;
        if (!nextEmail) return res.status(400).json({ message: 'Email is required' });

        const duplicate = users.find((u) => u.id !== id && String(u.email || '').toLowerCase() === nextEmail);
        if (duplicate) return res.status(400).json({ message: 'A user with this email already exists' });

        let nextRole = target.role;
        if (Object.prototype.hasOwnProperty.call(payload, 'role')) {
            const requestedRole = normalizeRole(payload.role);
            if (requestedRole === 'ADMIN' && !requesterIsSuperAdmin) {
                return res.status(403).json({ message: 'Only Super Admin can assign admin role' });
            }
            if (isSuperAdminUser(target) && requestedRole !== 'ADMIN') {
                return res.status(400).json({ message: 'Super Admin role cannot be changed' });
            }
            nextRole = requestedRole;
        }

        const parseYear = (value) => {
            if (value === undefined || value === null) return undefined;
            const raw = String(value).trim();
            if (!raw) return null;
            const year = parseInt(raw, 10);
            return Number.isNaN(year) ? NaN : year;
        };

        const parseBool = (value) => {
            if (value === undefined || value === null) return undefined;
            if (typeof value === 'boolean') return value;
            const raw = String(value).trim().toLowerCase();
            if (['true', '1', 'yes', 'y'].includes(raw)) return true;
            if (['false', '0', 'no', 'n'].includes(raw)) return false;
            return undefined;
        };

        const graduationYear = parseYear(payload.graduationYear);
        if (Number.isNaN(graduationYear)) {
            return res.status(400).json({ message: 'Graduation year must be a number' });
        }

        const hasIsVerified = Object.prototype.hasOwnProperty.call(payload, 'isVerified');
        const parsedIsVerified = parseBool(payload.isVerified);
        if (hasIsVerified && parsedIsVerified === undefined) {
            return res.status(400).json({ message: 'isVerified must be true or false' });
        }

        const hasAlumniStatus = Object.prototype.hasOwnProperty.call(payload, 'alumniStatus');
        const nextAlumniStatusRaw = hasAlumniStatus ? String(payload.alumniStatus || '').trim().toUpperCase() : undefined;
        const validAlumniStatuses = ['PENDING', 'APPROVED', 'REJECTED', 'VERIFIED'];
        if (hasAlumniStatus && nextAlumniStatusRaw && !validAlumniStatuses.includes(nextAlumniStatusRaw)) {
            return res.status(400).json({ message: 'Invalid alumni status' });
        }

        const profileIdx = profiles.findIndex((p) => p.userId === id);
        const existingProfile = profileIdx >= 0
            ? profiles[profileIdx]
            : {
                id: uuidv4(),
                userId: id,
                firstName: '',
                lastName: '',
                college: null,
                graduationYear: null,
                department: null,
                skills: [],
                currentCompany: null,
                bio: null,
                profilePicture: null,
            };

        const hasFirstName = Object.prototype.hasOwnProperty.call(payload, 'firstName');
        const hasLastName = Object.prototype.hasOwnProperty.call(payload, 'lastName');
        const hasCollege = Object.prototype.hasOwnProperty.call(payload, 'college');
        const hasDepartment = Object.prototype.hasOwnProperty.call(payload, 'department');

        const nextFirstName = hasFirstName ? String(payload.firstName || '').trim() : String(existingProfile.firstName || '');
        const nextLastName = hasLastName ? String(payload.lastName || '').trim() : String(existingProfile.lastName || '');
        if (hasCollege && requesterIsSuperAdmin) {
            try {
                await setUniversityName(payload.college);
            } catch (error) {
                if (error?.code === 'UNIVERSITY_NAME_LOCKED') {
                    return res.status(409).json({ message: 'University name is already set and cannot be edited' });
                }
                throw error;
            }
        }
        const nextCollege = await getUniversityName();
        const nextDepartment = hasDepartment
            ? (String(payload.department || '').trim().toLowerCase() || null)
            : (existingProfile.department || null);

        if (!nextFirstName) return res.status(400).json({ message: 'First name is required' });

        const hasCurrentCompany = Object.prototype.hasOwnProperty.call(payload, 'currentCompany');
        const hasBio = Object.prototype.hasOwnProperty.call(payload, 'bio');
        const hasSkills = Object.prototype.hasOwnProperty.call(payload, 'skills');
        const hasProfilePicture = Object.prototype.hasOwnProperty.call(payload, 'profilePicture');

        let nextSkills = existingProfile.skills;
        if (hasSkills) {
            if (Array.isArray(payload.skills)) {
                nextSkills = payload.skills.map((s) => String(s).trim()).filter(Boolean);
            } else {
                nextSkills = String(payload.skills || '')
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean);
            }
        }

        const updatedProfile = {
            ...existingProfile,
            firstName: nextFirstName,
            lastName: nextLastName,
            college: nextCollege,
            graduationYear: graduationYear === undefined ? (existingProfile.graduationYear ?? null) : graduationYear,
            department: nextDepartment,
            currentCompany: hasCurrentCompany ? (String(payload.currentCompany || '').trim() || null) : (existingProfile.currentCompany || null),
            bio: hasBio ? (String(payload.bio || '').trim() || null) : (existingProfile.bio || null),
            profilePicture: hasProfilePicture ? (String(payload.profilePicture || '').trim() || null) : (existingProfile.profilePicture || null),
            skills: nextSkills || [],
        };

        const updatedUser = {
            ...target,
            email: nextEmail,
            role: nextRole,
            updatedAt: nowIso(),
        };

        if (nextRole === 'ADMIN') {
            updatedUser.isVerified = true;
            updatedUser.alumniStatus = null;
        } else if (nextRole === 'ALUMNI') {
            updatedUser.isVerified = true;
            updatedUser.alumniStatus = target.alumniStatus || 'APPROVED';
        } else {
            updatedUser.alumniStatus = null;
        }

        if (hasIsVerified) {
            updatedUser.isVerified = parsedIsVerified;
        }

        if (hasAlumniStatus) {
            if (nextRole !== 'ALUMNI') {
                updatedUser.alumniStatus = null;
            } else {
                updatedUser.alumniStatus = nextAlumniStatusRaw || null;
            }
        }

        const nextUsers = [...users];
        nextUsers[userIdx] = updatedUser;

        const nextProfiles = [...profiles];
        if (profileIdx >= 0) nextProfiles[profileIdx] = updatedProfile;
        else nextProfiles.push(updatedProfile);

        await writeUsers(nextUsers);
        await queueWrite('profiles', nextProfiles);
        await logAdminAction(req.user.id, 'UPDATE_USER_DETAILS', id, { email: updatedUser.email, role: updatedUser.role });

        res.json({
            message: 'User details updated successfully',
            user: sanitizeUser(withProfile(updatedUser, nextProfiles)),
        });
    } catch (error) {
        console.error('Admin updateUserDetails error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const bulkCreateUsers = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'Excel file is required' });

        const xlsx = require('xlsx');
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = xlsx.utils.sheet_to_json(sheet, { defval: '' });

        if (!rows.length) return res.status(400).json({ message: 'The spreadsheet is empty' });

        const [users, profiles, universityName] = await Promise.all([readUsers(), readJson('profiles'), getUniversityName()]);
        const newUsers = [...users];
        const newProfiles = [...profiles];
        const created = [];
        const skipped = [];
        const errors = [];

        for (const row of rows) {
            const firstName = String(row['firstName'] || row['first_name'] || row['First Name'] || row['FirstName'] || '').trim();
            const lastName = String(row['lastName'] || row['last_name'] || row['Last Name'] || row['LastName'] || '').trim();
            const email = String(row['email'] || row['Email'] || '').trim().toLowerCase();
            const password = DEFAULT_PASSWORDS.STUDENT;
            const college = String(row['college'] || row['College'] || '').trim();
            const graduationYear = String(row['graduationYear'] || row['graduation_year'] || row['Graduation Year'] || row['GraduationYear'] || '').trim();
            const department = String(row['department'] || row['Department'] || '').trim().toLowerCase();

            if (!firstName || !email) {
                errors.push({ email: email || '(empty)', reason: 'Missing firstName or email' });
                continue;
            }

            if (newUsers.find((u) => u.email.toLowerCase() === email)) {
                skipped.push(email);
                continue;
            }

            const id = uuidv4();
            const timestamp = nowIso();
            const hashedPassword = await bcrypt.hash(password, 10);

            newUsers.push({
                id, email, password: hashedPassword, role: 'STUDENT',
                isVerified: true, isSuperAdmin: false, alumniStatus: null,
                createdAt: timestamp, updatedAt: timestamp,
            });
            newProfiles.push({
                id: uuidv4(), userId: id, firstName, lastName,
                college: universityName, graduationYear: graduationYear || null,
                department: department || null, skills: [], currentCompany: null,
                bio: null, profilePicture: null,
            });
            created.push(email);
        }

        if (created.length > 0) {
            await writeUsers(newUsers);
            await queueWrite('profiles', newProfiles);
            await logAdminAction(req.user.id, 'BULK_CREATE_USERS', null, { count: created.length });
        }

        res.json({
            message: `Import complete. ${created.length} created, ${skipped.length} skipped (duplicate), ${errors.length} failed.`,
            created: created.length,
            skipped: skipped.length,
            errors,
        });
    } catch (error) {
        console.error('Admin bulkCreateUsers error:', error);
        res.status(500).json({ message: 'Server error during bulk import' });
    }
};

const bulkCreateAlumni = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'Excel file is required' });

        const xlsx = require('xlsx');
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = xlsx.utils.sheet_to_json(sheet, { defval: '' });

        if (!rows.length) return res.status(400).json({ message: 'The spreadsheet is empty' });

        const [users, profiles, universityName] = await Promise.all([readUsers(), readJson('profiles'), getUniversityName()]);
        const newUsers = [...users];
        const newProfiles = [...profiles];
        const created = [];
        const skipped = [];
        const errors = [];

        for (const row of rows) {
            const name = String(row['name'] || row['Name'] || `${row['firstName'] || ''} ${row['lastName'] || ''}` || '').trim();
            const firstName = String(row['firstName'] || row['first_name'] || row['First Name'] || row['FirstName'] || '').trim();
            const lastName = String(row['lastName'] || row['last_name'] || row['Last Name'] || row['LastName'] || '').trim();
            const email = String(row['email'] || row['Email'] || '').trim().toLowerCase();
            const password = String(row['password'] || row['Password'] || '').trim() || DEFAULT_PASSWORDS.ALUMNI;
            const college = String(row['college'] || row['College'] || '').trim();
            const graduationYearRaw = String(row['graduationYear'] || row['graduation_year'] || row['Graduation Year'] || row['GraduationYear'] || '').trim();
            const department = String(row['department'] || row['Department'] || '').trim().toLowerCase();

            const fullName = name || `${firstName} ${lastName}`.trim();
            const parts = fullName.split(' ').filter(Boolean);
            const finalFirstName = firstName || parts.shift() || '';
            const finalLastName = lastName || parts.join(' ');

            if (!finalFirstName || !email || !college || !graduationYearRaw || !department) {
                errors.push({ email: email || '(empty)', reason: 'Missing required fields (name/email/college/graduationYear/department)' });
                continue;
            }

            const graduationYear = parseInt(graduationYearRaw, 10);
            if (Number.isNaN(graduationYear)) {
                errors.push({ email: email || '(empty)', reason: 'Invalid graduationYear' });
                continue;
            }

            if (newUsers.find((u) => u.email.toLowerCase() === email)) {
                skipped.push(email);
                continue;
            }

            const id = uuidv4();
            const timestamp = nowIso();
            const hashedPassword = await bcrypt.hash(password, 10);

            newUsers.push({
                id,
                email,
                password: hashedPassword,
                role: 'ALUMNI',
                isVerified: true,
                isSuperAdmin: false,
                alumniStatus: 'APPROVED',
                createdAt: timestamp,
                updatedAt: timestamp,
            });
            newProfiles.push({
                id: uuidv4(),
                userId: id,
                firstName: finalFirstName,
                lastName: finalLastName,
                college: universityName,
                graduationYear,
                department,
                skills: [],
                currentCompany: null,
                bio: null,
                profilePicture: null,
            });
            created.push(email);
        }

        if (created.length > 0) {
            await writeUsers(newUsers);
            await queueWrite('profiles', newProfiles);
            await logAdminAction(req.user.id, 'BULK_CREATE_ALUMNI', null, { count: created.length });
        }

        res.json({
            message: `Import complete. ${created.length} created, ${skipped.length} skipped (duplicate), ${errors.length} failed.`,
            created: created.length,
            skipped: skipped.length,
            errors,
        });
    } catch (error) {
        console.error('Admin bulkCreateAlumni error:', error);
        res.status(500).json({ message: 'Server error during alumni bulk import' });
    }
};

module.exports = {
    getUniversityConfig,
    updateUniversityConfig,
    getDepartments,
    addDepartment,
    deleteDepartment,
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
    getDepartmentAdmins,
    assignDepartmentAdmin,
};
