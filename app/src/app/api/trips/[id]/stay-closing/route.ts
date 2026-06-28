import { NextRequest, NextResponse } from "next/server";
import {
  getStayClosingPreview,
  saveStayClosing,
} from "@/lib/db/stay-closing";
import type { StayClosingEntryInput } from "@/lib/types";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const tripId = Number(id);
  if (!Number.isFinite(tripId) || tripId <= 0) {
    return NextResponse.json({ error: "Invalid trip id" }, { status: 400 });
  }

  try {
    const preview = await getStayClosingPreview(tripId);
    if (!preview) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(preview);
  } catch (err) {
    console.error("GET /api/trips/[id]/stay-closing failed:", err);
    return NextResponse.json(
      { error: "Could not load stay closing" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const tripId = Number(id);
  if (!Number.isFinite(tripId) || tripId <= 0) {
    return NextResponse.json({ error: "Invalid trip id" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const entries = Array.isArray(body?.entries) ? body.entries : null;
  if (!entries) {
    return NextResponse.json({ error: "entries required" }, { status: 400 });
  }

  const normalized: StayClosingEntryInput[] = (entries as Record<string, unknown>[])
    .map((entry) => ({
      key: String(entry.key ?? ""),
      establishment_id:
        entry.establishment_id === null || entry.establishment_id === undefined
          ? null
          : Number(entry.establishment_id),
      establishment_name: String(entry.establishment_name ?? "").trim(),
      activity_ids: Array.isArray(entry.activity_ids)
        ? entry.activity_ids
            .map((value) => Number(value))
            .filter((value) => Number.isFinite(value) && value > 0)
        : [],
      approximate_total_bill: String(entry.approximate_total_bill ?? ""),
      food_amount: String(entry.food_amount ?? ""),
      premium_drinks_amount: String(entry.premium_drinks_amount ?? ""),
      internal_notes: String(entry.internal_notes ?? ""),
    }))
    .filter((entry: StayClosingEntryInput) => entry.key && entry.establishment_name);

  try {
    const closing = await saveStayClosing(tripId, normalized);
    if (!closing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(closing);
  } catch (err) {
    console.error("POST /api/trips/[id]/stay-closing failed:", err);
    return NextResponse.json(
      { error: "Could not save stay closing" },
      { status: 500 }
    );
  }
}
