import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { randomBytes, scryptSync } from "crypto";

const SALT_LEN = 16;
const KEY_LEN = 64;

function hashPassword(password) {
  const salt = randomBytes(SALT_LEN).toString("hex");
  const hash = scryptSync(password, salt, KEY_LEN).toString("hex");
  return `${salt}:${hash}`;
}

/** Fixed internal accounts — no public registration. */
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

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  let updated = 0;

  for (const account of accounts) {
    const password = process.env[account.passwordEnv];
    if (!password) {
      console.warn(`Skip ${account.name}: set ${account.passwordEnv}`);
      continue;
    }

    await prisma.appUser.upsert({
      where: { email: account.email },
      update: {
        name: account.name,
        role: account.role,
        password_hash: hashPassword(password),
      },
      create: {
        email: account.email,
        name: account.name,
        role: account.role,
        password_hash: hashPassword(password),
      },
    });
    console.log(`Password set for ${account.name} (${account.email})`);
    updated += 1;
  }

  if (updated === 0) {
    console.error(
      "No passwords updated. Set AUTH_MATTHIEU_PASSWORD and AUTH_YANIS_PASSWORD in .env"
    );
    process.exit(1);
  }

  const allowedEmails = accounts.map((a) => a.email);
  const removed = await prisma.appUser.deleteMany({
    where: { email: { notIn: allowedEmails } },
  });
  if (removed.count > 0) {
    console.log(`Removed ${removed.count} unauthorized account(s)`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
