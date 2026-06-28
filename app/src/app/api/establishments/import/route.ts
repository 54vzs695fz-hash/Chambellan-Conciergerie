import { NextRequest, NextResponse } from "next/server";
import {
  bulkImportEstablishments,
  validateEstablishmentInput,
} from "@/lib/db/establishments";
import { bulkImportEvents, validateEventInput } from "@/lib/db/events";
import { DEFAULT_ESTABLISHMENT_COMMISSION } from "@/lib/establishments/commission";
import type { EstablishmentInput } from "@/lib/types";
import { isEstablishmentCategory } from "@/lib/establishments/categories";
import { isEventCategory } from "@/lib/events/categories";
import { normalizeDestination } from "@/lib/establishments/destinations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ImportItemBody {
  name: string;
  city: string;
  category: string;
  import_target?: "establishment" | "event";
  event_category?: string;
  website_url?: string;
  notes?: string;
  tags?: string;
  internal_notes?: string;
}

function sanitizeEstablishment(raw: ImportItemBody): EstablishmentInput | null {
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
    is_favorite: false,
    ...DEFAULT_ESTABLISHMENT_COMMISSION,
  };

  return validateEstablishmentInput(item) ? null : item;
}

function sanitizeEvent(raw: ImportItemBody) {
  if (!raw?.name?.trim() || !raw?.city?.trim()) return null;
  const category = raw.event_category?.trim() || "other";
  if (!isEventCategory(category)) return null;

  const item = {
    name: raw.name.trim(),
    destination: normalizeDestination(raw.city),
    category,
    start_date: "",
    end_date: "",
    contact_name: "",
    phone: "",
    whatsapp: "",
    email: "",
    website: raw.website_url?.trim() ?? "",
    notes: raw.notes?.trim() ?? "",
    internal_notes: raw.internal_notes?.trim() ?? "",
    is_favorite: false,
  };

  return validateEventInput(item) ? null : item;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const items = Array.isArray(body?.items) ? body.items : [];
    if (!items.length) {
      return NextResponse.json(
        { error: "No items selected for import" },
        { status: 400 }
      );
    }

    const establishments: EstablishmentInput[] = [];
    const events: NonNullable<ReturnType<typeof sanitizeEvent>>[] = [];

    for (const item of items as ImportItemBody[]) {
      if (item.import_target === "event") {
        const event = sanitizeEvent(item);
        if (event) events.push(event);
      } else {
        const est = sanitizeEstablishment(item);
        if (est) establishments.push(est);
      }
    }

    if (!establishments.length && !events.length) {
      return NextResponse.json(
        { error: "No valid items to import" },
        { status: 400 }
      );
    }

    const [estResult, eventResult] = await Promise.all([
      establishments.length
        ? bulkImportEstablishments(establishments)
        : Promise.resolve({ created: 0, skipped: 0, errors: [] as string[] }),
      events.length
        ? bulkImportEvents(events)
        : Promise.resolve({ created: 0, skipped: 0, errors: [] as string[] }),
    ]);

    return NextResponse.json({
      created: estResult.created + eventResult.created,
      skipped: estResult.skipped + eventResult.skipped,
      establishments_created: estResult.created,
      events_created: eventResult.created,
      errors: [...estResult.errors, ...eventResult.errors],
    });
  } catch (err) {
    console.error("POST /api/establishments/import failed:", err);
    return NextResponse.json(
      { error: "Import failed. Please try again." },
      { status: 500 }
    );
  }
}
