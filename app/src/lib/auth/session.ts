import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import {
  SESSION_BROWSER_AGE_SEC,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SEC,
} from "./constants";

export { SESSION_COOKIE };

export interface SessionPayload {
  sub: string;
  email: string;
  name: string;
  role: string;
}

function getAuthSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must be set (minimum 32 characters)");
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(
  payload: Omit<SessionPayload, "sub"> & { userId: number },
  rememberDevice = true
): Promise<string> {
  const maxAgeSec = rememberDevice
    ? SESSION_MAX_AGE_SEC
    : SESSION_BROWSER_AGE_SEC;

  return new SignJWT({
    email: payload.email,
    name: payload.name,
    role: payload.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(payload.userId))
    .setIssuedAt()
    .setExpirationTime(`${maxAgeSec}s`)
    .sign(getAuthSecret());
}

export async function verifySessionToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getAuthSecret());
    if (
      !payload.sub ||
      typeof payload.email !== "string" ||
      typeof payload.name !== "string"
    ) {
      return null;
    }
    return {
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
      role: typeof payload.role === "string" ? payload.role : "admin",
    };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function getSessionFromRequest(
  request: NextRequest
): Promise<SessionPayload | null> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export function sessionCookieOptions(rememberDevice = true) {
  const base = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };

  if (rememberDevice) {
    return { ...base, maxAge: SESSION_MAX_AGE_SEC };
  }

  return base;
}
