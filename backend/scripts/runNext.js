const { spawn } = require('child_process');
const path = require('path');

const mode = process.argv[2] || 'dev';
const host = process.env.HOST || '0.0.0.0';
const port = String(process.env.PORT || '5000');

const nextCli = path.join(__dirname, '..', 'node_modules', 'next', 'dist', 'bin', 'next');

const child = spawn(process.execPath, [nextCli, mode, '-p', port, '-H', host], {
  stdio: 'inherit',
  env: process.env,
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code || 0);
});
