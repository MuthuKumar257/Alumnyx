const jwt = require('jsonwebtoken');
const { readJson, readUsers } = require('../storage/jsonStorage');

const SUPER_ADMIN_EMAILS = ['admin@alumnyx.com', 'superadmin@alumnyx.com'];

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'alumnyx_jwt_secret');

            const users = await readUsers();
            const user = users.find((u) => u.id === decoded.id);

            if (!user) return res.status(401).json({ message: 'User not found, not authorized' });

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
    } else {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};

module.exports = { protect };
