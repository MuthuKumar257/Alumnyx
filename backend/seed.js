const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { readJson, queueWrite, readUsers, writeUsers } = require('./storage/jsonStorage');

const now = () => new Date().toISOString();

const seed = async () => {
    try {
        const users = await readUsers();
        if (users.length > 0) {
            console.log('Database already has users. Skipping seed.');
            return;
        }

        const profiles = await readJson('profiles');
        const jobs = await readJson('jobs');
        const posts = await readJson('posts');

        const password = await bcrypt.hash('password123', 10);
        const t = now();

        const adminId = uuidv4();
        const alumniId = uuidv4();
        const studentId = uuidv4();

        const seedUsers = [
            { id: adminId, email: 'admin@alumnyx.com', password, role: 'ADMIN', isVerified: true, createdAt: t, updatedAt: t },
            { id: alumniId, email: 'alumni1@university.edu', password, role: 'ALUMNI', isVerified: true, createdAt: t, updatedAt: t },
            { id: studentId, email: 'student1@university.edu', password, role: 'STUDENT', isVerified: false, createdAt: t, updatedAt: t },
        ];

        const seedProfiles = [
            {
                id: uuidv4(), userId: adminId, firstName: 'Super', lastName: 'Admin', college: null, graduationYear: null,
                skills: [], currentCompany: null, bio: 'System Administrator', profilePicture: null, createdAt: t, updatedAt: t,
            },
            {
                id: uuidv4(), userId: alumniId, firstName: 'John', lastName: 'Doe', college: 'College of Engineering', graduationYear: 2020,
                skills: ['React', 'Node.js', 'AWS', 'PostgreSQL'], currentCompany: 'Tech Corp',
                bio: 'Senior Software Engineer passionate about mentoring students.', profilePicture: null, createdAt: t, updatedAt: t,
            },
            {
                id: uuidv4(), userId: studentId, firstName: 'Jane', lastName: 'Smith', college: 'College of Engineering', graduationYear: 2026,
                skills: ['Python', 'Java', 'React'], currentCompany: null,
                bio: 'CS student looking for internships and career guidance.', profilePicture: null, createdAt: t, updatedAt: t,
            },
        ];

        const seedJobs = [
            {
                id: uuidv4(), title: 'Software Engineering Intern', company: 'Tech Corp', location: 'Remote',
                description: 'We are looking for a passionate intern to join our core team. You will work on scalable web services.',
                requirements: 'Node.js, React, SQL basics', salary: '$2000/month', posterId: alumniId, createdAt: t, updatedAt: t,
            },
        ];

        const seedPosts = [
            {
                id: uuidv4(), authorId: alumniId,
                content: 'Excited to announce my new role at Tech Corp! Happy to mentor anyone interested in backend development. #career #mentorship',
                mediaUrl: null, likes: [], createdAt: t, updatedAt: t,
            },
        ];

        await writeUsers([...users, ...seedUsers]);
        await queueWrite('profiles', [...profiles, ...seedProfiles]);
        await queueWrite('jobs', [...jobs, ...seedJobs]);
        await queueWrite('posts', [...posts, ...seedPosts]);

        console.log('PostgreSQL seed complete successfully.');
        console.log('------------------------------');
        console.log('Admin:   admin@alumnyx.com       / password123');
        console.log('Alumni:  alumni1@university.edu  / password123');
        console.log('Student: student1@university.edu / password123');
        console.log('------------------------------');
    } catch (error) {
        console.error('Seed failed:', error);
        process.exit(1);
    }
};

seed();
