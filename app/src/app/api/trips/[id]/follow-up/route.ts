import { NextRequest, NextResponse } from "next/server";
import { updateTripFollowUpStatus } from "@/lib/db/trips";
import type { TripFollowUpStatus } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID: TripFollowUpStatus[] = [
  "follow_up",
  "contacted",
  "confirmed",
  "completed",
];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const status = body?.follow_up_status as TripFollowUpStatus;

  if (!VALID.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const trip = await updateTripFollowUpStatus(Number(id), status);
  if (!trip) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(trip);
}
