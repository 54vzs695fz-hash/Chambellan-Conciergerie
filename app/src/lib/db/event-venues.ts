import type { EventVenue as PrismaEventVenue } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { EventVenueRecord } from "@/lib/types";
import { establishmentDedupKey } from "@/lib/establishments/destinations";

function mapVenue(
  row: PrismaEventVenue & { event?: { name: string } | null }
): EventVenueRecord {
  return {
    id: row.id,
    event_id: row.event_id,
    name: row.name,
    destination: row.destination,
    contact_name: row.contact_name,
    phone: row.phone,
    whatsapp: row.whatsapp,
    email: row.email,
    website: row.website,
    notes: row.notes,
    internal_notes: row.internal_notes,
    is_favorite: row.is_favorite,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
    event_name: row.event?.name,
  };
}

export interface EventVenueSearchOptions {
  q?: string;
  destination?: string;
  event_id?: number;
  prioritizeDestination?: string;
  favoritesOnly?: boolean;
  limit?: number;
}

export async function listEventVenues(
  options: EventVenueSearchOptions = {}
): Promise<EventVenueRecord[]> {
  const {
    q,
    destination,
    event_id,
    prioritizeDestination,
    favoritesOnly,
    limit = 50,
  } = options;

  const where: {
    name?: { contains: string; mode: "insensitive" };
    destination?: { equals: string; mode: "insensitive" };
    event_id?: number;
    is_favorite?: boolean;
  } = {};

  if (favoritesOnly) where.is_favorite = true;
  if (event_id) where.event_id = event_id;
  if (destination?.trim()) {
    where.destination = { equals: destination.trim(), mode: "insensitive" };
  }
  if (q?.trim()) where.name = { contains: q.trim(), mode: "insensitive" };

  const rows = await prisma.eventVenue.findMany({
    where,
    include: { event: { select: { name: true } } },
    orderBy: [
      { is_favorite: "desc" },
      { destination: "asc" },
      { name: "asc" },
    ],
    take: Math.min(Math.max(limit, 1), 200),
  });

  const mapped = rows.map(mapVenue);
  if (prioritizeDestination?.trim()) {
    const p = prioritizeDestination.trim().toLowerCase();
    return [...mapped].sort((a, b) => {
      const aMatch = a.destination.toLowerCase().includes(p);
      const bMatch = b.destination.toLowerCase().includes(p);
      if (aMatch !== bMatch) return aMatch ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }
  return mapped;
}

export async function getEventVenue(
  id: number
): Promise<EventVenueRecord | undefined> {
  const row = await prisma.eventVenue.findUnique({
    where: { id },
    include: { event: { select: { name: true } } },
  });
  return row ? mapVenue(row) : undefined;
}

export async function createEventVenue(
  data: Omit<EventVenueRecord, "id" | "created_at" | "updated_at" | "event_name">
): Promise<EventVenueRecord> {
  const row = await prisma.eventVenue.create({
    data: {
      event_id: data.event_id,
      name: data.name.trim(),
      destination: data.destination.trim(),
      contact_name: data.contact_name,
      phone: data.phone,
      whatsapp: data.whatsapp,
      email: data.email,
      website: data.website,
      notes: data.notes,
      internal_notes: data.internal_notes,
      is_favorite: data.is_favorite,
    },
    include: { event: { select: { name: true } } },
  });
  return mapVenue(row);
}

export async function updateEventVenue(
  id: number,
  data: Omit<EventVenueRecord, "id" | "created_at" | "updated_at" | "event_name">
): Promise<EventVenueRecord | undefined> {
  try {
    const row = await prisma.eventVenue.update({
      where: { id },
      data: {
        event_id: data.event_id,
        name: data.name.trim(),
        destination: data.destination.trim(),
        contact_name: data.contact_name,
        phone: data.phone,
        whatsapp: data.whatsapp,
        email: data.email,
        website: data.website,
        notes: data.notes,
        internal_notes: data.internal_notes,
        is_favorite: data.is_favorite,
      },
      include: { event: { select: { name: true } } },
    });
    return mapVenue(row);
  } catch {
    return undefined;
  }
}

export async function deleteEventVenue(id: number): Promise<boolean> {
  try {
    await prisma.eventVenue.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

export async function toggleEventVenueFavorite(
  id: number
): Promise<EventVenueRecord | undefined> {
  const current = await prisma.eventVenue.findUnique({ where: { id } });
  if (!current) return undefined;
  const row = await prisma.eventVenue.update({
    where: { id },
    data: { is_favorite: !current.is_favorite },
    include: { event: { select: { name: true } } },
  });
  return mapVenue(row);
}

export function validateEventVenueInput(
  data: Partial<EventVenueRecord>
): string | null {
  if (!data.name?.trim()) return "Venue name is required";
  if (!data.destination?.trim()) return "Destination is required";
  return null;
}

export function eventVenueDedupKey(name: string, destination: string): string {
  return establishmentDedupKey(name, destination);
}
