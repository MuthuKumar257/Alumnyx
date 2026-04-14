const { spawn } = require('child_process');
const path = require('path');

const projectRoot = __dirname;
const backendDir = path.join(projectRoot, 'backend');
const frontendDir = path.join(projectRoot, 'frontend');

console.log(`Starting Alumnyx from: ${projectRoot}`);

// 1. Initialize PostgreSQL schema via Prisma
console.log('--- Initializing PostgreSQL Schema ---');
const initDb = spawn('node', ['init_db.js'], { cwd: backendDir, stdio: 'inherit' });

initDb.on('close', (code) => {
    if (code !== 0) {
        console.error(`Schema initialization failed with code ${code}`);
        return;
    }
    console.log('--- PostgreSQL Schema Ready ---');

    // 2. Start Backend
    console.log('--- Starting Backend Server ---');
    const backend = spawn('node', ['server.js'], {
        cwd: backendDir,
        stdio: 'inherit',
    });

    backend.on('error', (err) => console.error('Backend failed to start:', err));

    // 3. Start Frontend
    console.log('--- Starting Frontend Server ---');
    const frontend = spawn('node', ['node_modules/expo/bin/cli', 'start', '--web', '--port', '3000'], {
        cwd: frontendDir,
        stdio: 'inherit',
    });

    frontend.on('error', (err) => console.error('Frontend failed to start:', err));
});
