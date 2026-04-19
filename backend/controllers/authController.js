const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs/promises');
const path = require('path');
const prisma = require('../config/prisma');
const { readJson, queueWrite, readUsers, writeUsers, getUniversityName } = require('../storage/jsonStorage');
const { withProfile, sanitizeUser, nowIso } = require('../storage/viewHelpers');

const FALLBACK_USERS_FILE = path.join(__dirname, '..', 'storage', 'fallback_users.json');

const readFallbackUsers = async () => {
    try {
        const raw = await fs.readFile(FALLBACK_USERS_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

const writeFallbackUsers = async (users) => {
    const rows = Array.isArray(users) ? users : [];
    const tmpFile = `${FALLBACK_USERS_FILE}.tmp`;
    await fs.mkdir(path.dirname(FALLBACK_USERS_FILE), { recursive: true });
    await fs.writeFile(tmpFile, JSON.stringify(rows, null, 2), 'utf8');
    await fs.rename(tmpFile, FALLBACK_USERS_FILE);
};

const upsertFallbackUser = async (user) => {
    const users = await readFallbackUsers();
    const email = String(user?.email || '').toLowerCase();
    const idx = users.findIndex((u) => String(u?.email || '').toLowerCase() === email);
    if (idx >= 0) {
        users[idx] = { ...users[idx], ...user };
    } else {
        users.push(user);
    }
    await writeFallbackUsers(users);
};

const mergeUsersWithFallback = async (users) => {
    const primary = Array.isArray(users) ? users : [];
    const fallback = await readFallbackUsers();
    if (!fallback.length) return primary;

    const byEmail = new Map();
    for (const u of primary) {
        byEmail.set(String(u?.email || '').toLowerCase(), u);
    }
    for (const u of fallback) {
        const key = String(u?.email || '').toLowerCase();
        if (!byEmail.has(key)) {
            byEmail.set(key, u);
        }
    }
    return [...byEmail.values()];
};

const safeReadProfiles = async () => {
    try {
        return await readJson('profiles');
    } catch (error) {
        console.warn('Profiles unavailable; continuing without profile reads:', error?.message || error);
        return [];
    }
};

const safeQueueProfilesWrite = async (profiles) => {
    try {
        await queueWrite('profiles', profiles);
    } catch (error) {
        console.warn('Profiles write unavailable; user created without profile row:', error?.message || error);
    }
};

const safeGetUniversityName = async () => {
    try {
        return await getUniversityName();
    } catch (error) {
        console.warn('University setting unavailable; using fallback name:', error?.message || error);
        return 'Alumnyx University';
    }
};

const safePersistSingleUser = async (user) => {
    const id = String(user.id || '').trim();
    const email = String(user.email || '').trim();
    const password = user.password;
    const role = normalizeRole(user.role);
    const isVerified = Boolean(user.isVerified);
    const createdAt = user.createdAt ? new Date(user.createdAt) : new Date();
    const updatedAt = user.updatedAt ? new Date(user.updatedAt) : new Date();

    const attempts = [
        async () => {
            await prisma.user.upsert({
                where: { id },
                create: {
                    id,
                    email,
                    password,
                    role,
                    isVerified,
                    isSuperAdmin: Boolean(user.isSuperAdmin),
                    alumniStatus: role === 'ALUMNI' ? (user.alumniStatus || 'PENDING') : null,
                    createdAt,
                },
                update: {
                    email,
                    password,
                    role,
                    isVerified,
                    isSuperAdmin: Boolean(user.isSuperAdmin),
                    alumniStatus: role === 'ALUMNI' ? (user.alumniStatus || 'PENDING') : null,
                    updatedAt,
                },
            });
        },
        async () => {
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
                id,
                email,
                password,
                role,
                isVerified,
                createdAt,
                updatedAt
            );
        },
        async () => {
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
                id,
                email,
                password,
                role,
                isVerified,
                createdAt,
                updatedAt
            );
        },
        async () => {
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
                id,
                email,
                password,
                role,
                isVerified,
                createdAt,
                updatedAt
            );
        },
        async () => {
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
                id,
                email,
                password,
                role,
                isVerified,
                createdAt,
                updatedAt
            );
        },
    ];

    let lastError = null;
    for (const attempt of attempts) {
        try {
            await attempt();
            return;
        } catch (error) {
            lastError = error;
        }
    }

    throw lastError || new Error('Unable to persist user');
};

