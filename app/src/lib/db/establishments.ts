import type { Establishment as PrismaEstablishment } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { Establishment } from "@/lib/types";
import { isEstablishmentCategory } from "@/lib/establishments/categories";

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
  limit?: number;
}

export async function listEstablishments(
  options: EstablishmentSearchOptions = {}
): Promise<Establishment[]> {
  const { q, category, city, limit = 50 } = options;
  const where: {
    OR?: Array<Record<string, unknown>>;
    category?: string;
    city?: { contains: string; mode: "insensitive" };
  } = {};

  if (category && isEstablishmentCategory(category)) {
    where.category = category;
  }

  if (city?.trim()) {
    where.city = { contains: city.trim(), mode: "insensitive" };
  }

  if (q?.trim()) {
    const term = q.trim();
    where.OR = [
      { name: { contains: term, mode: "insensitive" } },
      { city: { contains: term, mode: "insensitive" } },
      { tags: { contains: term, mode: "insensitive" } },
      { notes: { contains: term, mode: "insensitive" } },
    ];
  }

  const rows = await prisma.establishment.findMany({
    where,
    orderBy: [{ name: "asc" }],
    take: Math.min(Math.max(limit, 1), 100),
  });

  return rows.map(mapEstablishment);
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
  const row = await prisma.establishment.create({ data });
  return mapEstablishment(row);
}

export async function updateEstablishment(
  id: number,
  data: Omit<Establishment, "id" | "created_at" | "updated_at">
): Promise<Establishment | undefined> {
  try {
    const row = await prisma.establishment.update({ where: { id }, data });
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
  return rows.map((row) => row.city).filter(Boolean);
}
