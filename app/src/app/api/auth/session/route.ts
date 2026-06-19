import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { findUserById } from "@/lib/auth/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const user = await findUserById(Number(session.sub));
    if (!user) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        email: user.email,
        name: user.name,
        role: user.role,
        passkeyCount: user.credentials.length,
      },
    });
  } catch (err) {
    console.error("GET /api/auth/session failed:", err);
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}
