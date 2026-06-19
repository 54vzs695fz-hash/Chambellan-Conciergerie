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

const seeds = [
  {
    name: "Matthieu",
    emailEnv: "AUTH_MATTHIEU_EMAIL",
    passwordEnv: "AUTH_MATTHIEU_PASSWORD",
    defaultEmail: "matthieu@chambellan.fr",
  },
  {
    name: "Yanis",
    emailEnv: "AUTH_YANIS_EMAIL",
    passwordEnv: "AUTH_YANIS_PASSWORD",
    defaultEmail: "yanis@chambellan.fr",
  },
];

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  for (const seed of seeds) {
    const email = (process.env[seed.emailEnv] ?? seed.defaultEmail).toLowerCase();
    const password = process.env[seed.passwordEnv];
    if (!password) {
      console.warn(`Skip ${seed.name}: set ${seed.passwordEnv}`);
      continue;
    }

    await prisma.appUser.upsert({
      where: { email },
      update: { password_hash: hashPassword(password), name: seed.name },
      create: {
        email,
        name: seed.name,
        password_hash: hashPassword(password),
      },
    });
    console.log(`Upserted ${seed.name} (${email})`);
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
