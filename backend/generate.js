const fs = require('fs');
const path = require('path');
require('dotenv').config();

const { execSync } = require('child_process');

try {
    const envVars = Object.assign({}, process.env, {
        DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/alumnyx?schema=public'
    });

    console.log('Generating Prisma Client...');
    execSync('node ./node_modules/prisma/build/index.js generate', {
        stdio: 'inherit',
        env: envVars
    });
    console.log('Client generated.');
} catch (e) {
    console.error(e.message);
}
