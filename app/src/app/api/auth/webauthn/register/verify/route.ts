import { NextRequest, NextResponse } from "next/server";
import type { RegistrationResponseJSON } from "@simplewebauthn/server";
import { consumeWebAuthnChallenge } from "@/lib/auth/challenge";
import { getSession } from "@/lib/auth/session";
import { verifyRegistration } from "@/lib/auth/webauthn";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const stored = await consumeWebAuthnChallenge("register");
    if (!stored || stored.userId !== Number(session.sub)) {
      return NextResponse.json(
        { error: "Registration session expired" },
        { status: 400 }
      );
    }

    const body = (await req.json()) as RegistrationResponseJSON;
    await verifyRegistration(Number(session.sub), body, stored.challenge);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/auth/webauthn/register/verify failed:", err);
    return NextResponse.json(
      { error: "Passkey registration failed" },
      { status: 400 }
    );
  }
}
