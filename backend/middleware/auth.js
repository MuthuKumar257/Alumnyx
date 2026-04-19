const jwt = require('jsonwebtoken');
const fs = require('fs/promises');
const path = require('path');
const { readJson, readUsers } = require('../storage/jsonStorage');

const SUPER_ADMIN_EMAILS = ['admin@alumnyx.com', 'superadmin@alumnyx.com'];
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

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
        } catch (error) {
            console.error('Auth middleware error:', error);
            res.status(401).json({ message: 'Not authorized, token failed' });
            return;
        }
    } else {
        token = String(req.body?.token || req.query?.token || '').trim();
    }

    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token' });
        return;
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'alumnyx_jwt_secret');

        const [users, fallbackUsers] = await Promise.all([readUsers(), readFallbackUsers()]);
        const primary = Array.isArray(users) ? users : [];
        const fallback = Array.isArray(fallbackUsers) ? fallbackUsers : [];

        let user = primary.find((u) => u.id === decoded.id);
        if (!user) {
            user = fallback.find((u) => u.id === decoded.id);
        }
        if (!user && decoded?.email) {
            const normalizedEmail = String(decoded.email).toLowerCase();
            user = primary.find((u) => String(u?.email || '').toLowerCase() === normalizedEmail)
                || fallback.find((u) => String(u?.email || '').toLowerCase() === normalizedEmail);
        }

        if (!user) {
            res.status(401).json({ message: 'User not found, not authorized' });
            return;
        }

        req.user = {
            id: user.id,
            email: user.email,
            role: user.role,
            isVerified: user.isVerified,
            isSuperAdmin: Boolean(user.isSuperAdmin || SUPER_ADMIN_EMAILS.includes(String(user.email || '').toLowerCase())),
        };
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(401).json({ message: 'Not authorized, token failed' });
    }
};

module.exports = { protect };
