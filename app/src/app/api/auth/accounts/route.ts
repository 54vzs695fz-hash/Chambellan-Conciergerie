import { NextRequest, NextResponse } from "next/server";
import { AUTHORIZED_ACCOUNTS } from "@/lib/auth/constants";
import { hashPassword } from "@/lib/auth/password";
import { syncAuthorizedUsers } from "@/lib/auth/users";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAdminRequest(req: NextRequest): boolean {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) return false;
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

async function listAuthorizedAccounts() {
  return prisma.appUser.findMany({
    where: {
      email: { in: AUTHORIZED_ACCOUNTS.map((account) => account.email) },
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      created_at: true,
      updated_at: true,
    },
    orderBy: { email: "asc" },
  });
}

/** Admin-only: inspect internal auth accounts (no password hashes). */
export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const users = await listAuthorizedAccounts();
    const foundEmails = new Set(users.map((user) => user.email));
    const missing = AUTHORIZED_ACCOUNTS.filter(
      (account) => !foundEmails.has(account.email)
    ).map((account) => account.email);

    return NextResponse.json({
      ok: true,
      count: users.length,
      expected: AUTHORIZED_ACCOUNTS.length,
      missing,
      users,
    });
  } catch (err) {
    console.error("GET /api/auth/accounts failed:", err);
    return NextResponse.json(
      { error: "Could not load auth accounts" },
      { status: 500 }
    );
  }
}

/** Admin-only: create or reset the two internal accounts from env passwords. */
export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let updated = 0;

    for (const account of AUTHORIZED_ACCOUNTS) {
      const password = process.env[account.passwordEnv];
      if (!password) continue;

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
      updated += 1;
    }

    if (updated === 0) {
      return NextResponse.json(
        {
          error:
            "No passwords configured. Set AUTH_MATTHIEU_PASSWORD and AUTH_YANIS_PASSWORD.",
        },
        { status: 400 }
      );
    }

    await syncAuthorizedUsers();

    const allowedEmails = AUTHORIZED_ACCOUNTS.map((account) => account.email);
    const removed = await prisma.appUser.deleteMany({
      where: { email: { notIn: allowedEmails } },
    });

    const users = await listAuthorizedAccounts();
    const foundEmails = new Set(users.map((user) => user.email));
    const missing = AUTHORIZED_ACCOUNTS.filter(
      (account) => !foundEmails.has(account.email)
    ).map((account) => account.email);

    return NextResponse.json({
      ok: true,
      seeded: updated,
      removed: removed.count,
      count: users.length,
      expected: AUTHORIZED_ACCOUNTS.length,
      missing,
      users,
    });
  } catch (err) {
    console.error("POST /api/auth/accounts failed:", err);
    return NextResponse.json(
      { error: "Could not seed auth accounts" },
      { status: 500 }
    );
  }
}
