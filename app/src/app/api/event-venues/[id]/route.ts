import { NextRequest, NextResponse } from "next/server";
import {
  deleteEventVenue,
  getEventVenue,
  toggleEventVenueFavorite,
  updateEventVenue,
  validateEventVenueInput,
} from "@/lib/db/event-venues";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const venueId = Number(id);
  const venue = await getEventVenue(venueId);
  if (!venue) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(venue);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const venueId = Number(id);
  const body = await req.json();
  const err = validateEventVenueInput(body);
  if (err) return NextResponse.json({ error: err }, { status: 400 });
  const venue = await updateEventVenue(venueId, body);
  if (!venue) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(venue);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const venueId = Number(id);
  const body = await req.json().catch(() => ({}));
  if (body?.action === "toggle_favorite") {
    const venue = await toggleEventVenueFavorite(venueId);
    if (!venue) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(venue);
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ok = await deleteEventVenue(Number(id));
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
