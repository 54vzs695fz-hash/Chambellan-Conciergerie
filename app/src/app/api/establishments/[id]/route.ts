import { NextRequest, NextResponse } from "next/server";
import {
  deleteEstablishment,
  getEstablishment,
  updateEstablishment,
  validateEstablishmentInput,
} from "@/lib/db/establishments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const establishmentId = Number(id);
    if (!Number.isFinite(establishmentId) || establishmentId <= 0) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    const establishment = await getEstablishment(establishmentId);
    if (!establishment) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(establishment);
  } catch (err) {
    console.error("GET /api/establishments/[id] failed:", err);
    return NextResponse.json(
      { error: "Could not load establishment" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const establishmentId = Number(id);
    if (!Number.isFinite(establishmentId) || establishmentId <= 0) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    const body = await req.json();
    const validationError = validateEstablishmentInput(body);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }
    const establishment = await updateEstablishment(establishmentId, body);
    if (!establishment) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(establishment);
  } catch (err) {
    console.error("PUT /api/establishments/[id] failed:", err);
    return NextResponse.json(
      { error: "Could not update establishment" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const establishmentId = Number(id);
    if (!Number.isFinite(establishmentId) || establishmentId <= 0) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    const ok = await deleteEstablishment(establishmentId);
    if (!ok) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/establishments/[id] failed:", err);
    return NextResponse.json(
      { error: "Could not delete establishment" },
      { status: 500 }
    );
  }
}
