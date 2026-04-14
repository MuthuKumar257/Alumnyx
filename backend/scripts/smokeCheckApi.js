const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

async function request(path, options = {}) {
    const res = await fetch(`${BASE_URL}${path}`, {
        headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
        ...options,
    });
    let body = null;
    try {
        body = await res.json();
    } catch {
        body = null;
    }
    return { ok: res.ok, status: res.status, body };
}

async function main() {
    const results = [];

    const root = await fetch(`${BASE_URL}/`);
    results.push({ step: 'GET /', ok: root.ok, status: root.status });

    const login = await request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'admin@alumnyx.com', password: 'password123' }),
    });
    results.push({ step: 'POST /api/auth/login', ok: login.ok, status: login.status });

    if (!login.ok || !login.body?.token) {
        console.log(JSON.stringify({ pass: false, reason: 'Admin login failed', results, loginBody: login.body }, null, 2));
        process.exitCode = 1;
        return;
    }

    const token = login.body.token;
    const auth = { Authorization: `Bearer ${token}` };

    const me = await request('/api/auth/me', { headers: auth });
    results.push({ step: 'GET /api/auth/me', ok: me.ok, status: me.status });

    const posts = await request('/api/posts', { headers: auth });
    results.push({ step: 'GET /api/posts', ok: posts.ok, status: posts.status, count: Array.isArray(posts.body) ? posts.body.length : -1 });

    const users = await request('/api/users', { headers: auth });
    results.push({ step: 'GET /api/users', ok: users.ok, status: users.status, count: Array.isArray(users.body) ? users.body.length : -1 });

    const jobs = await request('/api/jobs', { headers: auth });
    results.push({ step: 'GET /api/jobs', ok: jobs.ok, status: jobs.status, count: Array.isArray(jobs.body) ? jobs.body.length : -1 });

    const failed = results.filter((r) => !r.ok);
    console.log(JSON.stringify({ pass: failed.length === 0, results }, null, 2));

    if (failed.length) {
        process.exitCode = 1;
    }
}

main().catch((e) => {
    console.error('Smoke check failed:', e.message || e);
    process.exitCode = 1;
});
