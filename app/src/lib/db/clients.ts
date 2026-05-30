import type { Client as PrismaClientModel } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { Client } from "../types";

export interface ClientTripSummary {
  id: number;
  destination: string;
  arrival_date: string;
  departure_date: string;
  created_at: string;
  notes: string;
}

function mapClient(row: PrismaClientModel): Client {
  return {
    id: row.id,
    full_name: row.full_name,
    phone: row.phone,
    whatsapp: row.whatsapp,
    email: row.email,
    nationality: row.nationality,
    notes: row.notes,
    preferences: row.preferences,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

export async function listClients(search?: string): Promise<Client[]> {
  if (search?.trim()) {
    const q = search.trim();
    const rows = await prisma.client.findMany({
      where: {
        OR: [
          { full_name: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { phone: { contains: q, mode: "insensitive" } },
        ],
      },
      orderBy: { full_name: "asc" },
    });
    return rows.map(mapClient);
  }

  const rows = await prisma.client.findMany({ orderBy: { full_name: "asc" } });
  return rows.map(mapClient);
}

export async function getClient(id: number): Promise<Client | undefined> {
  const row = await prisma.client.findUnique({ where: { id } });
  return row ? mapClient(row) : undefined;
}

export async function createClient(
  data: Omit<Client, "id" | "created_at" | "updated_at">
): Promise<Client> {
  const row = await prisma.client.create({ data });
  return mapClient(row);
}

export async function updateClient(
  id: number,
  data: Omit<Client, "id" | "created_at" | "updated_at">
): Promise<Client | undefined> {
  try {
    const row = await prisma.client.update({ where: { id }, data });
    return mapClient(row);
  } catch {
    return undefined;
  }
}

export async function deleteClient(id: number): Promise<boolean> {
  try {
    await prisma.client.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

export async function getClientTripHistory(
  clientId: number
): Promise<ClientTripSummary[]> {
  const rows = await prisma.trip.findMany({
    where: { client_id: clientId },
    orderBy: { arrival_date: "desc" },
    select: {
      id: true,
      destination: true,
      arrival_date: true,
      departure_date: true,
      created_at: true,
      notes: true,
    },
  });
  return rows.map((row) => ({
    id: row.id,
    destination: row.destination,
    arrival_date: row.arrival_date,
    departure_date: row.departure_date,
    created_at: row.created_at.toISOString(),
    notes: row.notes,
  }));
}

export async function getClientDestinations(clientId: number): Promise<string[]> {
  const rows = await prisma.trip.findMany({
    where: { client_id: clientId, NOT: { destination: "" } },
    distinct: ["destination"],
    orderBy: { destination: "asc" },
    select: { destination: true },
  });
  return rows.map((row) => row.destination);
}
