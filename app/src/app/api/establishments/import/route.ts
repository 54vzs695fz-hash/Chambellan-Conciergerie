import { NextRequest, NextResponse } from "next/server";
import {
  bulkImportEstablishments,
  validateEstablishmentInput,
} from "@/lib/db/establishments";
import type { EstablishmentInput } from "@/lib/types";
import { isEstablishmentCategory } from "@/lib/establishments/categories";
import { normalizeDestination } from "@/lib/establishments/destinations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ImportItemBody {
  name: string;
  city: string;
  category: string;
  website_url?: string;
  notes?: string;
  tags?: string;
  internal_notes?: string;
}

function sanitizeItem(raw: ImportItemBody): EstablishmentInput | null {
  if (!raw?.name?.trim() || !raw?.city?.trim() || !raw?.category?.trim()) {
    return null;
  }
  if (!isEstablishmentCategory(raw.category)) return null;

  const item: EstablishmentInput = {
    name: raw.name.trim(),
    category: raw.category,
    city: normalizeDestination(raw.city),
    address: "",
    contact_name: "",
    phone: "",
    whatsapp: "",
    email: "",
    website: raw.website_url?.trim() ?? "",
    instagram: "",
    notes: raw.notes?.trim() ?? "",
    price_level: "",
    tags: raw.tags?.trim() ?? "",
    internal_notes: raw.internal_notes?.trim() ?? "",
  };

  return validateEstablishmentInput(item) ? null : item;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const items = Array.isArray(body?.items) ? body.items : [];
    if (!items.length) {
      return NextResponse.json(
        { error: "No establishments selected for import" },
        { status: 400 }
      );
    }

    const sanitized = items
      .map((item: ImportItemBody) => sanitizeItem(item))
      .filter(Boolean) as EstablishmentInput[];

    if (!sanitized.length) {
      return NextResponse.json(
        { error: "No valid establishments to import" },
        { status: 400 }
      );
    }

    const result = await bulkImportEstablishments(sanitized);
    return NextResponse.json(result);
  } catch (err) {
    console.error("POST /api/establishments/import failed:", err);
    return NextResponse.json(
      { error: "Import failed. Please try again." },
      { status: 500 }
    );
  }
}
