import { NextRequest, NextResponse } from "next/server";
import {
  deleteChecklistItem,
  updateChecklistItem,
} from "@/lib/db/checklist";
import type { ChecklistItemStatus } from "@/lib/types";

export const runtime = "nodejs";

const VALID_STATUSES: ChecklistItemStatus[] = ["todo", "in_progress", "done"];

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const fields: Record<string, unknown> = {};

  if (typeof body.title === "string") fields.title = body.title;
  if (typeof body.notes === "string") fields.notes = body.notes;
  if (typeof body.due_date === "string") fields.due_date = body.due_date;
  if (typeof body.reminder_date === "string") {
    fields.reminder_date = body.reminder_date;
  }
  if (typeof body.category === "string") fields.category = body.category;
  if (typeof body.sort_order === "number") fields.sort_order = body.sort_order;
  if (
    typeof body.status === "string" &&
    VALID_STATUSES.includes(body.status as ChecklistItemStatus)
  ) {
    fields.status = body.status;
  }

  const item = await updateChecklistItem(Number(id), fields);
  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(item);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ok = await deleteChecklistItem(Number(id));
  if (!ok) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
