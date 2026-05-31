import type { EstablishmentCategory } from "@/lib/establishments/categories";
import type { EventCategory } from "@/lib/events/categories";
import {
  establishmentDedupKey,
  normalizeDestination,
  type LibraryDestination,
} from "@/lib/establishments/destinations";
import type { EstablishmentInput } from "@/lib/types";

const WEBSITE_BASE = "https://www.chambellan-conciergerie.fr";
const ANNONCES_URL = `${WEBSITE_BASE}/wp-json/wp/v2/annonces?per_page=100&status=publish`;

interface WpAnnonce {
  id: number;
  slug: string;
  title: { rendered: string };
  link: string;
  class_list?: string[];
}

export interface WebsiteImportRow {
  website_id: number;
  website_slug: string;
  website_url: string;
  name: string;
  city: LibraryDestination;
  category: EstablishmentCategory;
  event_category?: EventCategory;
  import_target: "establishment" | "event";
  website_category: string;
  website_city_slug: string;
  notes: string;
  tags: string;
  internal_notes: string;
  dedup_key: string;
  status: "new" | "exists" | "duplicate_batch";
  selected: boolean;
  payload: EstablishmentInput;
}

function decodeHtml(text: string): string {
  return text
    .replace(/&#8217;/g, "'")
    .replace(/&#038;/g, "&")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .trim();
}

function slugFromClassList(
  classList: string[],
  prefix: string
): string | undefined {
  const match = classList.find((c) => c.startsWith(prefix));
  return match?.slice(prefix.length);
}

function inferEventCategory(name: string): EventCategory | null {
  const lower = name.toLowerCase();
  if (/grand prix|formula\s*1|\bf1\b|gp monaco|formula e/.test(lower)) {
    return "grand_prix";
  }
  if (/film festival|cannes festival/.test(lower)) return "festival";
  if (/yacht show|boat show/.test(lower)) return "yacht_event";
  if (/white party|night event|amber lounge|house 44|turbo monaco/.test(lower)) {
    return "night_event";
  }
  if (/paddock|hospitality suite|vip experience/.test(lower)) {
    return "hospitality";
  }
  if (/art basel/.test(lower)) return "festival";
  return null;
}

function detectImportTarget(
  name: string,
  websiteCategory: string
): { import_target: "establishment" | "event"; event_category?: EventCategory } {
  const eventCategory = inferEventCategory(name);
  if (eventCategory) {
    return { import_target: "event", event_category: eventCategory };
  }
  if (websiteCategory === "event" || websiteCategory === "events") {
    return { import_target: "event", event_category: "other" };
  }
  return { import_target: "establishment" };
}

function mapWebsiteCategory(
  slug: string | undefined,
  name: string
): EstablishmentCategory {
  if (slug === "restaurant" && /beach|guérite|guerite/i.test(name)) {
    return "beach_club";
  }
  switch (slug) {
    case "restaurant":
      return "restaurant";
    case "night-club":
      return "club";
    case "hotel":
      return "hotel";
    case "villa":
      return "villa";
    case "yacht":
    case "boat":
      return "yacht";
    case "appartment":
      return "other";
    case "beach-club":
      return "beach_club";
    default:
      return inferCategoryFromName(slug ?? "");
  }
}

function inferCategoryFromName(text: string): EstablishmentCategory {
  const lower = text.toLowerCase();
  if (lower.includes("beach")) return "beach_club";
  if (lower.includes("club") || lower.includes("jimmy")) return "club";
  if (lower.includes("hotel") || lower.includes("palace")) return "hotel";
  if (lower.includes("villa") || lower.includes("chalet")) return "villa";
  if (lower.includes("yacht")) return "yacht";
  if (lower.includes("apartment") || lower.includes("appartement")) return "other";
  return "restaurant";
}

function mapWebsiteCity(slug: string | undefined, name: string): LibraryDestination {
  if (slug) {
    const normalized = slug.replace(/-/g, " ");
    return normalizeDestination(normalized);
  }
  return normalizeDestination(name);
}

function toPayload(
  row: Omit<
    WebsiteImportRow,
    "dedup_key" | "status" | "selected" | "payload"
  >
): EstablishmentInput {
  return {
    name: row.name,
    category: row.category,
    city: row.city,
    address: "",
    contact_name: "",
    phone: "",
    whatsapp: "",
    email: "",
    website: row.website_url,
    instagram: "",
    notes: row.notes,
    price_level: "",
    tags: row.tags,
    internal_notes: row.internal_notes,
    is_favorite: false,
  };
}

export async function fetchWebsiteEstablishments(): Promise<
  Omit<WebsiteImportRow, "status" | "selected">[]
> {
  const res = await fetch(ANNONCES_URL, {
    headers: { Accept: "application/json" },
    next: { revalidate: 0 },
  });
  if (!res.ok) {
    throw new Error(`Could not fetch website listings (${res.status})`);
  }
  const data = (await res.json()) as WpAnnonce[];
  if (!Array.isArray(data)) {
    throw new Error("Unexpected website API response");
  }

  return data.map((item) => {
    const classList = item.class_list ?? [];
    const websiteCategory =
      slugFromClassList(classList, "type-de-service-") ?? "";
    const websiteCitySlug = slugFromClassList(classList, "ville-") ?? "";
    const name = decodeHtml(item.title.rendered);
    const category = mapWebsiteCategory(websiteCategory, name);
    const city = mapWebsiteCity(websiteCitySlug, websiteCitySlug);
    const { import_target, event_category } = detectImportTarget(
      name,
      websiteCategory
    );
    const tags = [
      websiteCategory && websiteCategory !== category.replace("_", "-")
        ? `website:${websiteCategory}`
        : "",
      websiteCategory === "appartment" ? "apartment" : "",
    ]
      .filter(Boolean)
      .join(", ");

    const base = {
      website_id: item.id,
      website_slug: item.slug,
      website_url: item.link,
      name,
      city,
      category,
      event_category,
      import_target,
      website_category: websiteCategory,
      website_city_slug: websiteCitySlug,
      notes: `Curated selection from Chambellan Conciergerie website.`,
      tags,
      internal_notes: `Imported from ${WEBSITE_BASE} (WordPress annonce #${item.id}, slug: ${item.slug})`,
    };

    return {
      ...base,
      dedup_key: establishmentDedupKey(name, city),
      payload: toPayload(base),
    };
  });
}

export function buildImportPreview(
  websiteRows: Omit<WebsiteImportRow, "status" | "selected">[],
  existingEstablishmentKeys: Set<string>,
  existingEventKeys: Set<string> = new Set()
): WebsiteImportRow[] {
  const seenBatch = new Set<string>();
  const rows: WebsiteImportRow[] = [];

  for (const row of websiteRows) {
    const keySet =
      row.import_target === "event" ? existingEventKeys : existingEstablishmentKeys;
    let status: WebsiteImportRow["status"] = "new";
    if (keySet.has(row.dedup_key)) {
      status = "exists";
    } else if (seenBatch.has(row.dedup_key)) {
      status = "duplicate_batch";
    } else {
      seenBatch.add(row.dedup_key);
    }

    rows.push({
      ...row,
      status,
      selected: status === "new",
      payload: toPayload(row),
    });
  }

  return rows.sort((a, b) => {
    const cityCmp = a.city.localeCompare(b.city);
    if (cityCmp !== 0) return cityCmp;
    return a.name.localeCompare(b.name);
  });
}
