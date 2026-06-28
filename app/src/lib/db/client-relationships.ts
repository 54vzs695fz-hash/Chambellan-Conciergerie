import type { ClientRelationship as PrismaClientRelationship } from "@/generated/prisma/client";
import { normalizeClientRelationshipType } from "@/lib/crm/client-relationships";
import { prisma } from "@/lib/prisma";
import type {
  ClientRelationship,
  ClientRelationshipType,
  ClientRelationshipWithClient,
} from "@/lib/types";

function mapRelationship(row: PrismaClientRelationship): ClientRelationship {
  return {
    id: row.id,
    client_id: row.client_id,
    related_client_id: row.related_client_id,
    relationship_type: normalizeClientRelationshipType(row.relationship_type),
    notes: row.notes,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

export async function listClientRelationships(
  clientId: number
): Promise<ClientRelationshipWithClient[]> {
  const rows = await prisma.clientRelationship.findMany({
    where: { client_id: clientId },
    orderBy: [{ relationship_type: "asc" }, { id: "asc" }],
    include: {
      related_client: {
        select: { id: true, full_name: true },
      },
    },
  });

  return rows.map((row) => ({
    ...mapRelationship(row),
    related_client: {
      id: row.related_client.id,
      full_name: row.related_client.full_name,
    },
  }));
}

export async function createClientRelationship(
  clientId: number,
  input: {
    related_client_id: number;
    relationship_type: ClientRelationshipType;
    notes?: string;
  }
): Promise<ClientRelationshipWithClient | null> {
  if (input.related_client_id === clientId) return null;

  const related = await prisma.client.findUnique({
    where: { id: input.related_client_id },
    select: { id: true, full_name: true },
  });
  if (!related) return null;

  try {
    const row = await prisma.clientRelationship.create({
      data: {
        client_id: clientId,
        related_client_id: input.related_client_id,
        relationship_type: input.relationship_type,
        notes: input.notes?.trim() ?? "",
      },
      include: {
        related_client: {
          select: { id: true, full_name: true },
        },
      },
    });

    return {
      ...mapRelationship(row),
      related_client: {
        id: row.related_client.id,
        full_name: row.related_client.full_name,
      },
    };
  } catch {
    return null;
  }
}

export async function updateClientRelationship(
  clientId: number,
  relationshipId: number,
  input: {
    relationship_type?: ClientRelationshipType;
    notes?: string;
  }
): Promise<ClientRelationshipWithClient | null> {
  try {
    const row = await prisma.clientRelationship.update({
      where: {
        id: relationshipId,
        client_id: clientId,
      },
      data: {
        ...(input.relationship_type !== undefined
          ? { relationship_type: input.relationship_type }
          : {}),
        ...(input.notes !== undefined ? { notes: input.notes.trim() } : {}),
      },
      include: {
        related_client: {
          select: { id: true, full_name: true },
        },
      },
    });

    return {
      ...mapRelationship(row),
      related_client: {
        id: row.related_client.id,
        full_name: row.related_client.full_name,
      },
    };
  } catch {
    return null;
  }
}

export async function deleteClientRelationship(
  clientId: number,
  relationshipId: number
): Promise<boolean> {
  try {
    await prisma.clientRelationship.delete({
      where: {
        id: relationshipId,
        client_id: clientId,
      },
    });
    return true;
  } catch {
    return false;
  }
}
