import { NextRequest, NextResponse } from "next/server";
import {
  deleteClient,
  getClient,
  getClientDestinations,
  getClientTripHistory,
  updateClient,
} from "@/lib/db/clients";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (id === "new" || id === "create") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const clientId = Number(id);
  if (!Number.isFinite(clientId) || clientId <= 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const client = getClient(clientId);
  if (!client) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const history = req.nextUrl.searchParams.get("history");
  if (history === "1") {
    return NextResponse.json({
      client,
      trips: getClientTripHistory(clientId),
      destinations: getClientDestinations(clientId),
    });
  }
  return NextResponse.json(client);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const client = updateClient(Number(id), body);
  if (!client) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(client);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ok = deleteClient(Number(id));
  if (!ok) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
