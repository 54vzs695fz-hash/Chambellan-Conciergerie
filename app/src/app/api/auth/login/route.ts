import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedEmail } from "@/lib/auth/constants";
import { verifyPassword } from "@/lib/auth/password";
import {
  SESSION_COOKIE,
  createSessionToken,
  sessionCookieOptions,
} from "@/lib/auth/session";
import { findUserByEmail, syncAuthorizedUsers } from "@/lib/auth/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    await syncAuthorizedUsers();

    const body = (await req.json()) as {
      email?: string;
      password?: string;
      rememberDevice?: boolean;
    };

    const email = body.email?.trim().toLowerCase() ?? "";
    const password = body.password ?? "";
    const rememberDevice = body.rememberDevice !== false;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    if (!isAuthorizedEmail(email)) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const user = await findUserByEmail(email);
    if (!user || !verifyPassword(password, user.password_hash)) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const token = await createSessionToken(
      {
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      rememberDevice
    );

    const response = NextResponse.json({
      ok: true,
      user: { email: user.email, name: user.name, role: user.role },
    });
    response.cookies.set(
      SESSION_COOKIE,
      token,
      sessionCookieOptions(rememberDevice)
    );
    return response;
  } catch (err) {
    console.error("POST /api/auth/login failed:", err);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
