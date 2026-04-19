const prisma = require('../config/prisma');
const fs = require('fs/promises');
const path = require('path');

const FILES = {
    users: 'users.json',
    admins: 'admins.json',
    alumni: 'alumni.json',
    students: 'students.json',
    departments: 'departments.json',
    departments_admins: 'departments_admins.json',
    profiles: 'profiles.json',
    connections: 'connections.json',
    connectionRequests: 'connection_requests.json',
    savedJobs: 'saved_jobs.json',
    jobs: 'jobs.json',
    jobApplications: 'job_applications.json',
    mentorshipRequests: 'mentorship_requests.json',
    messages: 'messages.json',
    posts: 'posts.json',
    adminLogs: 'admin_logs.json',
};

const DEFAULT_UNIVERSITY_NAME = 'Alumnyx University';
const FALLBACK_SETTINGS_FILE = path.join(__dirname, 'fallback_settings.json');

const readFallbackSettings = async () => {
    try {
        const raw = await fs.readFile(FALLBACK_SETTINGS_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        return (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : {};
    } catch {
        return {};
    }
};

const writeFallbackSettings = async (settings) => {
    const data = (settings && typeof settings === 'object' && !Array.isArray(settings)) ? settings : {};
    const tmpFile = `${FALLBACK_SETTINGS_FILE}.tmp`;
    await fs.mkdir(path.dirname(FALLBACK_SETTINGS_FILE), { recursive: true });
    await fs.writeFile(tmpFile, JSON.stringify(data, null, 2), 'utf8');
    await fs.rename(tmpFile, FALLBACK_SETTINGS_FILE);
};

const enumOrFallback = (allowed, value, fallback) => {
    const normalized = String(value || '').toUpperCase();
    return allowed.includes(normalized) ? normalized : fallback;
};

const toIso = (value) => {
    if (!value) return null;
    if (typeof value === 'string') return value;
    if (value instanceof Date) return value.toISOString();
    return new Date(value).toISOString();
};

const mapUser = (u) => ({
    ...u,
    role: String(u.role),
    alumniStatus: u.alumniStatus ? String(u.alumniStatus) : null,
    createdAt: toIso(u.createdAt),
    updatedAt: toIso(u.updatedAt),
});

const mapProfile = (p) => ({
    ...p,
    createdAt: toIso(p.createdAt),
    updatedAt: toIso(p.updatedAt),
});

const mapJob = (j) => ({
    ...j,
    createdAt: toIso(j.createdAt),
    updatedAt: toIso(j.updatedAt),
});

const mapJobApplication = (a) => ({
    ...a,
    status: String(a.status),
    createdAt: toIso(a.createdAt),
    updatedAt: toIso(a.updatedAt),
});

const mapMentorshipRequest = (m) => ({
    ...m,
    status: String(m.status),
    createdAt: toIso(m.createdAt),
    updatedAt: toIso(m.updatedAt),
});

const mapMessage = (m) => ({
    ...m,
    createdAt: toIso(m.createdAt),
    updatedAt: toIso(m.updatedAt) || toIso(m.createdAt),
});

const mapPost = (p) => ({
    ...p,
    likes: (p.likes || []).map((l) => l.userId),
    createdAt: toIso(p.createdAt),
    updatedAt: toIso(p.updatedAt),
});

const mapAdminLog = (l) => ({
    ...l,
    metadata: (() => {
        if (l.metadata == null) return null;
        try {
            return JSON.parse(l.metadata);
        } catch {
            return l.metadata;
        }
    })(),
    createdAt: toIso(l.createdAt),
});

const parseDateOrNow = (value) => {
    if (!value) return new Date();
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? new Date() : d;
};

const parseNullableDate = (value) => {
    if (!value) return undefined;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? undefined : d;
};

const safeReadMany = async (label, reader, fallback = []) => {
    try {
        return await reader();
    } catch (error) {
        console.warn(`readJson ${label} failed; using fallback:`, error?.message || error);
        return fallback;
    }
};

const upsertSetting = async (key, valueJson) => {
    try {
        await prisma.appSetting.upsert({
            where: { key },
            update: { valueJson },
            create: { key, valueJson },
        });
        return;
    } catch (error) {
        console.warn('upsertSetting DB write failed; using fallback settings file:', error?.message || error);
    }

    const current = await readFallbackSettings();
    current[key] = valueJson;
    await writeFallbackSettings(current);
};

const readSetting = async (key, fallback) => {
    try {
        const row = await prisma.appSetting.findUnique({ where: { key } });
        if (!row || row.valueJson == null) return fallback;
        return row.valueJson;
    } catch (error) {
        console.warn('readSetting DB read failed; using fallback settings file:', error?.message || error);
    }

    const local = await readFallbackSettings();
    if (!Object.prototype.hasOwnProperty.call(local, key)) return fallback;
    return local[key];
};

const normalizeUniversityName = (value) => {
    const name = String(value || '').trim();
    return name || DEFAULT_UNIVERSITY_NAME;
};

const isUniversityNameLocked = async () => {
    const value = await readSetting('universityNameLocked', false);
    return Boolean(value);
};

const getUniversityName = async () => {
    const value = await readSetting('universityName', DEFAULT_UNIVERSITY_NAME);
    return normalizeUniversityName(value);
};

const setUniversityName = async (name, options = {}) => {
    const allowLockedUpdate = Boolean(options && options.allowLockedUpdate);

    if (!allowLockedUpdate && await isUniversityNameLocked()) {
        const error = new Error('University name is locked and cannot be changed');
        error.code = 'UNIVERSITY_NAME_LOCKED';
        throw error;
    }

    const value = normalizeUniversityName(name);
    await upsertSetting('universityName', value);
    await upsertSetting('universityNameLocked', true);

    // Keep profile college consistent for all users by syncing this setting.
    try {
        await prisma.profile.updateMany({ data: { college: value } });
    } catch (error) {
        console.warn('setUniversityName profile sync skipped (DB unavailable):', error?.message || error);
    }
    return value;
};

const readJson = async (key) => {
    if (key === 'users') {
        return readUsers();
    }
    if (key === 'admins') {
        return readAdmins();
    }
    if (key === 'alumni') {
        return readAlumni();
    }
    if (key === 'students') {
        return readStudents();
    }
    if (key === 'profiles') {
        const universityName = await getUniversityName();
        const rows = await safeReadMany('profiles', () => prisma.profile.findMany(), []);
        return rows.map((p) => ({ ...mapProfile(p), college: universityName }));
    }
    if (key === 'connections') {
        const data = await readSetting('connections', []);
        return Array.isArray(data) ? data : [];
    }
    if (key === 'connectionRequests') {
        const data = await readSetting('connectionRequests', []);
        return Array.isArray(data) ? data : [];
    }
    if (key === 'savedJobs') {
        const data = await readSetting('savedJobs', []);
        return Array.isArray(data) ? data : [];
    }
    if (key === 'jobs') {
        const rows = await safeReadMany('jobs', () => prisma.job.findMany(), []);
        return rows.map(mapJob);
    }
    if (key === 'jobApplications') {
        const rows = await safeReadMany('jobApplications', () => prisma.jobApplication.findMany(), []);
        return rows.map(mapJobApplication);
    }
    if (key === 'mentorshipRequests') {
        const rows = await safeReadMany('mentorshipRequests', () => prisma.mentorshipRequest.findMany(), []);
        return rows.map(mapMentorshipRequest);
    }
    if (key === 'messages') {
        const rows = await safeReadMany('messages', () => prisma.message.findMany(), []);
        return rows.map(mapMessage);
    }
    if (key === 'posts') {
        const rows = await safeReadMany('posts', () => prisma.post.findMany({ include: { likes: true } }), []);
        return rows.map(mapPost);
    }
    if (key === 'adminLogs') {
        const rows = await safeReadMany('adminLogs', () => prisma.adminLog.findMany(), []);
        return rows.map(mapAdminLog);
    }
    if (key === 'departments') {
        const data = await readSetting('departments', []);
        return Array.isArray(data) ? data : [];
    }
    if (key === 'departments_admins') {
        const data = await readSetting('departments_admins', {});
        return (data && typeof data === 'object' && !Array.isArray(data)) ? data : {};
    }

    throw new Error(`Unknown storage key: ${key}`);
};

const queueWrite = async (key, data) => {
    if (key === 'users') {
        return writeUsers(data);
    }
    if (key === 'admins') {
        return writeAdmins(data);
    }
    if (key === 'alumni') {
        return writeAlumni(data);
    }
    if (key === 'students') {
        return writeStudents(data);
    }
    if (key === 'profiles') {
        const rows = Array.isArray(data) ? data : [];
        const universityName = await getUniversityName();
        const users = await prisma.user.findMany({ select: { id: true } });
        const userIds = new Set(users.map((u) => u.id));
        const safeRows = rows.filter((p) => p && userIds.has(p.userId));
        await prisma.$transaction([
            prisma.profile.deleteMany({}),
            prisma.profile.createMany({
                data: safeRows.map((p) => ({
                    id: p.id,
                    userId: p.userId,
                    firstName: p.firstName || '',
                    lastName: p.lastName || '',
                    college: universityName,
                    department: p.department ?? null,
                    graduationYear: p.graduationYear != null ? Number(p.graduationYear) : null,
                    skills: Array.isArray(p.skills) ? p.skills.map((s) => String(s)) : [],
                    currentCompany: p.currentCompany ?? null,
                    bio: p.bio ?? null,
                    profilePicture: p.profilePicture ?? null,
                    resumeUrl: p.resumeUrl ?? null,
                    createdAt: parseDateOrNow(p.createdAt),
                    updatedAt: parseNullableDate(p.updatedAt),
                })),
                skipDuplicates: true,
            }),
        ]);
        return;
    }
    if (key === 'connections') {
        const rows = Array.isArray(data) ? data : [];
        await upsertSetting('connections', rows);
        return;
    }
    if (key === 'connectionRequests') {
        const rows = Array.isArray(data) ? data : [];
        await upsertSetting('connectionRequests', rows);
        return;
    }
    if (key === 'savedJobs') {
        const rows = Array.isArray(data) ? data : [];
        await upsertSetting('savedJobs', rows);
        return;
    }
    if (key === 'jobs') {
        const rows = Array.isArray(data) ? data : [];
        const users = await prisma.user.findMany({ select: { id: true } });
        const userIds = new Set(users.map((u) => u.id));
        const safeRows = rows.filter((j) => j && userIds.has(j.posterId));
        await prisma.$transaction([
            prisma.jobApplication.deleteMany({}),
            prisma.job.deleteMany({}),
            prisma.job.createMany({
                data: safeRows.map((j) => ({
                    id: j.id,
                    title: j.title,
                    company: j.company,
                    location: j.location ?? null,
                    description: j.description,
                    requirements: j.requirements ?? null,
                    salary: j.salary ?? null,
                    posterId: j.posterId,
                    createdAt: parseDateOrNow(j.createdAt),
                    updatedAt: parseNullableDate(j.updatedAt),
                })),
                skipDuplicates: true,
            }),
        ]);
        return;
    }
    if (key === 'jobApplications') {
        const rows = Array.isArray(data) ? data : [];
        const [users, jobs] = await Promise.all([
            prisma.user.findMany({ select: { id: true } }),
            prisma.job.findMany({ select: { id: true } }),
        ]);
        const userIds = new Set(users.map((u) => u.id));
        const jobIds = new Set(jobs.map((j) => j.id));
        const safeRows = rows.filter((a) => a && jobIds.has(a.jobId) && userIds.has(a.applicantId));
        await prisma.$transaction([
            prisma.jobApplication.deleteMany({}),
            prisma.jobApplication.createMany({
                data: safeRows.map((a) => ({
                    id: a.id,
                    jobId: a.jobId,
                    applicantId: a.applicantId,
                    status: enumOrFallback(['PENDING', 'REVIEWED', 'ACCEPTED', 'REJECTED'], a.status, 'PENDING'),
                    coverNote: a.coverNote ?? null,
                    createdAt: parseDateOrNow(a.createdAt),
                    updatedAt: parseNullableDate(a.updatedAt),
                })),
                skipDuplicates: true,
            }),
        ]);
        return;
    }
    if (key === 'mentorshipRequests') {
        const rows = Array.isArray(data) ? data : [];
        const users = await prisma.user.findMany({ select: { id: true } });
        const userIds = new Set(users.map((u) => u.id));
        const safeRows = rows.filter((m) => m && userIds.has(m.studentId) && userIds.has(m.mentorId));
        await prisma.$transaction([
            prisma.mentorshipRequest.deleteMany({}),
            prisma.mentorshipRequest.createMany({
                data: safeRows.map((m) => ({
                    id: m.id,
                    studentId: m.studentId,
                    mentorId: m.mentorId,
                    status: enumOrFallback(['PENDING', 'ACCEPTED', 'REJECTED'], m.status, 'PENDING'),
                    message: m.message ?? null,
                    createdAt: parseDateOrNow(m.createdAt),
                    updatedAt: parseNullableDate(m.updatedAt),
                })),
                skipDuplicates: true,
            }),
        ]);
        return;
    }
    if (key === 'messages') {
        const rows = Array.isArray(data) ? data : [];
        const users = await prisma.user.findMany({ select: { id: true } });
        const userIds = new Set(users.map((u) => u.id));
        const safeRows = rows.filter((m) => m && userIds.has(m.senderId) && userIds.has(m.receiverId));
        await prisma.$transaction([
            prisma.message.deleteMany({}),
            prisma.message.createMany({
                data: safeRows.map((m) => ({
                    id: m.id,
                    senderId: m.senderId,
                    receiverId: m.receiverId,
                    content: m.content,
                    isRead: Boolean(m.isRead),
                    createdAt: parseDateOrNow(m.createdAt),
                })),
                skipDuplicates: true,
            }),
        ]);
        return;
    }
    if (key === 'posts') {
        const rows = Array.isArray(data) ? data : [];
        const users = await prisma.user.findMany({ select: { id: true } });
        const userIds = new Set(users.map((u) => u.id));
        const safeRows = rows.filter((p) => p && userIds.has(p.authorId));
        await prisma.$transaction(async (tx) => {
            await tx.postLike.deleteMany({});
            await tx.post.deleteMany({});
            for (const p of safeRows) {
                await tx.post.create({
                    data: {
                        id: p.id,
                        authorId: p.authorId,
                        content: p.content,
                        mediaUrl: p.mediaUrl ?? null,
                        createdAt: parseDateOrNow(p.createdAt),
                        updatedAt: parseNullableDate(p.updatedAt),
                    },
                });
                const likes = Array.isArray(p.likes) ? p.likes : [];
                for (const userId of likes) {
                    if (!userIds.has(userId)) continue;
                    await tx.postLike.create({
                        data: {
                            postId: p.id,
                            userId,
                        },
                    }).catch(() => undefined);
                }
            }
        });
        return;
    }
    if (key === 'adminLogs') {
        const rows = Array.isArray(data) ? data : [];
        const users = await prisma.user.findMany({ select: { id: true } });
        const userIds = new Set(users.map((u) => u.id));
        const safeRows = rows.filter((l) => l && userIds.has(l.adminId));
        await prisma.$transaction([
            prisma.adminLog.deleteMany({}),
            prisma.adminLog.createMany({
                data: safeRows.map((l) => ({
                    id: l.id,
                    adminId: l.adminId,
                    action: l.action,
                    targetId: l.targetId ?? null,
                    metadata: l.metadata == null ? null : (typeof l.metadata === 'string' ? l.metadata : JSON.stringify(l.metadata)),
                    createdAt: parseDateOrNow(l.createdAt),
                })),
                skipDuplicates: true,
            }),
        ]);
        return;
    }
    if (key === 'departments') {
        await upsertSetting('departments', Array.isArray(data) ? data : []);
        return;
    }
    if (key === 'departments_admins') {
        await upsertSetting('departments_admins', (data && typeof data === 'object' && !Array.isArray(data)) ? data : {});
        return;
    }

    throw new Error(`Unknown storage key: ${key}`);
};

const upsertById = (arr, row) => {
    const idx = arr.findIndex((item) => item.id === row.id);
    if (idx === -1) return [...arr, row];
    const copy = [...arr];
    copy[idx] = row;
    return copy;
};

const normalizeUsers = (users) => {
    const rows = Array.isArray(users) ? users : [];
    return rows.map((u) => ({
        ...u,
        email: String(u.email || '').trim(),
        role: enumOrFallback(['STUDENT', 'ALUMNI', 'ADMIN'], u.role, 'STUDENT'),
    }));
};

// Read all users merged from the three role-specific files
const readUsers = async () => {
    try {
        const users = await prisma.user.findMany();
        return users.map(mapUser);
    } catch (error) {
        // Fallback for deployments where DB schema is older than Prisma model.
        console.error('readUsers primary query failed; using legacy fallback:', error?.message || error);

        try {
            const users = await prisma.$queryRawUnsafe(
                'SELECT id, email, password, role, "isVerified", "createdAt", "updatedAt" FROM "User"'
            );
            return (Array.isArray(users) ? users : []).map((u) =>
                mapUser({
                    ...u,
                    isSuperAdmin: false,
                    alumniStatus: null,
                })
            );
        } catch (legacyError) {
            console.error('readUsers legacy "User" fallback failed:', legacyError?.message || legacyError);
        }

        try {
            const users = await prisma.$queryRawUnsafe(
                'SELECT id, email, password, role, is_verified AS "isVerified", created_at AS "createdAt", updated_at AS "updatedAt" FROM users'
            );
            return (Array.isArray(users) ? users : []).map((u) =>
                mapUser({
                    ...u,
                    isSuperAdmin: false,
                    alumniStatus: null,
                })
            );
        } catch (legacySnakeError) {
            console.error('readUsers legacy users fallback failed:', legacySnakeError?.message || legacySnakeError);
        }

        return [];
    }
};

const readStudents = async () => {
    const users = await readUsers();
    return users.filter((u) => String(u.role).toUpperCase() === 'STUDENT');
};

const readAdmins = async () => {
    const users = await readUsers();
    return users.filter((u) => String(u.role).toUpperCase() === 'ADMIN');
};

const readAlumni = async () => {
    const users = await readUsers();
    return users.filter((u) => String(u.role).toUpperCase() === 'ALUMNI');
};

// Write users split into the three role-specific files
const writeUsers = async (users) => {
    const rows = normalizeUsers(users);
    try {
        const existing = await prisma.user.findMany({ select: { id: true } });
        const incomingIds = new Set(rows.map((u) => u.id));
        const idsToDelete = existing.map((u) => u.id).filter((id) => !incomingIds.has(id));

        await prisma.$transaction(async (tx) => {
            if (idsToDelete.length > 0) {
                await tx.user.deleteMany({ where: { id: { in: idsToDelete } } });
            }

            for (const u of rows) {
                const role = enumOrFallback(['STUDENT', 'ALUMNI', 'ADMIN'], u.role, 'STUDENT');
                const normalizedAlumniStatus = u.alumniStatus
                    ? enumOrFallback(['PENDING', 'APPROVED', 'REJECTED', 'VERIFIED'], u.alumniStatus, 'PENDING')
                    : null;

                await tx.user.upsert({
                    where: { id: u.id },
                    create: {
                        id: u.id,
                        email: String(u.email || '').trim(),
                        password: u.password,
                        role,
                        isVerified: Boolean(u.isVerified),
                        isSuperAdmin: Boolean(u.isSuperAdmin),
                        alumniStatus: role === 'ALUMNI' ? normalizedAlumniStatus : null,
                        createdAt: parseDateOrNow(u.createdAt),
                    },
                    update: {
                        email: String(u.email || '').trim(),
                        password: u.password,
                        role,
                        isVerified: Boolean(u.isVerified),
                        isSuperAdmin: Boolean(u.isSuperAdmin),
                        alumniStatus: role === 'ALUMNI' ? normalizedAlumniStatus : null,
                        updatedAt: parseNullableDate(u.updatedAt),
                    },
                });
            }
        });
        return;
    } catch (error) {
        console.error('writeUsers primary write failed; using legacy fallback:', error?.message || error);
    }

    // Legacy fallback for deployments where User table misses newer columns.
    for (const u of rows) {
        const role = enumOrFallback(['STUDENT', 'ALUMNI', 'ADMIN'], u.role, 'STUDENT');
        const email = String(u.email || '').trim();
        const password = u.password;
        const isVerified = Boolean(u.isVerified);
        const createdAt = parseDateOrNow(u.createdAt);
        const updatedAt = parseNullableDate(u.updatedAt) || new Date();
        let lastLegacyError = null;

        try {
            await prisma.$executeRawUnsafe(
                `
                INSERT INTO "User" (id, email, password, role, "isVerified", "createdAt", "updatedAt")
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (id)
                DO UPDATE SET
                  email = EXCLUDED.email,
                  password = EXCLUDED.password,
                  role = EXCLUDED.role,
                  "isVerified" = EXCLUDED."isVerified",
                  "updatedAt" = EXCLUDED."updatedAt"
                `,
                u.id,
                email,
                password,
                role,
                isVerified,
                createdAt,
                updatedAt
            );
            continue;
        } catch (camelError) {
            console.error('writeUsers legacy "User" fallback failed:', camelError?.message || camelError);
            lastLegacyError = camelError;
        }

        try {
            await prisma.$executeRawUnsafe(
                `
                INSERT INTO "User" (id, email, password, role, "isVerified", "createdAt", "updatedAt")
                VALUES ($1, $2, $3, $4::"Role", $5, $6, $7)
                ON CONFLICT (id)
                DO UPDATE SET
                  email = EXCLUDED.email,
                  password = EXCLUDED.password,
                  role = EXCLUDED.role,
                  "isVerified" = EXCLUDED."isVerified",
                  "updatedAt" = EXCLUDED."updatedAt"
                `,
                u.id,
                email,
                password,
                role,
                isVerified,
                createdAt,
                updatedAt
            );
            continue;
        } catch (camelEnumError) {
            console.error('writeUsers legacy "User" enum-cast fallback failed:', camelEnumError?.message || camelEnumError);
            lastLegacyError = camelEnumError;
        }

        try {
            await prisma.$executeRawUnsafe(
                `
                INSERT INTO users (id, email, password, role, is_verified, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (id)
                DO UPDATE SET
                  email = EXCLUDED.email,
                  password = EXCLUDED.password,
                  role = EXCLUDED.role,
                  is_verified = EXCLUDED.is_verified,
                  updated_at = EXCLUDED.updated_at
                `,
                u.id,
                email,
                password,
                role,
                isVerified,
                createdAt,
                updatedAt
            );
            continue;
        } catch (snakeError) {
            console.error('writeUsers legacy users fallback failed:', snakeError?.message || snakeError);
            lastLegacyError = snakeError;
        }

        try {
            await prisma.$executeRawUnsafe(
                `
                INSERT INTO users (id, email, password, role, is_verified, created_at, updated_at)
                VALUES ($1, $2, $3, $4::role, $5, $6, $7)
                ON CONFLICT (id)
                DO UPDATE SET
                  email = EXCLUDED.email,
                  password = EXCLUDED.password,
                  role = EXCLUDED.role,
                  is_verified = EXCLUDED.is_verified,
                  updated_at = EXCLUDED.updated_at
                `,
                u.id,
                email,
                password,
                role,
                isVerified,
                createdAt,
                updatedAt
            );
            continue;
        } catch (snakeEnumError) {
            console.error('writeUsers legacy users enum-cast fallback failed:', snakeEnumError?.message || snakeEnumError);
            lastLegacyError = snakeEnumError;
        }

        throw lastLegacyError || new Error('Legacy user upsert failed');
    }
};

const writeStudents = async (students) => {
    const [admins, alumni] = await Promise.all([readAdmins(), readAlumni()]);
    const nextStudents = normalizeUsers(students).map((u) => ({ ...u, role: 'STUDENT' }));
    return writeUsers([...admins, ...alumni, ...nextStudents]);
};

const writeAdmins = async (admins) => {
    const [students, alumni] = await Promise.all([readStudents(), readAlumni()]);
    const nextAdmins = normalizeUsers(admins).map((u) => ({ ...u, role: 'ADMIN' }));
    return writeUsers([...students, ...alumni, ...nextAdmins]);
};

const writeAlumni = async (alumni) => {
    const [students, admins] = await Promise.all([readStudents(), readAdmins()]);
    const nextAlumni = normalizeUsers(alumni).map((u) => ({ ...u, role: 'ALUMNI' }));
    return writeUsers([...students, ...admins, ...nextAlumni]);
};

module.exports = {
    FILES,
    readJson,
    queueWrite,
    upsertById,
    readUsers,
    readStudents,
    readAdmins,
    readAlumni,
    writeUsers,
    writeStudents,
    writeAdmins,
    writeAlumni,
    getUniversityName,
    isUniversityNameLocked,
    setUniversityName,
};
