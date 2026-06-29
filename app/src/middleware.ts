import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { isSessionVersionValid } from "@/lib/auth/auth-version";
import { SESSION_COOKIE } from "@/lib/auth/constants";
import {
  extractPlannerPrintTripId,
  verifyPdfExportToken,
} from "@/lib/pdf/pdf-export-token";

const PUBLIC_PATHS = new Set(["/login"]);

const PUBLIC_PREFIXES = [
  "/api/auth/",
  "/_next/",
  "/pwa/",
  "/brand/",
];

const PUBLIC_FILES = new Set([
  "/manifest.webmanifest",
  "/favicon.ico",
  "/apple-icon.png",
]);

function isPublicAsset(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  if (PUBLIC_FILES.has(pathname)) return true;
  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return true;
  }
  if (/\.(png|jpg|jpeg|svg|webp|ico|woff2?)$/i.test(pathname)) {
    return true;
  }
  return false;
}

async function hasValidSession(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return false;

  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) return false;

  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret)
    );
    return isSessionVersionValid(payload.v);
  } catch {
    return false;
  }
}

function clearSessionCookie(response: NextResponse): NextResponse {
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const printTripId = extractPlannerPrintTripId(pathname);
  if (printTripId !== null) {
    const pdfToken = request.nextUrl.searchParams.get("pdfToken");
    if (await verifyPdfExportToken(printTripId, pdfToken)) {
      return NextResponse.next();
    }
  }

  if (isPublicAsset(pathname)) {
    if (pathname === "/login" && (await hasValidSession(request))) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    if (pathname === "/login") {
      const token = request.cookies.get(SESSION_COOKIE)?.value;
      if (token) {
        return clearSessionCookie(NextResponse.next());
      }
    }
    return NextResponse.next();
  }

  const authed = await hasValidSession(request);
  if (!authed) {
    if (pathname.startsWith("/api/")) {
      return clearSessionCookie(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );
    }
    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/") {
      loginUrl.searchParams.set("next", pathname);
    }
    return clearSessionCookie(NextResponse.redirect(loginUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
