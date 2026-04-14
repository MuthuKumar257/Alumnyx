const fs = require('fs/promises');
const path = require('path');
const prisma = require('./config/prisma');

const STORAGE_DIR = path.join(__dirname, 'storage');

const FILES = {
    users: 'users.json',
    admins: 'admins.json',
    alumni: 'alumni.json',
    students: 'students.json',
    profiles: 'profiles.json',
    jobs: 'jobs.json',
    jobApplications: 'job_applications.json',
    mentorshipRequests: 'mentorship_requests.json',
    messages: 'messages.json',
    posts: 'posts.json',
    adminLogs: 'admin_logs.json',
    departments: 'departments.json',
    departments_admins: 'departments_admins.json',
};

const readJsonFile = async (fileName, fallback) => {
    const filePath = path.join(STORAGE_DIR, fileName);
    try {
        const raw = await fs.readFile(filePath, 'utf8');
        if (!raw.trim()) return fallback;
        const parsed = JSON.parse(raw);
        if (Array.isArray(fallback)) return Array.isArray(parsed) ? parsed : fallback;
        if (fallback && typeof fallback === 'object') return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : fallback;
        return parsed;
    } catch {
        return fallback;
    }
};

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

const enumOrFallback = (allowed, value, fallback) => {
    const normalized = String(value || '').toUpperCase();
    return allowed.includes(normalized) ? normalized : fallback;
};

const mergeUsers = (usersFile, admins, alumni, students) => {
    const map = new Map();
    for (const user of [...usersFile, ...admins, ...alumni, ...students]) {
        if (!user || !user.id || !user.email) continue;
        map.set(user.id, user);
    }
    return Array.from(map.values());
};

