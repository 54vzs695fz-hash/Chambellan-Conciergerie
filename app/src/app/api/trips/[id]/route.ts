import { NextRequest, NextResponse } from "next/server";
import { deleteTrip, duplicateTrip, getTrip, updateTrip } from "@/lib/db/trips";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const trip = getTrip(Number(id));
  if (!trip) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(trip);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const trip = updateTrip(Number(id), { ...body });
  if (!trip) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(trip);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ok = deleteTrip(Number(id));
  if (!ok) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  if (body.action === "duplicate") {
    const copy = duplicateTrip(Number(id));
    if (!copy) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(copy, { status: 201 });
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
