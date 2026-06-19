import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const user = await prisma.appUser.findUnique({
      where: { id: Number(session.sub) },
      include: { credentials: { select: { id: true, created_at: true } } },
    });

    if (!user) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        email: user.email,
        name: user.name,
        passkeyCount: user.credentials.length,
      },
    });
  } catch (err) {
    console.error("GET /api/auth/session failed:", err);
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}
