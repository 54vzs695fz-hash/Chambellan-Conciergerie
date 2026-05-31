import { NextRequest, NextResponse } from "next/server";
import { bulkDeleteEstablishments } from "@/lib/db/establishments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const ids = Array.isArray(body?.ids)
      ? body.ids.map((id: unknown) => Number(id)).filter((id: number) => id > 0)
      : [];

    if (!ids.length) {
      return NextResponse.json({ error: "No establishments selected" }, { status: 400 });
    }

    const deleted = await bulkDeleteEstablishments(ids);
    return NextResponse.json({ deleted });
  } catch (err) {
    console.error("POST /api/establishments/bulk-delete failed:", err);
    return NextResponse.json(
      { error: "Could not delete establishments" },
      { status: 500 }
    );
  }
}
