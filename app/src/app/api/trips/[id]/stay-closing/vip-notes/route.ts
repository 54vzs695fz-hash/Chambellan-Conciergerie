import { NextRequest, NextResponse } from "next/server";
import { updateStayClosingVipNotes } from "@/lib/db/client-stay-history";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const tripId = Number(id);
  if (!Number.isFinite(tripId) || tripId <= 0) {
    return NextResponse.json({ error: "Invalid trip id" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const vipNotes =
    typeof body?.vip_notes === "string" ? body.vip_notes : undefined;

  if (vipNotes === undefined) {
    return NextResponse.json({ error: "vip_notes required" }, { status: 400 });
  }

  try {
    const result = await updateStayClosingVipNotes(tripId, vipNotes);
    if (!result) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error("PATCH /api/trips/[id]/stay-closing/vip-notes failed:", err);
    return NextResponse.json(
      { error: "Could not save VIP notes" },
      { status: 500 }
    );
  }
}
