const prisma = require('../config/prisma');

async function main() {
    const [users, profiles, jobs, posts, messages] = await Promise.all([
        prisma.user.count(),
        prisma.profile.count(),
        prisma.job.count(),
        prisma.post.count(),
        prisma.message.count(),
    ]);

    console.log('PostgreSQL counts');
    console.log(JSON.stringify({ users, profiles, jobs, posts, messages }, null, 2));
}

main()
    .catch((e) => {
        console.error('DB check failed:', e.message || e);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
