import { NextRequest, NextResponse } from "next/server";
import {
  deleteEvent,
  getEvent,
  toggleEventFavorite,
  updateEvent,
  validateEventInput,
} from "@/lib/db/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const eventId = Number(id);
  if (!Number.isFinite(eventId) || eventId <= 0) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const event = await getEvent(eventId);
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(event);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const eventId = Number(id);
  if (!Number.isFinite(eventId) || eventId <= 0) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const body = await req.json();
  const err = validateEventInput(body);
  if (err) return NextResponse.json({ error: err }, { status: 400 });
  const event = await updateEvent(eventId, body);
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(event);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const eventId = Number(id);
  const body = await req.json().catch(() => ({}));
  if (body?.action === "toggle_favorite") {
    const event = await toggleEventFavorite(eventId);
    if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(event);
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const eventId = Number(id);
  const ok = await deleteEvent(eventId);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
