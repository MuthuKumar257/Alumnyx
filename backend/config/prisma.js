const { PrismaClient } = require('@prisma/client');
const { resolveDatabaseUrl } = require('./databaseUrl');

const dbUrl = resolveDatabaseUrl();

if (!process.env.DATABASE_URL && dbUrl) {
    process.env.DATABASE_URL = dbUrl;
}

if (process.env.NODE_ENV === 'production' && !dbUrl) {
    throw new Error('DATABASE_URL is not configured for production. Set DATABASE_URL or PGHOST/PGUSER/PGDATABASE env vars.');
}

let prisma;

const prismaOptions = dbUrl
    ? { datasources: { db: { url: dbUrl } } }
    : {};

if (process.env.NODE_ENV === 'production') {
    prisma = new PrismaClient(prismaOptions);
} else {
    // Prevent multiple instances in development (hot reload)
    if (!global.__prisma) {
        global.__prisma = new PrismaClient({
            ...prismaOptions,
            log: ['warn', 'error'],
        });
    }
    prisma = global.__prisma;
}

module.exports = prisma;
