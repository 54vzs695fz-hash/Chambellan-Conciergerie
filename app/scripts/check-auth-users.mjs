#!/usr/bin/env node
/**
 * Check internal auth accounts in the database (email, name, role only).
 * Run: node scripts/check-auth-users.mjs
 * Production: npx vercel env run -e production -- node scripts/check-auth-users.mjs
 */
import pg from "pg";

const TARGET_EMAILS = [
  "matthieu@chambellan-conciergerie.fr",
  "yanis@chambellan-conciergerie.fr",
];

function pickEnv(...keys) {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return undefined;
}

const DATABASE_URL = pickEnv(
  "POSTGRES_URL",
  "DIRECT_DATABASE_URL",
  "DATABASE_URL",
  "PRISMA_DATABASE_URL"
);
if (!DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const client = new pg.Client({
  connectionString: DATABASE_URL,
  ssl:
    DATABASE_URL.includes("localhost") || DATABASE_URL.includes("127.0.0.1")
      ? undefined
      : { rejectUnauthorized: false },
});

async function main() {
  await client.connect();

  const tableCheck = await client.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'app_users'
    ) AS exists
  `);

  if (!tableCheck.rows[0]?.exists) {
    console.log("MISSING_TABLE");
    console.log("app_users table does not exist — run migrations first.");
    process.exit(2);
  }

  const result = await client.query(
    `SELECT id, email, name, role, created_at, updated_at
     FROM app_users
     WHERE email = ANY($1::text[])
     ORDER BY email`,
    [TARGET_EMAILS]
  );

  const found = new Set(result.rows.map((row) => row.email));
  const missing = TARGET_EMAILS.filter((email) => !found.has(email));

  console.log("FOUND", result.rowCount);
  for (const row of result.rows) {
    console.log(
      JSON.stringify({
        id: row.id,
        email: row.email,
        name: row.name,
        role: row.role,
        created_at: row.created_at,
        updated_at: row.updated_at,
      })
    );
  }

  console.log("MISSING", missing.length);
  for (const email of missing) {
    console.log(email);
  }

  if (missing.length > 0) {
    process.exit(1);
  }
}

main()
  .catch((err) => {
    console.error("ERROR", err?.message || String(err));
    if (err?.code) console.error("CODE", err.code);
    process.exit(1);
  })
  .finally(async () => {
    await client.end().catch(() => {});
  });
