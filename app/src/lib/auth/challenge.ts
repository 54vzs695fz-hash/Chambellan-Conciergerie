import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "./constants";

const CHALLENGE_COOKIE = "chambellan_webauthn_challenge";

function getAuthSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must be set (minimum 32 characters)");
  }
  return new TextEncoder().encode(secret);
}

export async function storeWebAuthnChallenge(
  challenge: string,
  purpose: "register" | "login",
  userId?: number
): Promise<void> {
  const token = await new SignJWT({ challenge, purpose, userId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("5m")
    .sign(getAuthSecret());

  const cookieStore = await cookies();
  cookieStore.set(CHALLENGE_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 300,
  });
}

export async function consumeWebAuthnChallenge(
  purpose: "register" | "login"
): Promise<{ challenge: string; userId?: number } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(CHALLENGE_COOKIE)?.value;
  cookieStore.delete(CHALLENGE_COOKIE);

  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getAuthSecret());
    if (payload.purpose !== purpose || typeof payload.challenge !== "string") {
      return null;
    }
    return {
      challenge: payload.challenge,
      userId:
        typeof payload.userId === "number"
          ? payload.userId
          : payload.userId != null
            ? Number(payload.userId)
            : undefined,
    };
  } catch {
    return null;
  }
}

export { SESSION_COOKIE };
