import { NextRequest, NextResponse } from "next/server";
import {
  deleteClientRelationship,
  updateClientRelationship,
} from "@/lib/db/client-relationships";
import { normalizeClientRelationshipType } from "@/lib/crm/client-relationships";
import { getClient } from "@/lib/db/clients";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; relId: string }> }
) {
  const { id, relId } = await params;
  const clientId = Number(id);
  const relationshipId = Number(relId);

  if (
    !Number.isFinite(clientId) ||
    clientId <= 0 ||
    !Number.isFinite(relationshipId) ||
    relationshipId <= 0
  ) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const client = await getClient(clientId);
  if (!client) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = (await req.json()) as {
    relationship_type?: string;
    notes?: string;
  };

  const relationship = await updateClientRelationship(clientId, relationshipId, {
    ...(body.relationship_type !== undefined
      ? {
          relationship_type: normalizeClientRelationshipType(
            body.relationship_type
          ),
        }
      : {}),
    ...(body.notes !== undefined ? { notes: body.notes } : {}),
  });

  if (!relationship) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(relationship);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; relId: string }> }
) {
  const { id, relId } = await params;
  const clientId = Number(id);
  const relationshipId = Number(relId);

  if (
    !Number.isFinite(clientId) ||
    clientId <= 0 ||
    !Number.isFinite(relationshipId) ||
    relationshipId <= 0
  ) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const ok = await deleteClientRelationship(clientId, relationshipId);
  if (!ok) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
