const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const dotenv = require('dotenv');

// Load both files when present; .env.local overrides .env.
dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config({ path: path.join(__dirname, '..', '.env.local'), override: true });

const sourceDbUrl = process.env.SOURCE_DATABASE_URL || process.env.DATABASE_URL;
const targetDbUrl = process.env.SUPABASE_DATABASE_URL;

function detectUnsafeAtInPassword(uri) {
  const value = String(uri || '');
  const schemeIdx = value.indexOf('://');
  if (schemeIdx === -1) return false;
  const afterScheme = value.slice(schemeIdx + 3);
  const authority = afterScheme.split('/')[0] || '';
  const atCount = (authority.match(/@/g) || []).length;
  return atCount > 1;
}

function getHostname(uri) {
  try {
    return new URL(uri).hostname;
  } catch {
    return '';
  }
}

function normalizeDbUrlForPgTools(dbUrl) {
  try {
    const parsed = new URL(dbUrl);
    parsed.searchParams.delete('schema');
    return parsed.toString();
  } catch {
    return dbUrl;
  }
}

function resolvePgTool(toolName) {
  const envOverride = process.env[toolName === 'pg_dump' ? 'PG_DUMP_PATH' : 'PSQL_PATH'];
  if (envOverride && fs.existsSync(envOverride)) {
    return envOverride;
  }

  if (process.platform === 'win32') {
    const programFiles = [
      process.env['ProgramFiles'],
      process.env['ProgramFiles(x86)'],
      'C:\\Program Files',
      'C:\\Program Files (x86)',
      'C:\\PostgreSQL',
    ].filter(Boolean);

    const candidates = [];
    for (const base of programFiles) {
      for (let major = 18; major >= 9; major -= 1) {
        candidates.push(path.join(base, 'PostgreSQL', String(major), 'bin', `${toolName}.exe`));
        candidates.push(path.join(base, String(major), 'bin', `${toolName}.exe`));
      }
    }

    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }
  }

  return toolName;
}

if (!sourceDbUrl) {
  console.error('Missing SOURCE_DATABASE_URL or DATABASE_URL in environment.');
  process.exit(1);
}

if (!targetDbUrl) {
  console.error('Missing SUPABASE_DATABASE_URL in environment (.env.local recommended).');
  process.exit(1);
}

if (/[<>]/.test(targetDbUrl) || targetDbUrl.includes('pooler.supabase.com:6543/postgres?sslmode=require') && targetDbUrl.includes('<region>')) {
  console.error('SUPABASE_DATABASE_URL appears to be a placeholder.');
  console.error('Replace <project-ref>, <password>, and <region> with real values from Supabase Database settings.');
  process.exit(1);
}

if (sourceDbUrl === targetDbUrl) {
  console.error('SOURCE and TARGET database URLs are identical. Aborting to prevent self-overwrite.');
  process.exit(1);
}

if (detectUnsafeAtInPassword(targetDbUrl)) {
  console.error('SUPABASE_DATABASE_URL appears to contain an unescaped @ in the password.');
  console.error('Encode @ as %40 (for example: my@pass -> my%40pass).');
  process.exit(1);
}

const targetHostname = getHostname(targetDbUrl);

if (/^db\.[^.]+\.supabase\.co$/i.test(targetHostname)) {
  console.error('You are using the Supabase direct DB host (db.<project-ref>.supabase.co), which may be IPv6-only in your network.');
  console.error('Use the Supabase Session Pooler connection string instead (port 6543) and include sslmode=require.');
  console.error('Example: postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?sslmode=require');
  process.exit(1);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: false,
    ...options,
  });

  if (result.error) {
    if (result.error.code === 'ENOENT') {
      console.error(`Command not found: ${command}`);
      console.error('Install PostgreSQL client tools and ensure pg_dump/psql are on PATH.');
    } else {
      console.error(result.error.message);
    }
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

const dumpFile = path.join(
  os.tmpdir(),
  `alumnyx-sync-${Date.now()}-${Math.floor(Math.random() * 100000)}.sql`
);

const pgDumpCmd = resolvePgTool('pg_dump');
const psqlCmd = resolvePgTool('psql');
const sourceDbUrlForTools = normalizeDbUrlForPgTools(sourceDbUrl);
const targetDbUrlForTools = normalizeDbUrlForPgTools(targetDbUrl);

console.log('1/3 Verifying PostgreSQL client tools...');
run(pgDumpCmd, ['--version']);
run(psqlCmd, ['--version']);

console.log('2/3 Exporting local database (public schema only)...');
run(pgDumpCmd, [
  '--dbname',
  sourceDbUrlForTools,
  '--schema=public',
  '--clean',
  '--if-exists',
  '--no-owner',
  '--no-privileges',
  '--encoding=UTF8',
  '--format=plain',
  '--file',
  dumpFile,
]);

console.log('3/3 Importing dump into Supabase target...');
run(psqlCmd, ['--dbname', targetDbUrlForTools, '-v', 'ON_ERROR_STOP=1', '-f', dumpFile]);

try {
  fs.unlinkSync(dumpFile);
} catch {
  // Non-fatal; temporary file can be removed manually.
}

console.log('Sync complete: local PostgreSQL -> Supabase');
