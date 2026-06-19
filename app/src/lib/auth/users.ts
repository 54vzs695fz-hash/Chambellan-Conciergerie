import { prisma } from "@/lib/prisma";
import { AUTHORIZED_ACCOUNTS, isAuthorizedEmail } from "./constants";
import { hashPassword } from "./password";

/** Sync the two internal accounts (metadata only; passwords via seed script). */
export async function syncAuthorizedUsers(): Promise<void> {
  for (const account of AUTHORIZED_ACCOUNTS) {
    const password = process.env[account.passwordEnv];
    const existing = await prisma.appUser.findUnique({
      where: { email: account.email },
    });

    if (existing) {
      await prisma.appUser.update({
        where: { email: account.email },
        data: { name: account.name, role: account.role },
      });
      continue;
    }

    if (!password) {
      console.warn(
        `[auth] Account missing for ${account.name}: set ${account.passwordEnv} and run npm run seed:auth`
      );
      continue;
    }

    await prisma.appUser.create({
      data: {
        email: account.email,
        name: account.name,
        role: account.role,
        password_hash: hashPassword(password),
      },
    });
  }
}

/** @deprecated use syncAuthorizedUsers */
export async function ensureAuthUsers(): Promise<void> {
  await syncAuthorizedUsers();
}

export async function findUserByEmail(email: string) {
  const normalized = email.toLowerCase().trim();
  if (!isAuthorizedEmail(normalized)) {
    return null;
  }

  return prisma.appUser.findUnique({
    where: { email: normalized },
    include: { credentials: true },
  });
}

export async function findUserById(id: number) {
  const user = await prisma.appUser.findUnique({
    where: { id },
    include: { credentials: true },
  });

  if (!user || !isAuthorizedEmail(user.email)) {
    return null;
  }

  return user;
}
