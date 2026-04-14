const { v4: uuidv4 } = require('uuid');
const prisma = require('../config/prisma');

const sampleJobs = [
    {
        title: 'Frontend Developer (React Native)',
        company: 'Nexa Digital',
        location: 'Chennai, India (Hybrid)',
        description: 'Build and maintain cross-platform mobile features for alumni networking workflows.',
        requirements: 'React Native, TypeScript, REST APIs, Git',
        salary: 'INR 6-10 LPA',
    },
    {
        title: 'Backend Engineer (Node.js)',
        company: 'CloudBridge Labs',
        location: 'Bengaluru, India',
        description: 'Develop scalable APIs, optimize PostgreSQL queries, and improve service reliability.',
        requirements: 'Node.js, Express, PostgreSQL, Prisma',
        salary: 'INR 8-14 LPA',
    },
    {
        title: 'Data Analyst Intern',
        company: 'InsightWorks',
        location: 'Remote',
        description: 'Analyze engagement trends and create dashboards for student and alumni activity.',
        requirements: 'SQL, Excel/Sheets, Python basics, Communication',
        salary: 'INR 20,000/month',
    },
    {
        title: 'DevOps Engineer',
        company: 'ScaleForge',
        location: 'Hyderabad, India',
        description: 'Automate CI/CD pipelines, monitor production workloads, and harden deployment workflows.',
        requirements: 'Docker, GitHub Actions, Linux, AWS/Azure fundamentals',
        salary: 'INR 10-16 LPA',
    },
    {
        title: 'UI/UX Designer',
        company: 'PixelArc Studio',
        location: 'Pune, India (Hybrid)',
        description: 'Design intuitive user journeys for job board, messaging, and mentorship features.',
        requirements: 'Figma, Prototyping, Design Systems, User Research',
        salary: 'INR 5-9 LPA',
    },
];

async function postSampleJobs() {
    const posters = await prisma.user.findMany({
        where: { role: { in: ['ALUMNI', 'ADMIN'] } },
        select: { id: true, email: true, role: true },
        orderBy: { createdAt: 'asc' },
    });

    if (!posters.length) {
        throw new Error('No ALUMNI or ADMIN user found. Create one user first, then rerun this script.');
    }

    const poster = posters[0];
    const existingTitles = new Set((await prisma.job.findMany({ select: { title: true } })).map((j) => j.title));

    const now = new Date();
    const toInsert = sampleJobs
        .filter((j) => !existingTitles.has(j.title))
        .map((j) => ({
            id: uuidv4(),
            posterId: poster.id,
            createdAt: now,
            updatedAt: now,
            ...j,
        }));

    if (!toInsert.length) {
        console.log('No new jobs inserted. Sample jobs already exist.');
        console.log(`Poster used: ${poster.email} (${poster.role})`);
        return;
    }

    await prisma.job.createMany({ data: toInsert });

    console.log(`Inserted ${toInsert.length} sample jobs.`);
    console.log(`Poster used: ${poster.email} (${poster.role})`);
    console.log('Titles inserted:');
    for (const job of toInsert) {
        console.log(`- ${job.title}`);
    }
}

postSampleJobs()
    .catch((error) => {
        console.error('Failed to post sample jobs:', error.message || error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
