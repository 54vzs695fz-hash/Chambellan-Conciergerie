import { NextRequest, NextResponse } from "next/server";
import { markCommissionReceived } from "@/lib/db/business-dashboard";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const entryId = Number(id);
  if (!Number.isFinite(entryId) || entryId <= 0) {
    return NextResponse.json({ error: "Invalid entry id" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const received = Boolean(body?.received);

  try {
    const ok = await markCommissionReceived(entryId, received);
    if (!ok) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ entry_id: entryId, received });
  } catch (err) {
    console.error("PATCH /api/dashboard/business/commissions/[id] failed:", err);
    return NextResponse.json(
      { error: "Could not update commission status" },
      { status: 500 }
    );
  }
}
