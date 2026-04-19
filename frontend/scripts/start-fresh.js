const { spawn } = require('child_process');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const expoCli = path.join(projectRoot, 'node_modules', 'expo', 'bin', 'cli');

async function safeRemove(targetPath) {
  try {
    await fs.rm(targetPath, { recursive: true, force: true });
  } catch {
    // Ignore cleanup failures for non-existent or locked paths.
  }
}

async function cleanupMetroAndBuildArtifacts() {
  await safeRemove(path.join(projectRoot, '.expo'));
  await safeRemove(path.join(projectRoot, 'android', 'build'));
  await safeRemove(
    path.join(projectRoot, 'node_modules', 'react-native-screens', 'android', 'build')
  );

  const tempDir = os.tmpdir();
  try {
    const entries = await fs.readdir(tempDir, { withFileTypes: true });
    const metroEntries = entries.filter((entry) => entry.name.toLowerCase().startsWith('metro-'));

    await Promise.all(
      metroEntries.map((entry) => safeRemove(path.join(tempDir, entry.name)))
    );
  } catch {
    // Ignore temp directory read issues.
  }
}

async function main() {
  await cleanupMetroAndBuildArtifacts();

  const args = ['start', '--clear', ...process.argv.slice(2)];
  const child = spawn(process.execPath, [expoCli, ...args], {
    cwd: projectRoot,
    stdio: 'inherit',
    env: process.env,
  });

  child.on('error', (error) => {
    console.error('Failed to start Expo:', error.message || error);
    process.exit(1);
  });

  child.on('exit', (code) => {
    process.exit(code == null ? 1 : code);
  });
}

main().catch((error) => {
  console.error('Failed during cleanup/start:', error.message || error);
  process.exit(1);
});
