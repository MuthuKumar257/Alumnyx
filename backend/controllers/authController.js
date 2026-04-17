const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { readJson, queueWrite, readUsers, writeUsers, getUniversityName } = require('../storage/jsonStorage');
const { withProfile, sanitizeUser, nowIso } = require('../storage/viewHelpers');

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

const generateToken = (id) =>
    jwt.sign({ id }, process.env.JWT_SECRET || 'alumnyx_jwt_secret', { expiresIn: '30d' });

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

        await writeUsers([...users, user]);
        await safeQueueProfilesWrite([...profiles, profile]);

        // Do NOT return a token — account must be approved by admin first
        res.status(201).json({ message: 'Registration successful. Your account is pending admin approval. You will be able to log in once approved.' });
    } catch (error) {
        console.error('Alumni register error:', error);
        res.status(500).json({ message: 'Server error during registration' });
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

        await writeUsers([...users, user]);
        await safeQueueProfilesWrite([...profiles, profile]);

        const safe = sanitizeUser(withProfile(user, [...profiles, profile]));
        res.status(201).json({ ...safe, token: generateToken(user.id) });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ message: 'Server error during registration' });
    }
};

const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body || {};
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        const users = await readUsers();
        const normalizedEmail = String(email).trim().toLowerCase();
        const user = users.find((u) => String(u?.email || '').toLowerCase() === normalizedEmail);

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
        res.json({ ...safe, token: generateToken(user.id) });
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

        if (!user) return res.status(404).json({ message: 'User not found' });

        const safe = sanitizeUser(withProfile(user, profiles));
        res.json(safe);
    } catch (error) {
        console.error('GetMe error:', error);
        res.status(500).json({ message: 'Server error' });
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

module.exports = { registerUser, alumniRegister, loginUser, getMe, checkEmailExists };
