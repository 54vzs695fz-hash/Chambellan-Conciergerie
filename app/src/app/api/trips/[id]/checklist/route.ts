import { NextRequest, NextResponse } from "next/server";
import {
  addChecklistItem,
  ensureChecklistSeeded,
  listChecklistItems,
} from "@/lib/db/checklist";
import { CHECKLIST_CATEGORY_ORDER } from "@/lib/planner/checklist-defaults";
import type { ChecklistCategory } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const tripId = Number(id);
  await ensureChecklistSeeded(tripId);
  const items = await listChecklistItems(tripId);
  return NextResponse.json(items);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const category = body.category as ChecklistCategory;
  if (!CHECKLIST_CATEGORY_ORDER.includes(category)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }
  const title =
    typeof body.title === "string" && body.title.trim()
      ? body.title.trim()
      : "New item";
  const item = await addChecklistItem(Number(id), category, title);
  return NextResponse.json(item, { status: 201 });
}
