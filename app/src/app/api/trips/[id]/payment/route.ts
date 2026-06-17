import { NextRequest, NextResponse } from "next/server";
import { completePaymentChecklistItems } from "@/lib/db/checklist";
import { updateTripPaymentFields } from "@/lib/db/trips";
import {
  isTripPaymentMethod,
  isTripPaymentStatus,
  normalizeTripPaymentStatus,
} from "@/lib/planner/payment-status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const tripId = Number(id);
  const body = await req.json().catch(() => ({}));

  const fields: Parameters<typeof updateTripPaymentFields>[1] = {};

  if (body?.payment_status !== undefined) {
    if (!isTripPaymentStatus(body.payment_status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    fields.payment_status = body.payment_status;
  }
  if (body?.total_amount !== undefined) {
    fields.total_amount = String(body.total_amount ?? "");
  }
  if (body?.amount_received !== undefined) {
    fields.amount_received = String(body.amount_received ?? "");
  }
  if (body?.payment_method !== undefined) {
    const method = String(body.payment_method ?? "");
    fields.payment_method = method && isTripPaymentMethod(method) ? method : "";
  }
  if (body?.payment_notes !== undefined) {
    fields.payment_notes = String(body.payment_notes ?? "");
  }

  if (Object.keys(fields).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const trip = await updateTripPaymentFields(tripId, fields);
  if (!trip) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (normalizeTripPaymentStatus(trip.payment_status) === "fully_paid") {
    await completePaymentChecklistItems(tripId);
  }

  return NextResponse.json(trip);
}
