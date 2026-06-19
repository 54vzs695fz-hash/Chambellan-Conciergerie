import { NextRequest, NextResponse } from "next/server";
import { storeWebAuthnChallenge } from "@/lib/auth/challenge";
import { ensureAuthUsers } from "@/lib/auth/users";
import { buildAuthenticationOptions } from "@/lib/auth/webauthn";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    await ensureAuthUsers();

    const body = (await req.json()) as { email?: string };
    const email = body.email?.trim().toLowerCase();

    const options = await buildAuthenticationOptions(email);
    await storeWebAuthnChallenge(options.challenge, "login");

    return NextResponse.json(options);
  } catch (err) {
    console.error("POST /api/auth/webauthn/authenticate/options failed:", err);
    return NextResponse.json(
      { error: "Could not start passkey sign-in" },
      { status: 500 }
    );
  }
}
