#!/usr/bin/env node
/**
 * Create or reset the two internal admin accounts (hashed passwords only).
 * Run: AUTH_MATTHIEU_PASSWORD=... AUTH_YANIS_PASSWORD=... npm run seed:auth
 */
import "dotenv/config";
import pg from "pg";
import { randomBytes, scryptSync } from "crypto";

const SALT_LEN = 16;
const KEY_LEN = 64;

function hashPassword(password) {
  const salt = randomBytes(SALT_LEN).toString("hex");
  const hash = scryptSync(password, salt, KEY_LEN).toString("hex");
  return `${salt}:${hash}`;
}

const accounts = [
  {
    name: "Matthieu Dubourg",
    email: "matthieu@chambellan-conciergerie.fr",
    role: "admin",
    passwordEnv: "AUTH_MATTHIEU_PASSWORD",
  },
  {
    name: "Yanis Mousli",
    email: "yanis@chambellan-conciergerie.fr",
    role: "admin",
    passwordEnv: "AUTH_YANIS_PASSWORD",
  },
];

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const client = new pg.Client({ connectionString: DATABASE_URL });

async function main() {
  await client.connect();
  let updated = 0;

  for (const account of accounts) {
    const password = process.env[account.passwordEnv];
    if (!password) {
      console.warn(`Skip ${account.name}: set ${account.passwordEnv}`);
      continue;
    }

    const passwordHash = hashPassword(password);
    const result = await client.query(
      `INSERT INTO app_users (email, name, role, password_hash, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       ON CONFLICT (email) DO UPDATE SET
         name = EXCLUDED.name,
         role = EXCLUDED.role,
         password_hash = EXCLUDED.password_hash,
         updated_at = NOW()
       RETURNING id`,
      [account.email, account.name, account.role, passwordHash]
    );
    console.log(`Password set for ${account.name} (${account.email}) [id=${result.rows[0].id}]`);
    updated += 1;
  }

  if (updated === 0) {
    console.error(
      "No passwords updated. Set AUTH_MATTHIEU_PASSWORD and AUTH_YANIS_PASSWORD"
    );
    process.exit(1);
  }

  const allowedEmails = accounts.map((a) => a.email);
  const removed = await client.query(
    `DELETE FROM app_users WHERE email <> ALL($1::text[])`,
    [allowedEmails]
  );
  if (removed.rowCount > 0) {
    console.log(`Removed ${removed.rowCount} unauthorized account(s)`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await client.end().catch(() => {});
  });
