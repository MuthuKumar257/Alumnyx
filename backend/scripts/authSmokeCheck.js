const BASE_URL = (process.env.BASE_URL || 'http://localhost:5000').replace(/\/+$/, '');
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';
const ENABLE_ADMIN_CHECK = String(process.env.ENABLE_ADMIN_CHECK || '').toLowerCase() === 'true';

async function request(path, options = {}) {
    const url = `${BASE_URL}${path}`;
    const res = await fetch(url, {
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {}),
        },
        ...options,
    });

    let body = null;
    try {
        body = await res.json();
    } catch {
        body = null;
    }

    return {
        ok: res.ok,
        status: res.status,
        body,
        url,
    };
}

function makeEmail(prefix) {
    const nonce = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    return `${prefix}.${nonce}@example.com`;
}

function stepResult(name, response, expectedStatuses) {
    const pass = expectedStatuses.includes(response.status);
    return {
        step: name,
        pass,
        status: response.status,
        expected: expectedStatuses,
        url: response.url,
        body: response.body,
    };
}

async function main() {
    const checks = [];

    const root = await fetch(`${BASE_URL}/`);
    checks.push({
        step: 'GET /',
        pass: root.ok,
        status: root.status,
        expected: [200],
        url: `${BASE_URL}/`,
    });

    const registerEmail = makeEmail('smoke.student');
    const registerRes = await request('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
            email: registerEmail,
            password: 'Pass@1234',
            firstName: 'Smoke',
            lastName: 'Student',
            role: 'STUDENT',
            college: 'Smoke College',
            graduationYear: '2026',
        }),
    });
    checks.push(stepResult('POST /api/auth/register', registerRes, [201]));

    const studentLoginRes = await request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
            email: registerEmail,
            password: 'Pass@1234',
        }),
    });
    checks.push(stepResult('POST /api/auth/login (registered student)', studentLoginRes, [200]));

    const alumniEmail = makeEmail('smoke.alumni');
    const alumniRegisterRes = await request('/api/auth/alumni/register', {
        method: 'POST',
        body: JSON.stringify({
            firstName: 'Smoke',
            lastName: 'Alumni',
            email: alumniEmail,
            password: 'Pass@1234',
            college: 'Smoke College',
            graduationYear: '2020',
            department: 'cse',
        }),
    });
    checks.push(stepResult('POST /api/auth/alumni/register', alumniRegisterRes, [201]));

    const alumniLoginRes = await request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
            email: alumniEmail,
            password: 'Pass@1234',
        }),
    });
    checks.push(stepResult('POST /api/auth/login (new alumni pending approval)', alumniLoginRes, [403]));

    if (ENABLE_ADMIN_CHECK) {
        let adminToken = ADMIN_TOKEN;
        if (!adminToken && ADMIN_EMAIL && ADMIN_PASSWORD) {
            const adminLoginRes = await request('/api/auth/login', {
                method: 'POST',
                body: JSON.stringify({
                    email: ADMIN_EMAIL,
                    password: ADMIN_PASSWORD,
                }),
            });
            checks.push(stepResult('POST /api/auth/login (admin)', adminLoginRes, [200]));

            if (adminLoginRes.ok && adminLoginRes.body && adminLoginRes.body.token) {
                adminToken = adminLoginRes.body.token;
            }
        }

        if (adminToken) {
            const checkEmailRes = await request(`/api/auth/check-email?email=${encodeURIComponent(registerEmail)}`, {
                method: 'GET',
                headers: { Authorization: `Bearer ${adminToken}` },
            });
            checks.push(stepResult('GET /api/auth/check-email (admin)', checkEmailRes, [200]));
        } else {
            checks.push({
                step: 'GET /api/auth/check-email (admin)',
                pass: false,
                skipped: true,
                reason: 'ENABLE_ADMIN_CHECK=true but no valid ADMIN_TOKEN or ADMIN_EMAIL + ADMIN_PASSWORD were provided.',
            });
        }
    } else {
        checks.push({
            step: 'GET /api/auth/check-email (admin)',
            pass: true,
            skipped: true,
            reason: 'Set ENABLE_ADMIN_CHECK=true to include admin auth checks.',
        });
    }

    const failed = checks.filter((c) => c.pass === false);
    const output = {
        baseUrl: BASE_URL,
        pass: failed.length === 0,
        failedCount: failed.length,
        checks,
    };

    console.log(JSON.stringify(output, null, 2));

    if (failed.length > 0) {
        process.exitCode = 1;
    }
}

main().catch((error) => {
    console.error('Auth smoke check failed:', error?.message || error);
    process.exitCode = 1;
});
