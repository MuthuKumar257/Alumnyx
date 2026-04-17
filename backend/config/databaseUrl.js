const isTruthy = (value) => ['1', 'true', 'yes', 'on'].includes(String(value || '').toLowerCase());

const hasValue = (value) => typeof value === 'string' && value.trim().length > 0;

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
    const candidates = [
        process.env.DATABASE_URL,
        process.env.POSTGRES_PRISMA_URL,
        process.env.POSTGRES_URL,
        process.env.PRISMA_DATABASE_URL,
        process.env.RENDER_DATABASE_URL,
        process.env.RENDER_POSTGRES_EXTERNAL_URL,
        process.env.RENDER_POSTGRES_INTERNAL_URL,
        buildFromPgParts(),
    ];

    const firstValid = candidates.find(hasValue);
    if (!hasValue(firstValid)) {
        return null;
    }

    const production = process.env.NODE_ENV === 'production';
    const allowLocalInProd = isTruthy(process.env.ALLOW_LOCAL_DB_IN_PROD);

    if (production && !allowLocalInProd && isLocalHostUrl(firstValid)) {
        return null;
    }

    return firstValid;
};

module.exports = { resolveDatabaseUrl };
