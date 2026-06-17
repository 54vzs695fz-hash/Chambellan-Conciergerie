import { NextRequest, NextResponse } from "next/server";
import {
  activateChecklistCategory,
  addChecklistItem,
  ensureChecklistSeeded,
  getChecklistPanelData,
  listChecklistItems,
} from "@/lib/db/checklist";
import { CHECKLIST_CATEGORY_ORDER } from "@/lib/planner/checklist-defaults";
import type { ChecklistCategory } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const tripId = Number(id);
  const format = req.nextUrl.searchParams.get("format");

  if (format === "panel") {
    const panel = await getChecklistPanelData(tripId);
    if (!panel) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }
    return NextResponse.json(panel);
  }

  await ensureChecklistSeeded(tripId);
  const items = await listChecklistItems(tripId);
  return NextResponse.json(items);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const tripId = Number(id);
  const body = await req.json();
  const category = body.category as ChecklistCategory;

  if (!CHECKLIST_CATEGORY_ORDER.includes(category)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  if (body.action === "activate_category") {
    const items = await activateChecklistCategory(tripId, category);
    return NextResponse.json(items);
  }

  const title =
    typeof body.title === "string" && body.title.trim()
      ? body.title.trim()
      : "New item";
  const item = await addChecklistItem(tripId, category, title);
  return NextResponse.json(item, { status: 201 });
}
