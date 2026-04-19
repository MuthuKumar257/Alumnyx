const path = require('path');
const { spawn } = require('child_process');
const dotenv = require('dotenv');
const { resolveDatabaseUrl } = require('./config/databaseUrl');

dotenv.config({
    path: path.join(__dirname, '.env'),
    override: process.env.NODE_ENV !== 'production',
});
dotenv.config({ path: path.join(__dirname, '.env.local'), override: false });

const prismaCli = path.join(__dirname, 'node_modules', 'prisma', 'build', 'index.js');

const resolvedDbUrl = resolveDatabaseUrl();
if (!resolvedDbUrl) {
    console.error('Initialization error: DATABASE_URL is not configured. Set DATABASE_URL or PGHOST/PGUSER/PGDATABASE.');
    process.exit(1);
}

process.env.DATABASE_URL = resolvedDbUrl;

function initPostgresSchema() {
    const runPrisma = (args, label) =>
        new Promise((resolve, reject) => {
            const child = spawn(process.execPath, [prismaCli, ...args], {
                cwd: __dirname,
                stdio: 'inherit',
                env: {
                    ...process.env,
                    DATABASE_URL: resolvedDbUrl,
                },
            });

            child.on('error', reject);
            child.on('close', (code) => {
                if (code === 0) {
                    resolve();
                    return;
                }
                reject(new Error(`Prisma ${label} failed with code ${code}`));
            });
        });

    return new Promise((resolve, reject) => {
        runPrisma(['generate', '--schema=prisma/schema.prisma'], 'generate')
            .then(() => runPrisma(['db', 'push', '--schema=prisma/schema.prisma'], 'db push'))
            .then(resolve)
            .catch(reject);
    });
}

initPostgresSchema()
    .then(() => {
        console.log('PostgreSQL schema initialized successfully.');
    })
    .catch((error) => {
        console.error('Initialization error:', error.message || error);
        process.exit(1);
    });
