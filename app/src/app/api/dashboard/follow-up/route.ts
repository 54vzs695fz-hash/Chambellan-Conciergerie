import { NextResponse } from "next/server";
import { listDashboardFollowUpItems } from "@/lib/db/checklist";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const items = await listDashboardFollowUpItems();
  return NextResponse.json(items);
}
