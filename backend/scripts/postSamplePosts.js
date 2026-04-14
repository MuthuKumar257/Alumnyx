const { v4: uuidv4 } = require('uuid');
const prisma = require('../config/prisma');

const samplePosts = [
    'Excited to mentor final-year students preparing for backend engineering interviews. Happy to share roadmap and mock questions.',
    'Our team is hiring React Native interns for summer. Strong basics in JavaScript and willingness to learn are enough to apply.',
    'Just hosted a resume review session for juniors. Biggest takeaway: quantify impact in every project bullet.',
    'Sharing my notes from a recent system design workshop. Start with requirements, then define scale assumptions clearly.',
    'If you are learning DSA, focus on consistency over speed. Solving 2 quality problems daily beats random marathon sessions.',
    'Open to connecting with alumni working in product, data, and cloud roles. Let us build a stronger referral network together.'
];

async function postSamplePosts() {
    const authors = await prisma.user.findMany({
        where: { role: { in: ['ALUMNI', 'ADMIN'] } },
        select: { id: true, email: true, role: true },
        orderBy: { createdAt: 'asc' },
    });

    if (!authors.length) {
        throw new Error('No ALUMNI or ADMIN user found. Create one user first, then rerun this script.');
    }

    const existingContents = new Set((await prisma.post.findMany({ select: { content: true } })).map((p) => p.content));
    const now = new Date();

    const toInsert = samplePosts
        .filter((content) => !existingContents.has(content))
        .map((content, index) => {
            const author = authors[index % authors.length];
            return {
                id: uuidv4(),
                authorId: author.id,
                content,
                mediaUrl: null,
                createdAt: now,
                updatedAt: now,
            };
        });

    if (!toInsert.length) {
        console.log('No new posts inserted. Sample posts already exist.');
        return;
    }

    await prisma.post.createMany({ data: toInsert });

    console.log(`Inserted ${toInsert.length} sample posts.`);
    console.log('Authors used:');
    for (const a of authors) {
        console.log(`- ${a.email} (${a.role})`);
    }
}

postSamplePosts()
    .catch((error) => {
        console.error('Failed to post sample posts:', error.message || error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
