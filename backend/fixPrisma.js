const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const tempDir = 'C:\\temp_alumnyx';
const currentDir = process.cwd();

try {
    console.log('Creating temp dir...');
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }

    console.log('Copying files...');
    fs.cpSync(currentDir, tempDir, { recursive: true, filter: (src) => !src.includes('node_modules') && !src.includes('.git') });

    console.log('Running npm install & prisma...');
    execSync('npm install', { cwd: tempDir, stdio: 'inherit' });
    execSync('node ./node_modules/prisma/build/index.js db push', { cwd: tempDir, stdio: 'inherit' });
    execSync('node ./node_modules/prisma/build/index.js generate', { cwd: tempDir, stdio: 'inherit' });

    console.log('Copying back node_modules...');
    if (!fs.existsSync(path.join(currentDir, 'node_modules'))) {
        fs.mkdirSync(path.join(currentDir, 'node_modules'));
    }

    fs.cpSync(path.join(tempDir, 'node_modules', '.prisma'), path.join(currentDir, 'node_modules', '.prisma'), { recursive: true });
    fs.cpSync(path.join(tempDir, 'node_modules', '@prisma', 'client'), path.join(currentDir, 'node_modules', '@prisma', 'client'), { recursive: true });

    console.log('SUCCESS! Prisma fixed.');
} catch (e) {
    console.error('Failed:', e.message);
    if (e.stdout) console.error(e.stdout.toString());
    if (e.stderr) console.error(e.stderr.toString());
}
