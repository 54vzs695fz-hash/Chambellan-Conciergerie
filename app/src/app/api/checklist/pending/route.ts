import { NextResponse } from "next/server";
import { listPendingChecklistItems } from "@/lib/db/checklist";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const items = await listPendingChecklistItems();
  return NextResponse.json(items);
}
