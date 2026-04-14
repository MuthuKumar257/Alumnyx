const withProfile = (user, profiles) => {
    const profile = profiles.find((p) => p.userId === user.id) || null;
    return { ...user, profile };
};

const sanitizeUser = (userWithProfile) => {
    const { password, ...safe } = userWithProfile;
    return safe;
};

const nowIso = () => new Date().toISOString();

const containsCI = (value, needle) =>
    String(value || '').toLowerCase().includes(String(needle || '').toLowerCase());

module.exports = {
    withProfile,
    sanitizeUser,
    nowIso,
    containsCI,
};
