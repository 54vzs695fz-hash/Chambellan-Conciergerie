import { NextResponse } from "next/server";
import { listEstablishmentCities } from "@/lib/db/establishments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await listEstablishmentCities());
  } catch (err) {
    console.error("GET /api/establishments/cities failed:", err);
    return NextResponse.json(
      { error: "Could not load destinations" },
      { status: 500 }
    );
  }
}
