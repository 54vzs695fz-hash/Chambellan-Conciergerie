import type { Establishment as PrismaEstablishment } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { Establishment } from "@/lib/types";
import { isEstablishmentCategory } from "@/lib/establishments/categories";
import { establishmentDedupKey } from "@/lib/establishments/destinations";
import {
  sortEstablishmentsAlphabetically,
  sortEstablishmentsWithPrioritizedCity,
} from "@/lib/establishments/group-by-city";

function mapEstablishment(row: PrismaEstablishment): Establishment {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    city: row.city,
    address: row.address,
    contact_name: row.contact_name,
    phone: row.phone,
    whatsapp: row.whatsapp,
    email: row.email,
    website: row.website,
    instagram: row.instagram,
    notes: row.notes,
    price_level: row.price_level,
    tags: row.tags,
    internal_notes: row.internal_notes,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

export interface EstablishmentSearchOptions {
  q?: string;
  category?: string;
  city?: string;
  prioritizeCity?: string;
  limit?: number;
}

export async function listEstablishments(
  options: EstablishmentSearchOptions = {}
): Promise<Establishment[]> {
  const { q, category, city, prioritizeCity, limit = 50 } = options;
  const where: {
    name?: { contains: string; mode: "insensitive" };
    category?: string;
    city?: { equals: string; mode: "insensitive" };
  } = {};

  if (category && isEstablishmentCategory(category)) {
    where.category = category;
  }

  if (city?.trim()) {
    where.city = { equals: city.trim(), mode: "insensitive" };
  }

  if (q?.trim()) {
    where.name = { contains: q.trim(), mode: "insensitive" };
  }

  const rows = await prisma.establishment.findMany({
    where,
    orderBy: [{ city: "asc" }, { name: "asc" }],
    take: Math.min(Math.max(limit, 1), 200),
  });

  const mapped = rows.map(mapEstablishment);

  if (prioritizeCity?.trim()) {
    return sortEstablishmentsWithPrioritizedCity(mapped, prioritizeCity);
  }

  return sortEstablishmentsAlphabetically(mapped);
}

export async function getEstablishment(
  id: number
): Promise<Establishment | undefined> {
  const row = await prisma.establishment.findUnique({ where: { id } });
  return row ? mapEstablishment(row) : undefined;
}

export async function createEstablishment(
  data: Omit<Establishment, "id" | "created_at" | "updated_at">
): Promise<Establishment> {
  const row = await prisma.establishment.create({
    data: { ...data, city: data.city.trim() },
  });
  return mapEstablishment(row);
}

export async function updateEstablishment(
  id: number,
  data: Omit<Establishment, "id" | "created_at" | "updated_at">
): Promise<Establishment | undefined> {
  try {
    const row = await prisma.establishment.update({
      where: { id },
      data: { ...data, city: data.city.trim() },
    });
    return mapEstablishment(row);
  } catch {
    return undefined;
  }
}

export async function deleteEstablishment(id: number): Promise<boolean> {
  try {
    await prisma.establishment.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

export async function listEstablishmentCities(): Promise<string[]> {
  const rows = await prisma.establishment.findMany({
    where: { city: { not: "" } },
    select: { city: true },
    distinct: ["city"],
    orderBy: { city: "asc" },
  });
  return rows.map((row) => row.city.trim()).filter(Boolean);
}

export function validateEstablishmentInput(
  data: Partial<Establishment>
): string | null {
  if (!data.name?.trim()) return "Name is required";
  if (!data.city?.trim()) return "City / destination is required";
  if (!data.category?.trim()) return "Category is required";
  return null;
}

export async function getExistingEstablishmentKeys(): Promise<Set<string>> {
  const rows = await prisma.establishment.findMany({
    select: { name: true, city: true },
  });
  return new Set(rows.map((r) => establishmentDedupKey(r.name, r.city)));
}

export async function bulkImportEstablishments(
  items: Omit<Establishment, "id" | "created_at" | "updated_at">[]
): Promise<{ created: number; skipped: number; errors: string[] }> {
  const existingKeys = await getExistingEstablishmentKeys();
  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const item of items) {
    const validationError = validateEstablishmentInput(item);
    if (validationError) {
      errors.push(`${item.name}: ${validationError}`);
      continue;
    }

    const key = establishmentDedupKey(item.name, item.city);
    if (existingKeys.has(key)) {
      skipped++;
      continue;
    }

    try {
      await prisma.establishment.create({
        data: { ...item, city: item.city.trim(), name: item.name.trim() },
      });
      existingKeys.add(key);
      created++;
    } catch {
      errors.push(`${item.name}: could not save`);
    }
  }

  return { created, skipped, errors };
}
