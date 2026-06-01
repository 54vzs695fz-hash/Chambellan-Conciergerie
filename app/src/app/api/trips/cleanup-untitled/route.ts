import { NextResponse } from "next/server";
import { deleteUntitledDestinationTrips } from "@/lib/db/trips";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const deleted = await deleteUntitledDestinationTrips();
    return NextResponse.json({ deleted });
  } catch (err) {
    console.error("POST /api/trips/cleanup-untitled failed:", err);
    return NextResponse.json(
      { error: "Could not delete planners" },
      { status: 500 }
    );
  }
}
