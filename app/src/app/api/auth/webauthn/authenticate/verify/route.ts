import { NextRequest, NextResponse } from "next/server";
import type { AuthenticationResponseJSON } from "@simplewebauthn/server";
import { consumeWebAuthnChallenge } from "@/lib/auth/challenge";
import {
  SESSION_COOKIE,
  createSessionToken,
  sessionCookieOptions,
} from "@/lib/auth/session";
import { verifyAuthentication } from "@/lib/auth/webauthn";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const stored = await consumeWebAuthnChallenge("login");
    if (!stored) {
      return NextResponse.json(
        { error: "Sign-in session expired" },
        { status: 400 }
      );
    }

    const body = (await req.json()) as AuthenticationResponseJSON & {
      rememberDevice?: boolean;
    };
    const rememberDevice = body.rememberDevice !== false;
    const { rememberDevice: _omit, ...authResponse } = body as AuthenticationResponseJSON & {
      rememberDevice?: boolean;
    };
    const user = await verifyAuthentication(authResponse, stored.challenge);

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
    console.error("POST /api/auth/webauthn/authenticate/verify failed:", err);
    return NextResponse.json(
      { error: "Passkey sign-in failed" },
      { status: 401 }
    );
  }
}
