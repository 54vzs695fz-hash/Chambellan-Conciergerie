import type { Establishment as PrismaEstablishment } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { Establishment } from "@/lib/types";
import { normalizeEstablishmentCommission } from "@/lib/establishments/commission";
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
    is_favorite: row.is_favorite,
    ...normalizeEstablishmentCommission({
      commission_available: row.commission_available,
      commission_calc_type: row.commission_calc_type,
      commission_percentage: row.commission_percentage,
      commission_fixed_amount: row.commission_fixed_amount,
      commission_calc_custom: row.commission_calc_custom,
      commission_basis: row.commission_basis,
      commission_basis_custom: row.commission_basis_custom,
      commission_eligibility: row.commission_eligibility,
      commission_eligibility_custom: row.commission_eligibility_custom,
      commission_threshold_amount: row.commission_threshold_amount,
    }),
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

export interface EstablishmentSearchOptions {
  q?: string;
  category?: string;
  city?: string;
  prioritizeCity?: string;
  favoritesOnly?: boolean;
  limit?: number;
}

export async function listEstablishments(
  options: EstablishmentSearchOptions = {}
): Promise<Establishment[]> {
  const { q, category, city, prioritizeCity, favoritesOnly, limit = 50 } = options;
  const where: {
    name?: { contains: string; mode: "insensitive" };
    category?: string;
    city?: { equals: string; mode: "insensitive" };
    is_favorite?: boolean;
  } = {};

  if (favoritesOnly) where.is_favorite = true;

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
    orderBy: [{ is_favorite: "desc" }, { city: "asc" }, { name: "asc" }],
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
  const commission = normalizeEstablishmentCommission(data);
  const row = await prisma.establishment.create({
    data: { ...data, ...commission, city: data.city.trim() },
  });
  return mapEstablishment(row);
}

export async function updateEstablishment(
  id: number,
  data: Omit<Establishment, "id" | "created_at" | "updated_at">
): Promise<Establishment | undefined> {
  try {
    const commission = normalizeEstablishmentCommission(data);
    const row = await prisma.establishment.update({
      where: { id },
      data: { ...data, ...commission, city: data.city.trim() },
    });
    return mapEstablishment(row);
  } catch {
    return undefined;
  }
}

export async function toggleEstablishmentFavorite(
  id: number
): Promise<Establishment | undefined> {
  const current = await prisma.establishment.findUnique({ where: { id } });
  if (!current) return undefined;
  const row = await prisma.establishment.update({
    where: { id },
    data: { is_favorite: !current.is_favorite },
  });
  return mapEstablishment(row);
}

export async function deleteEstablishment(id: number): Promise<boolean> {
  try {
    await prisma.establishment.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

export async function bulkDeleteEstablishments(ids: number[]): Promise<number> {
  const uniqueIds = [...new Set(ids.filter((id) => Number.isFinite(id) && id > 0))];
  if (!uniqueIds.length) return 0;
  const result = await prisma.establishment.deleteMany({
    where: { id: { in: uniqueIds } },
  });
  return result.count;
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