const main = async () => {
    const usersFile = await readJsonFile(FILES.users, []);
    const admins = await readJsonFile(FILES.admins, []);
    const alumni = await readJsonFile(FILES.alumni, []);
    const students = await readJsonFile(FILES.students, []);
    const profiles = await readJsonFile(FILES.profiles, []);
    const jobs = await readJsonFile(FILES.jobs, []);
    const jobApplications = await readJsonFile(FILES.jobApplications, []);
    const mentorshipRequests = await readJsonFile(FILES.mentorshipRequests, []);
    const messages = await readJsonFile(FILES.messages, []);
    const posts = await readJsonFile(FILES.posts, []);
    const adminLogs = await readJsonFile(FILES.adminLogs, []);
    const departments = await readJsonFile(FILES.departments, []);
    const departmentsAdmins = await readJsonFile(FILES.departments_admins, {});

    const users = mergeUsers(usersFile, admins, alumni, students);
    const userIds = new Set(users.map((u) => u.id));

    const safeProfiles = profiles.filter((p) => p && userIds.has(p.userId));
    const safeJobs = jobs.filter((j) => j && userIds.has(j.posterId));
    const jobIds = new Set(safeJobs.map((j) => j.id));
    const safeJobApplications = jobApplications.filter((a) => a && jobIds.has(a.jobId) && userIds.has(a.applicantId));
    const safeMentorshipRequests = mentorshipRequests.filter((m) => m && userIds.has(m.studentId) && userIds.has(m.mentorId));
    const safeMessages = messages.filter((m) => m && userIds.has(m.senderId) && userIds.has(m.receiverId));
    const safePosts = posts.filter((p) => p && userIds.has(p.authorId));
    const safeAdminLogs = adminLogs.filter((l) => l && userIds.has(l.adminId));

    await prisma.$transaction(async (tx) => {
        await tx.postLike.deleteMany({});
        await tx.post.deleteMany({});
        await tx.message.deleteMany({});
        await tx.mentorshipRequest.deleteMany({});
        await tx.jobApplication.deleteMany({});
        await tx.job.deleteMany({});
        await tx.adminLog.deleteMany({});
        await tx.profile.deleteMany({});
        await tx.user.deleteMany({});

        if (users.length) {
            await tx.user.createMany({
                data: users.map((u) => ({
                    id: u.id,
                    email: String(u.email || '').trim().toLowerCase(),
                    password: u.password,
                    role: enumOrFallback(['STUDENT', 'ALUMNI', 'ADMIN'], u.role, 'STUDENT'),
                    isVerified: Boolean(u.isVerified),
                    isSuperAdmin: Boolean(u.isSuperAdmin),
                    alumniStatus: u.alumniStatus
                        ? enumOrFallback(['PENDING', 'APPROVED', 'REJECTED', 'VERIFIED'], u.alumniStatus, 'PENDING')
                        : null,
                    createdAt: parseDateOrNow(u.createdAt),
                    updatedAt: parseNullableDate(u.updatedAt),
                })),
                skipDuplicates: true,
            });
        }

        if (safeProfiles.length) {
            await tx.profile.createMany({
            data: safeProfiles.map((p) => ({
                    id: p.id,
                    userId: p.userId,
                    firstName: p.firstName || '',
                    lastName: p.lastName || '',
                    college: p.college ?? null,
                    department: p.department ?? null,
                    graduationYear: p.graduationYear != null ? Number(p.graduationYear) : null,
                    skills: Array.isArray(p.skills) ? p.skills.map((s) => String(s)) : [],
                    currentCompany: p.currentCompany ?? null,
                    bio: p.bio ?? null,
                    profilePicture: p.profilePicture ?? null,
                    createdAt: parseDateOrNow(p.createdAt),
                    updatedAt: parseNullableDate(p.updatedAt),
                })),
                skipDuplicates: true,
            });
        }

        if (safeJobs.length) {
            await tx.job.createMany({
            data: safeJobs.map((j) => ({
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
            });
        }

        if (safeJobApplications.length) {
            await tx.jobApplication.createMany({
            data: safeJobApplications.map((a) => ({
                    id: a.id,
                    jobId: a.jobId,
                    applicantId: a.applicantId,
                    status: enumOrFallback(['PENDING', 'REVIEWED', 'ACCEPTED', 'REJECTED'], a.status, 'PENDING'),
                    coverNote: a.coverNote ?? null,
                    createdAt: parseDateOrNow(a.createdAt),
                    updatedAt: parseNullableDate(a.updatedAt),
                })),
                skipDuplicates: true,
            });
        }

        if (safeMentorshipRequests.length) {
            await tx.mentorshipRequest.createMany({
            data: safeMentorshipRequests.map((m) => ({
                    id: m.id,
                    studentId: m.studentId,
                    mentorId: m.mentorId,
                    status: enumOrFallback(['PENDING', 'ACCEPTED', 'REJECTED'], m.status, 'PENDING'),
                    message: m.message ?? null,
                    createdAt: parseDateOrNow(m.createdAt),
                    updatedAt: parseNullableDate(m.updatedAt),
                })),
                skipDuplicates: true,
            });
        }

        if (safeMessages.length) {
            await tx.message.createMany({
            data: safeMessages.map((m) => ({
                    id: m.id,
                    senderId: m.senderId,
                    receiverId: m.receiverId,
                    content: m.content,
                    isRead: Boolean(m.isRead),
                    createdAt: parseDateOrNow(m.createdAt),
                })),
                skipDuplicates: true,
            });
        }

        for (const p of safePosts) {
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
                    data: { postId: p.id, userId },
                }).catch(() => undefined);
            }
        }

        if (safeAdminLogs.length) {
            await tx.adminLog.createMany({
            data: safeAdminLogs.map((l) => ({
                    id: l.id,
                    adminId: l.adminId,
                    action: l.action,
                    targetId: l.targetId ?? null,
                    metadata: l.metadata == null ? null : (typeof l.metadata === 'string' ? l.metadata : JSON.stringify(l.metadata)),
                    createdAt: parseDateOrNow(l.createdAt),
                })),
                skipDuplicates: true,
            });
        }

        await tx.appSetting.upsert({
            where: { key: 'departments' },
            update: { valueJson: Array.isArray(departments) ? departments : [] },
            create: { key: 'departments', valueJson: Array.isArray(departments) ? departments : [] },
        });

        await tx.appSetting.upsert({
            where: { key: 'departments_admins' },
            update: {
                valueJson: departmentsAdmins && typeof departmentsAdmins === 'object' && !Array.isArray(departmentsAdmins)
                    ? departmentsAdmins
                    : {},
            },
            create: {
                key: 'departments_admins',
                valueJson: departmentsAdmins && typeof departmentsAdmins === 'object' && !Array.isArray(departmentsAdmins)
                    ? departmentsAdmins
                    : {},
            },
        });
    });

    console.log('Migration complete: JSON storage imported into PostgreSQL.');
};

main()
    .catch((error) => {
        console.error('Migration failed:', error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
