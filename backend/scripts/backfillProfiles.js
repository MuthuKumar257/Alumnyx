const { v4: uuidv4 } = require('uuid');
const prisma = require('../config/prisma');
const { getUniversityName } = require('../storage/jsonStorage');

function deriveNamesFromEmail(email = '') {
    const local = String(email).split('@')[0] || 'user';
    const cleaned = local.replace(/[._-]+/g, ' ').trim();
    const parts = cleaned.split(' ').filter(Boolean);
    if (!parts.length) return { firstName: 'User', lastName: '' };
    const firstName = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    const lastName = parts.slice(1).join(' ');
    return { firstName, lastName };
}

async function main() {
    const universityName = await getUniversityName();

    const users = await prisma.user.findMany({
        select: { id: true, email: true },
    });

    const profiles = await prisma.profile.findMany({
        select: { userId: true },
    });

    const existing = new Set(profiles.map((p) => p.userId));
    const missing = users.filter((u) => !existing.has(u.id));

    if (!missing.length) {
        console.log('No missing profiles. Nothing to backfill.');
        return;
    }

    const now = new Date();
    const rows = missing.map((u) => {
        const { firstName, lastName } = deriveNamesFromEmail(u.email);
        return {
            id: uuidv4(),
            userId: u.id,
            firstName,
            lastName,
            college: universityName,
            department: null,
            graduationYear: null,
            skills: [],
            currentCompany: null,
            bio: null,
            profilePicture: null,
            createdAt: now,
            updatedAt: now,
        };
    });

    await prisma.profile.createMany({ data: rows, skipDuplicates: true });
    console.log(`Backfilled ${rows.length} profiles.`);
}

main()
    .catch((e) => {
        console.error('Backfill failed:', e.message || e);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
