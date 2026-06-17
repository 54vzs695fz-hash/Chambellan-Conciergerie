import { NextResponse } from "next/server";
import { getTrip } from "@/lib/db/trips";
import {
  buildReservationStatusItems,
  formatBookingStatusSummary,
} from "@/lib/reservations/reservation-status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const trip = await getTrip(Number(id));
  if (!trip) {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }

  const items = buildReservationStatusItems(trip.days);
  return NextResponse.json({
    items,
    summary: formatBookingStatusSummary(items),
  });
}
