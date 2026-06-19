import { prisma } from "@/lib/prisma";
import { AUTH_USER_SEEDS } from "./constants";
import { hashPassword } from "./password";

export async function ensureAuthUsers(): Promise<void> {
  const count = await prisma.appUser.count();
  if (count > 0) return;

  for (const seed of AUTH_USER_SEEDS) {
    const email = (
      process.env[seed.emailEnv] ?? seed.defaultEmail
    ).toLowerCase();
    const password = process.env[seed.passwordEnv];
    if (!password) {
      console.warn(
        `[auth] Skipping ${seed.name}: set ${seed.passwordEnv} to create account`
      );
      continue;
    }

    await prisma.appUser.create({
      data: {
        email,
        name: seed.name,
        password_hash: hashPassword(password),
      },
    });
  }
}

export async function findUserByEmail(email: string) {
  return prisma.appUser.findUnique({
    where: { email: email.toLowerCase().trim() },
    include: { credentials: true },
  });
}

export async function findUserById(id: number) {
  return prisma.appUser.findUnique({
    where: { id },
    include: { credentials: true },
  });
}