const generateToken = (user) => {
    const payload = {
        id: user?.id,
        email: user?.email,
        role: user?.role,
        isVerified: Boolean(user?.isVerified),
        isSuperAdmin: Boolean(user?.isSuperAdmin),
    };
    return jwt.sign(payload, process.env.JWT_SECRET || 'alumnyx_jwt_secret', { expiresIn: '30d' });
};

const normalizeRole = (role) => {
    const value = String(role || '').toUpperCase();
    if (['STUDENT', 'ALUMNI', 'ADMIN'].includes(value)) return value;
    return 'STUDENT';
};

const safeComparePassword = async (plainPassword, storedHash) => {
    try {
        if (typeof storedHash !== 'string' || storedHash.length === 0) return false;
        return await bcrypt.compare(plainPassword, storedHash);
    } catch {
        return false;
    }
};

const ensureDefaultAdminExists = async (users) => {
    const list = Array.isArray(users) ? users : [];
    const hasAdmin = list.some((u) => String(u?.email || '').toLowerCase() === 'admin@alumnyx.com');
    if (hasAdmin) {
        return list;
    }

    const timestamp = nowIso();
    const defaultAdmin = {
        id: uuidv4(),
        email: 'admin@alumnyx.com',
        password: await bcrypt.hash('password123', 10),
        role: 'ADMIN',
        isVerified: true,
        isSuperAdmin: true,
        alumniStatus: null,
        createdAt: timestamp,
        updatedAt: timestamp,
    };

    try {
        await writeUsers([...list, defaultAdmin]);
    } catch (error) {
        console.warn('Primary admin bootstrap write failed; using file fallback:', error?.message || error);
        await upsertFallbackUser(defaultAdmin);
    }
    console.log('Bootstrap: created missing default admin account.');
    return [...list, defaultAdmin];
};

const alumniRegister = async (req, res) => {
    try {
        const { email, password, firstName, lastName, college, graduationYear, department } = req.body;

        if (!email || !password || !firstName) {
            return res.status(400).json({ message: 'First name, email, and password are required' });
        }

        const users = await readUsers();
        const profiles = await safeReadProfiles();
        const universityName = await safeGetUniversityName();

        const existing = users.find((u) => u.email.toLowerCase() === String(email).toLowerCase());
        if (existing) {
            return res.status(400).json({ message: 'An account with this email already exists' });
        }

        const id = uuidv4();
        const timestamp = nowIso();
        const hashedPassword = await bcrypt.hash(password, 10);

        const user = {
            id,
            email: String(email).trim(),
            password: hashedPassword,
            role: 'ALUMNI',
            isVerified: false,
            alumniStatus: 'PENDING',
            createdAt: timestamp,
            updatedAt: timestamp,
        };

        const profile = {
            id: uuidv4(),
            userId: id,
            firstName: String(firstName).trim(),
            lastName: lastName ? String(lastName).trim() : '',
            college: universityName,
            graduationYear: graduationYear ? parseInt(graduationYear, 10) : null,
            department: department || null,
            skills: [],
            currentCompany: null,
            bio: null,
            profilePicture: null,
            resumeUrl: null,
        };

        try {
            await writeUsers([...users, user]);
        } catch (writeError) {
            console.warn('Bulk user write failed during alumni register; trying single-user fallback:', writeError?.message || writeError);
            await safePersistSingleUser(user);
        }
        await safeQueueProfilesWrite([...profiles, profile]);

        // Do NOT return a token — account must be approved by admin first
        res.status(201).json({ message: 'Registration successful. Your account is pending admin approval. You will be able to log in once approved.' });
    } catch (error) {
        console.error('Alumni register error:', error);
        res.status(500).json({
            message: 'Server error during registration',
            detail: String(error?.message || 'unknown error').slice(0, 300),
        });
    }
};

