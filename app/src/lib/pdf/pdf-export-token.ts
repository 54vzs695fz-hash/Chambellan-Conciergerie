import { SignJWT, jwtVerify } from "jose";

const PDF_EXPORT_PURPOSE = "planner-pdf-export";
const PDF_EXPORT_TTL_SEC = 120;

function getAuthSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must be set (minimum 32 characters)");
  }
  return new TextEncoder().encode(secret);
}

export async function createPdfExportToken(tripId: number): Promise<string> {
  return new SignJWT({ tripId, purpose: PDF_EXPORT_PURPOSE })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${PDF_EXPORT_TTL_SEC}s`)
    .sign(getAuthSecret());
}

export async function verifyPdfExportToken(
  tripId: number,
  token: string | null | undefined
): Promise<boolean> {
  if (!token?.trim()) return false;

  try {
    const { payload } = await jwtVerify(token.trim(), getAuthSecret());
    return (
      payload.purpose === PDF_EXPORT_PURPOSE &&
      Number(payload.tripId) === tripId
    );
  } catch {
    return false;
  }
}

export function extractPlannerPrintTripId(pathname: string): number | null {
  const match = pathname.match(/^\/planner\/(\d+)\/print$/);
  if (!match) return null;
  const tripId = Number(match[1]);
  return Number.isFinite(tripId) ? tripId : null;
}
