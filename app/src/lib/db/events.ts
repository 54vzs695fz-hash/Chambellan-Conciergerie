import type { ConciergeEvent as PrismaEvent } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { ConciergeEventRecord } from "@/lib/types";
import { isEventCategory } from "@/lib/events/categories";

function mapEvent(row: PrismaEvent): ConciergeEventRecord {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    destination: row.destination,
    start_date: row.start_date,
    end_date: row.end_date,
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
  };
}

export interface EventSearchOptions {
  q?: string;
  category?: string;
  destination?: string;
  prioritizeDestination?: string;
  favoritesOnly?: boolean;
  limit?: number;
}

export async function listEvents(
  options: EventSearchOptions = {}
): Promise<ConciergeEventRecord[]> {
  const {
    q,
    category,
    destination,
    prioritizeDestination,
    favoritesOnly,
    limit = 50,
  } = options;

  const where: {
    name?: { contains: string; mode: "insensitive" };
    category?: string;
    destination?: { equals: string; mode: "insensitive" };
    is_favorite?: boolean;
  } = {};

  if (favoritesOnly) where.is_favorite = true;
  if (category && isEventCategory(category)) where.category = category;
  if (destination?.trim()) {
    where.destination = { equals: destination.trim(), mode: "insensitive" };
  }
  if (q?.trim()) where.name = { contains: q.trim(), mode: "insensitive" };

  const rows = await prisma.conciergeEvent.findMany({
    where,
    orderBy: [
      { is_favorite: "desc" },
      { destination: "asc" },
      { name: "asc" },
    ],
    take: Math.min(Math.max(limit, 1), 200),
  });

  const mapped = rows.map(mapEvent);
  if (prioritizeDestination?.trim()) {
    return sortEventsWithPrioritizedDestination(mapped, prioritizeDestination);
  }
  return mapped;
}

function sortEventsWithPrioritizedDestination(
  items: ConciergeEventRecord[],
  prioritize: string
): ConciergeEventRecord[] {
  const p = prioritize.trim().toLowerCase();
  return [...items].sort((a, b) => {
    const aMatch =
      a.destination.toLowerCase() === p ||
      a.destination.toLowerCase().includes(p) ||
      p.includes(a.destination.toLowerCase());
    const bMatch =
      b.destination.toLowerCase() === p ||
      b.destination.toLowerCase().includes(p) ||
      p.includes(b.destination.toLowerCase());
    if (aMatch !== bMatch) return aMatch ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

export async function getEvent(
  id: number
): Promise<ConciergeEventRecord | undefined> {
  const row = await prisma.conciergeEvent.findUnique({ where: { id } });
  return row ? mapEvent(row) : undefined;
}

export async function createEvent(
  data: Omit<ConciergeEventRecord, "id" | "created_at" | "updated_at">
): Promise<ConciergeEventRecord> {
  const row = await prisma.conciergeEvent.create({
    data: {
      ...data,
      name: data.name.trim(),
      destination: data.destination.trim(),
    },
  });
  return mapEvent(row);
}

export async function updateEvent(
  id: number,
  data: Omit<ConciergeEventRecord, "id" | "created_at" | "updated_at">
): Promise<ConciergeEventRecord | undefined> {
  try {
    const row = await prisma.conciergeEvent.update({
      where: { id },
      data: {
        ...data,
        name: data.name.trim(),
        destination: data.destination.trim(),
      },
    });
    return mapEvent(row);
  } catch {
    return undefined;
  }
}

export async function deleteEvent(id: number): Promise<boolean> {
  try {
    await prisma.conciergeEvent.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

export async function toggleEventFavorite(
  id: number
): Promise<ConciergeEventRecord | undefined> {
  const current = await prisma.conciergeEvent.findUnique({ where: { id } });
  if (!current) return undefined;
  const row = await prisma.conciergeEvent.update({
    where: { id },
    data: { is_favorite: !current.is_favorite },
  });
  return mapEvent(row);
}

export function validateEventInput(
  data: Partial<ConciergeEventRecord>
): string | null {
  if (!data.name?.trim()) return "Event name is required";
  if (!data.destination?.trim()) return "Destination is required";
  if (!data.category?.trim()) return "Category is required";
  return null;
}

export async function listEventDestinations(): Promise<string[]> {
  const rows = await prisma.conciergeEvent.findMany({
    where: { destination: { not: "" } },
    select: { destination: true },
    distinct: ["destination"],
    orderBy: { destination: "asc" },
  });
  return rows.map((r) => r.destination.trim()).filter(Boolean);
}

export function eventDedupKey(name: string, destination: string): string {
  return `${name.trim().toLowerCase()}|${destination.trim().toLowerCase()}`;
}

export async function getExistingEventKeys(): Promise<Set<string>> {
  const rows = await prisma.conciergeEvent.findMany({
    select: { name: true, destination: true },
  });
  return new Set(rows.map((r) => eventDedupKey(r.name, r.destination)));
}

export async function bulkImportEvents(
  items: Omit<ConciergeEventRecord, "id" | "created_at" | "updated_at">[]
): Promise<{ created: number; skipped: number; errors: string[] }> {
  const existingKeys = await getExistingEventKeys();
  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const item of items) {
    const key = eventDedupKey(item.name, item.destination);
    if (existingKeys.has(key)) {
      skipped++;
      continue;
    }
    const err = validateEventInput(item);
    if (err) {
      errors.push(`${item.name}: ${err}`);
      continue;
    }
    try {
      await createEvent(item);
      existingKeys.add(key);
      created++;
    } catch {
      errors.push(`${item.name}: could not save`);
    }
  }

  return { created, skipped, errors };
}