const registerUser = async (req, res) => {
    try {
        const { email, password, role, firstName, lastName, college, graduationYear } = req.body;

        if (!email || !password || !firstName || !lastName) {
            return res.status(400).json({ message: 'Email, password, first name, and last name are required' });
        }

        const users = await readUsers();
        const profiles = await safeReadProfiles();
        const universityName = await safeGetUniversityName();

        const existingUser = users.find((u) => u.email.toLowerCase() === String(email).toLowerCase());
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists with this email' });
        }

        const id = uuidv4();
        const timestamp = nowIso();
        const hashedPassword = await bcrypt.hash(password, 10);

        const userRole = normalizeRole(role);
        const user = {
            id,
            email: String(email).trim(),
            password: hashedPassword,
            role: userRole,
            isVerified: userRole === 'ADMIN',
            isSuperAdmin: false,
            alumniStatus: userRole === 'ALUMNI' ? 'PENDING' : null,
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
            skills: [],
            currentCompany: null,
            bio: null,
            profilePicture: null,
            resumeUrl: null,
        };

        try {
            await writeUsers([...users, user]);
        } catch (writeError) {
            console.warn('Bulk user write failed during register; trying single-user fallback:', writeError?.message || writeError);
            await safePersistSingleUser(user);
        }
        await safeQueueProfilesWrite([...profiles, profile]);

        const safe = sanitizeUser(withProfile(user, [...profiles, profile]));
        res.status(201).json({ ...safe, token: generateToken(user) });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({
            message: 'Server error during registration',
            detail: String(error?.message || 'unknown error').slice(0, 300),
        });
    }
};

const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body || {};
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        let users = await readUsers();
        users = await mergeUsersWithFallback(users);

        // Bootstrap a default admin for fresh deployments with an empty user store.
        if (!Array.isArray(users) || users.length === 0) {
            try {
                users = await ensureDefaultAdminExists([]);
                console.log('Bootstrap: created default admin account for empty user store.');
            } catch (bootstrapError) {
                console.error('Bootstrap admin creation failed:', bootstrapError?.message || bootstrapError);
            }
        }

        const normalizedEmail = String(email).trim().toLowerCase();
        let user = users.find((u) => String(u?.email || '').toLowerCase() === normalizedEmail);

        // If deployment has data but misses the default admin, auto-create it on first admin login attempt.
        if (!user && normalizedEmail === 'admin@alumnyx.com') {
            try {
                users = await ensureDefaultAdminExists(users);
                user = users.find((u) => String(u?.email || '').toLowerCase() === normalizedEmail);
            } catch (bootstrapError) {
                console.error('Bootstrap admin creation failed:', bootstrapError?.message || bootstrapError);
            }
        }

        const isPasswordValid = user ? await safeComparePassword(password, user.password) : false;
        if (!user || !isPasswordValid) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Block alumni who are not yet verified
        if (user.role === 'ALUMNI' && !['APPROVED', 'VERIFIED'].includes(String(user.alumniStatus || '').toUpperCase())) {
            if (user.alumniStatus === 'REJECTED') {
                return res.status(403).json({ message: 'Your alumni application has been rejected. Please contact the administrator.' });
            }
            return res.status(403).json({ message: 'Your account is pending admin approval. You will be notified once approved.' });
        }

        // Profile data is optional for login response; do not fail auth if profile read fails.
        let profiles = [];
        try {
            profiles = await readJson('profiles');
        } catch (profileError) {
            console.warn('Login profile enrichment skipped:', profileError?.message || profileError);
        }

        const safe = sanitizeUser(withProfile(user, profiles));
        res.json({ ...safe, token: generateToken(user) });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error during login' });
    }
};

