const { spawn } = require('child_process');
const path = require('path');

const backendRoot = path.join(__dirname, '..');
const isProduction = process.env.NODE_ENV === 'production';

function runNodeScript(scriptPath, args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath, ...args], {
      cwd: backendRoot,
      env: process.env,
      stdio: 'inherit',
    });

    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (signal) {
        process.kill(process.pid, signal);
        return;
      }
      resolve(code || 0);
    });
  });
}

async function main() {
  const initDbScript = path.join(backendRoot, 'init_db.js');
  const apiServerScript = path.join(backendRoot, 'server.js');

  const initCode = await runNodeScript(initDbScript);
  if (initCode !== 0) {
    if (!isProduction) {
      process.exit(initCode);
      return;
    }

    // In production, keep the app bootable even when DB init is temporarily unavailable.
    console.warn('init_db.js failed in production; continuing startup.');
  }

  const startCode = await runNodeScript(apiServerScript);
  process.exit(startCode);
}

main().catch((error) => {
  console.error('Failed during application startup:', error?.message || error);
  process.exit(1);
});
