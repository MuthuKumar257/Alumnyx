const isTruthy = (value) => ['1', 'true', 'yes', 'on'].includes(String(value || '').toLowerCase());

const hasValue = (value) => typeof value === 'string' && value.trim().length > 0;

const isPostgresUrl = (value) => /^postgres(?:ql)?:\/\//i.test(String(value || '').trim());

const isLocalHostUrl = (value) => /@(?:localhost|127\.0\.0\.1)(?::\d+)?\//i.test(String(value || ''));

const encode = (value) => encodeURIComponent(String(value || ''));

const buildFromPgParts = () => {
    const host = process.env.PGHOST || process.env.POSTGRES_HOST;
    const port = process.env.PGPORT || process.env.POSTGRES_PORT || '5432';
    const user = process.env.PGUSER || process.env.POSTGRES_USER;
    const password = process.env.PGPASSWORD || process.env.POSTGRES_PASSWORD;
    const database = process.env.PGDATABASE || process.env.POSTGRES_DB || process.env.POSTGRES_DATABASE;
    const schema = process.env.PGSCHEMA || process.env.POSTGRES_SCHEMA || 'public';

    if (!hasValue(host) || !hasValue(user) || !hasValue(database)) {
        return null;
    }

    const auth = hasValue(password) ? `${encode(user)}:${encode(password)}@` : `${encode(user)}@`;
    const sslMode = process.env.PGSSLMODE || process.env.POSTGRES_SSLMODE || (String(host).includes('localhost') ? null : 'require');
    const sslPart = hasValue(sslMode) ? `&sslmode=${encode(sslMode)}` : '';

    return `postgresql://${auth}${host}:${port}/${database}?schema=${encode(schema)}${sslPart}`;
};

const resolveDatabaseUrl = () => {
    const production = process.env.NODE_ENV === 'production';

    const candidates = production
        ? [
            process.env.DATABASE_URL,
            process.env.SUPABASE_DATABASE_URL,
            process.env.SUPABASE_DB_URL,
            process.env.POSTGRES_PRISMA_URL,
            process.env.POSTGRES_URL,
            process.env.PRISMA_DATABASE_URL,
            process.env.RENDER_DATABASE_URL,
            process.env.RENDER_POSTGRES_EXTERNAL_URL,
            process.env.RENDER_POSTGRES_INTERNAL_URL,
            buildFromPgParts(),
        ]
        : [
            process.env.DATABASE_URL,
            process.env.POSTGRES_PRISMA_URL,
            process.env.POSTGRES_URL,
            process.env.PRISMA_DATABASE_URL,
            process.env.SUPABASE_DATABASE_URL,
            process.env.SUPABASE_DB_URL,
            process.env.RENDER_DATABASE_URL,
            process.env.RENDER_POSTGRES_EXTERNAL_URL,
            process.env.RENDER_POSTGRES_INTERNAL_URL,
            buildFromPgParts(),
        ];

    const validCandidates = candidates
        .filter(hasValue)
        .map((value) => String(value).trim())
        .filter(isPostgresUrl);
    if (validCandidates.length === 0) {
        return null;
    }

    const allowLocalInProd = isTruthy(process.env.ALLOW_LOCAL_DB_IN_PROD);

    if (production && !allowLocalInProd) {
        const firstNonLocal = validCandidates.find((value) => !isLocalHostUrl(value));
        return hasValue(firstNonLocal) ? firstNonLocal : null;
    }

    return validCandidates[0];
};

module.exports = { resolveDatabaseUrl };
