import { NextResponse } from "next/server";
import { storeWebAuthnChallenge } from "@/lib/auth/challenge";
import { getSession } from "@/lib/auth/session";
import { buildRegistrationOptions } from "@/lib/auth/webauthn";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const options = await buildRegistrationOptions(
      Number(session.sub),
      session.email
    );
    await storeWebAuthnChallenge(options.challenge, "register", Number(session.sub));

    return NextResponse.json(options);
  } catch (err) {
    console.error("POST /api/auth/webauthn/register/options failed:", err);
    return NextResponse.json(
      { error: "Could not start passkey registration" },
      { status: 500 }
    );
  }
}
