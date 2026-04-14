const { v4: uuidv4 } = require('uuid');
const { readJson, queueWrite, readUsers } = require('../storage/jsonStorage');
const { nowIso, containsCI } = require('../storage/viewHelpers');

const toProfileView = (profile, users) => {
    const user = users.find((u) => u.id === profile.userId);
    return {
        ...profile,
        email: user?.email || null,
        role: user?.role || null,
        isVerified: user?.isVerified || false,
    };
};

const getProfileById = async (req, res) => {
    try {
        const profiles = await readJson('profiles');
        const users = await readUsers();

        const profile = profiles.find((p) => p.id === req.params.id || p.userId === req.params.id);
        if (!profile) return res.status(404).json({ message: 'Profile not found' });

        res.json(toProfileView(profile, users));
    } catch (error) {
        console.error('GetProfileById error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const createProfile = async (req, res) => {
    try {
        const { userId, name, email, college, graduationYear, skills, company, bio, profileImage } = req.body;
        const users = await readUsers();
        const profiles = await readJson('profiles');

        let ownerId = userId || req.user?.id;
        if (!ownerId && email) {
            const found = users.find((u) => u.email.toLowerCase() === String(email).toLowerCase());
            ownerId = found?.id;
        }
        if (!ownerId) return res.status(400).json({ message: 'userId (or authenticated user) is required' });

        const exists = profiles.find((p) => p.userId === ownerId);
        if (exists) return res.status(400).json({ message: 'Profile already exists for this user' });

        const [firstName, ...rest] = String(name || '').trim().split(' ');
        const lastName = rest.join(' ').trim();
        const profile = {
            id: uuidv4(),
            userId: ownerId,
            firstName: firstName || '',
            lastName: lastName || '',
            college: college || null,
            graduationYear: graduationYear ? parseInt(graduationYear, 10) : null,
            skills: Array.isArray(skills)
                ? skills
                : String(skills || '').split(',').map((s) => s.trim()).filter(Boolean),
            currentCompany: company || null,
            bio: bio || null,
            profilePicture: profileImage || null,
            resumeUrl: req.body.resumeUrl || null,
            createdAt: nowIso(),
            updatedAt: nowIso(),
        };

        await queueWrite('profiles', [...profiles, profile]);
        res.status(201).json(toProfileView(profile, users));
    } catch (error) {
        console.error('CreateProfile error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const updateProfileById = async (req, res) => {
    try {
        const profiles = await readJson('profiles');
        const users = await readUsers();

        const idx = profiles.findIndex((p) => p.id === req.params.id || p.userId === req.params.id);
        if (idx === -1) return res.status(404).json({ message: 'Profile not found' });

        const current = profiles[idx];
        const name = req.body.name;
        let firstName = current.firstName;
        let lastName = current.lastName;
        if (name !== undefined) {
            const [f, ...rest] = String(name || '').trim().split(' ');
            firstName = f || '';
            lastName = rest.join(' ').trim();
        }

        const updated = {
            ...current,
            firstName,
            lastName,
            college: req.body.college !== undefined ? req.body.college : current.college,
            graduationYear: req.body.graduationYear !== undefined
                ? (req.body.graduationYear ? parseInt(req.body.graduationYear, 10) : null)
                : current.graduationYear,
            skills: req.body.skills !== undefined
                ? (Array.isArray(req.body.skills)
                    ? req.body.skills
                    : String(req.body.skills).split(',').map((s) => s.trim()).filter(Boolean))
                : current.skills,
            currentCompany: req.body.company !== undefined ? req.body.company : (req.body.currentCompany !== undefined ? req.body.currentCompany : current.currentCompany),
            bio: req.body.bio !== undefined ? req.body.bio : current.bio,
            profilePicture: req.body.profileImage !== undefined ? req.body.profileImage : (req.body.profilePicture !== undefined ? req.body.profilePicture : current.profilePicture),
            resumeUrl: req.body.resumeUrl !== undefined ? req.body.resumeUrl : current.resumeUrl,
            updatedAt: nowIso(),
        };

        const nextProfiles = [...profiles];
        nextProfiles[idx] = updated;
        await queueWrite('profiles', nextProfiles);
        res.json(toProfileView(updated, users));
    } catch (error) {
        console.error('UpdateProfileById error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getAlumniList = async (req, res) => {
    try {
        const { company, graduationYear } = req.query;
        const users = await readUsers();
        const profiles = await readJson('profiles');

        const alumniUsers = users.filter((u) => u.role === 'ALUMNI');
        let data = alumniUsers.map((u) => toProfileView(profiles.find((p) => p.userId === u.id) || {
            id: null,
            userId: u.id,
            firstName: '',
            lastName: '',
            college: null,
            graduationYear: null,
            skills: [],
            currentCompany: null,
            bio: null,
            profilePicture: null,
            resumeUrl: null,
        }, users));

        if (company) data = data.filter((p) => containsCI(p.currentCompany, company));
        if (graduationYear) data = data.filter((p) => String(p.graduationYear || '') === String(graduationYear));

        res.json(data);
    } catch (error) {
        console.error('GetAlumniList error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const searchAlumni = async (req, res) => {
    try {
        const q = req.query.q || req.query.name || req.query.search || '';
        const users = await readUsers();
        const profiles = await readJson('profiles');
        const alumniUsers = users.filter((u) => u.role === 'ALUMNI');

        const data = alumniUsers
            .map((u) => toProfileView(profiles.find((p) => p.userId === u.id) || { userId: u.id, firstName: '', lastName: '', currentCompany: null, graduationYear: null }, users))
            .filter((p) => containsCI(`${p.firstName} ${p.lastName}`, q));

        res.json(data);
    } catch (error) {
        console.error('SearchAlumni error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    getProfileById,
    createProfile,
    updateProfileById,
    getAlumniList,
    searchAlumni,
};