const getMe = async (req, res) => {
    try {
        const users = await readUsers();
        const profiles = await readJson('profiles');
        const user = users.find((u) => u.id === req.user.id);

        if (!user) {
            return res.status(200).json({
                id: req.user?.id || null,
                email: req.user?.email || null,
                role: req.user?.role || null,
                isVerified: Boolean(req.user?.isVerified),
                isSuperAdmin: Boolean(req.user?.isSuperAdmin),
                profile: null,
                warning: 'User profile not found in storage; returning token payload',
            });
        }

        const safe = sanitizeUser(withProfile(user, profiles));
        res.json(safe);
    } catch (error) {
        console.error('GetMe error:', error);
        // Keep auth sessions usable even if profile/user enrichment fails.
        res.status(200).json({
            id: req.user?.id || null,
            email: req.user?.email || null,
            role: req.user?.role || null,
            isVerified: Boolean(req.user?.isVerified),
            isSuperAdmin: Boolean(req.user?.isSuperAdmin),
            profile: null,
            warning: 'Partial user response: profile enrichment unavailable',
        });
    }
};

const checkEmailExists = async (req, res) => {
    try {
        const email = String(req.query?.email || '').trim().toLowerCase();
        if (!email) {
            return res.status(400).json({ message: 'Email query parameter is required' });
        }

        const users = await readUsers();
        const exists = users.some((u) => String(u?.email || '').toLowerCase() === email);

        res.json({ email, exists });
    } catch (error) {
        console.error('Check email exists error:', error);
        res.status(500).json({ message: 'Server error while checking email' });
    }
};

const bootstrapAdmin = async (req, res) => {
    try {
        const expectedKey = String(process.env.BOOTSTRAP_ADMIN_KEY || '').trim();
        const providedKey = String(req.headers['x-bootstrap-key'] || req.body?.bootstrapKey || '').trim();

        if (expectedKey && providedKey !== expectedKey) {
            return res.status(403).json({ message: 'Invalid bootstrap key' });
        }

        const requestedEmail = String(req.body?.email || 'admin@alumnyx.com').trim().toLowerCase();
        if (requestedEmail !== 'admin@alumnyx.com') {
            return res.status(400).json({ message: 'Only the default admin account can be bootstrapped' });
        }

        const forceResetPassword = Boolean(req.body?.forceResetPassword);
        const requestedPassword = String(req.body?.password || 'password123').trim();
        if (!requestedPassword) {
            return res.status(400).json({ message: 'Password cannot be empty' });
        }

        const now = nowIso();
        const users = await readUsers();
        const existingAdmin = users.find((u) => String(u?.email || '').toLowerCase() === 'admin@alumnyx.com');

        if (existingAdmin && !forceResetPassword) {
            return res.json({
                message: 'Admin account already exists',
                email: 'admin@alumnyx.com',
                created: false,
                passwordReset: false,
            });
        }

        const adminUser = {
            id: existingAdmin?.id || uuidv4(),
            email: 'admin@alumnyx.com',
            password: await bcrypt.hash(requestedPassword, 10),
            role: 'ADMIN',
            isVerified: true,
            isSuperAdmin: true,
            alumniStatus: null,
            createdAt: existingAdmin?.createdAt || now,
            updatedAt: now,
        };

        try {
            await safePersistSingleUser(adminUser);
        } catch (persistError) {
            console.warn('Primary admin persist failed; using file fallback:', persistError?.message || persistError);
            await upsertFallbackUser(adminUser);
        }

        return res.status(existingAdmin ? 200 : 201).json({
            message: existingAdmin ? 'Admin password reset successfully' : 'Admin account bootstrapped successfully',
            email: 'admin@alumnyx.com',
            created: !existingAdmin,
            passwordReset: true,
        });
    } catch (error) {
        console.error('Bootstrap admin error:', error);
        return res.status(500).json({
            message: 'Server error during bootstrap-admin',
            detail: String(error?.message || error).slice(0, 300),
        });
    }
};

module.exports = { registerUser, alumniRegister, loginUser, getMe, checkEmailExists, bootstrapAdmin };
