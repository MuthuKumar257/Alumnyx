const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const mode = process.argv[2] || 'dev';
const host = process.env.HOST || '0.0.0.0';
const port = String(process.env.PORT || '5000');

const nextCli = path.join(__dirname, '..', 'node_modules', 'next', 'dist', 'bin', 'next');
const nextBuildId = path.join(__dirname, '..', '.next', 'BUILD_ID');

function runNext(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [nextCli, ...args], {
      stdio: 'inherit',
      env: process.env,
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
  // Some hosts skip build hooks; ensure a production build exists before `next start`.
  if (mode === 'start' && !fs.existsSync(nextBuildId)) {
    console.log('No .next build found. Running next build before start...');
    const buildCode = await runNext(['build']);
    if (buildCode !== 0) {
      process.exit(buildCode);
      return;
    }
  }

  const startCode = await runNext([mode, '-p', port, '-H', host]);
  process.exit(startCode);
}

main().catch((error) => {
  console.error('Failed to run Next.js command:', error?.message || error);
  process.exit(1);
});
