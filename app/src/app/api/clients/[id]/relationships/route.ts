import { NextRequest, NextResponse } from "next/server";
import {
  createClientRelationship,
  listClientRelationships,
} from "@/lib/db/client-relationships";
import { normalizeClientRelationshipType } from "@/lib/crm/client-relationships";
import { getClient } from "@/lib/db/clients";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const clientId = Number((await params).id);
  if (!Number.isFinite(clientId) || clientId <= 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const client = await getClient(clientId);
  if (!client) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const relationships = await listClientRelationships(clientId);
  return NextResponse.json({ relationships });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const clientId = Number((await params).id);
  if (!Number.isFinite(clientId) || clientId <= 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const client = await getClient(clientId);
  if (!client) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = (await req.json()) as {
    related_client_id?: number;
    relationship_type?: string;
    notes?: string;
  };

  const relatedClientId = Number(body.related_client_id);
  if (!Number.isFinite(relatedClientId) || relatedClientId <= 0) {
    return NextResponse.json(
      { error: "Please select a related client." },
      { status: 400 }
    );
  }

  const relationship = await createClientRelationship(clientId, {
    related_client_id: relatedClientId,
    relationship_type: normalizeClientRelationshipType(body.relationship_type),
    notes: body.notes,
  });

  if (!relationship) {
    return NextResponse.json(
      { error: "Could not create relationship. It may already exist." },
      { status: 409 }
    );
  }

  return NextResponse.json(relationship, { status: 201 });
}
