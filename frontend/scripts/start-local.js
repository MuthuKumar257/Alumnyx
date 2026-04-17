const { spawn } = require('child_process');
const path = require('path');

const expoCli = path.join(__dirname, '..', 'node_modules', 'expo', 'bin', 'cli');
const args = ['start', ...process.argv.slice(2)];

const env = {
  ...process.env,
  EXPO_PUBLIC_API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:5000',
};

const child = spawn(process.execPath, [expoCli, ...args], {
  cwd: path.join(__dirname, '..'),
  stdio: 'inherit',
  env,
});

child.on('error', (error) => {
  console.error('Failed to start Expo:', error.message || error);
  process.exit(1);
});

child.on('exit', (code) => {
  process.exit(code == null ? 1 : code);
});
