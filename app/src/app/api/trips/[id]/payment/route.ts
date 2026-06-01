import { NextRequest, NextResponse } from "next/server";
import { updateTripPaymentStatus } from "@/lib/db/trips";
import { isTripPaymentStatus } from "@/lib/planner/payment-status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const status = body?.payment_status;

  if (!isTripPaymentStatus(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const trip = await updateTripPaymentStatus(Number(id), status);
  if (!trip) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(trip);
}
