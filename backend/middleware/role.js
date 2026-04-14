const normalizeRoleAlias = (role) => {
    const value = String(role || '').toUpperCase();
    if (value === 'ALUMIN') return 'ALUMNI';
    return value;
};

const requireRole = (...roles) => {
    const normalizedAllowedRoles = roles.map(normalizeRoleAlias);
    return (req, res, next) => {
        const userRole = normalizeRoleAlias(req.user?.role);
        if (!req.user || !normalizedAllowedRoles.includes(userRole)) {
            return res.status(403).json({ message: `Access denied. Requires one of: ${roles.join(', ')}` });
        }
        next();
    };
};

const adminOnly = (req, res, next) => {
    if (!req.user || req.user.role !== 'ADMIN') {
        return res.status(403).json({ message: 'Access denied. Admin only.' });
    }
    next();
};

const alumniOnly = (req, res, next) => {
    const userRole = normalizeRoleAlias(req.user?.role);
    if (!req.user || (userRole !== 'ALUMNI' && userRole !== 'ADMIN')) {
        return res.status(403).json({ message: 'Access denied. Alumni only.' });
    }
    next();
};

module.exports = { requireRole, adminOnly, alumniOnly };
