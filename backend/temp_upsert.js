
const { Client } = require("pg");
const bcrypt = require("bcryptjs");

async function run() {
  const client = new Client({ 
    connectionString: process.env.SUPABASE_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  try {
    await client.connect();
    const email = "admin@alumnyx.com";
    const password = "admin@123";
    const hashedPassword = bcrypt.hashSync(password, 10);
    const query = `
      INSERT INTO public."User" (email, password, role, "isVerified", "isSuperAdmin", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (email) DO UPDATE SET
        password = EXCLUDED.password,
        role = EXCLUDED.role,
        "isVerified" = EXCLUDED."isVerified",
        "isSuperAdmin" = EXCLUDED."isSuperAdmin",
        "updatedAt" = NOW()
    `;
    await client.query(query, [email, hashedPassword, "ADMIN", true, true]);
    console.log("Admin user upserted successfully");
  } catch (err) {
    console.error("Error upserting admin user:", err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}
run();

