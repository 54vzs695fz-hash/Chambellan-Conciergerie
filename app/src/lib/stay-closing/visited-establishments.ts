import {
  ACTIVITY_TYPE_ESTABLISHMENT_CATEGORY,
  isEstablishmentCategory,
  type EstablishmentCategory,
} from "@/lib/establishments/categories";
import type { EstablishmentCommissionFields } from "@/lib/establishments/commission";
import { normalizeEstablishmentCommission } from "@/lib/establishments/commission";
import { getStayClosingFieldRequirements } from "@/lib/stay-closing/field-requirements";
import type { ActivityType, Establishment, TripWithDays } from "@/lib/types";

const VISITED_ACTIVITY_TYPES = new Set<ActivityType>([
  "restaurant",
  "beach_club",
  "club",
]);

export interface VisitedEstablishment {
  key: string;
  establishment_id: number | null;
  establishment_name: string;
  category: EstablishmentCategory | null;
  activity_ids: number[];
  visit_dates: string[];
  commission: EstablishmentCommissionFields;
  field_requirements: ReturnType<typeof getStayClosingFieldRequirements>;
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

function resolveCategory(
  matched: Establishment | undefined,
  activityCategory: EstablishmentCategory | null
): EstablishmentCategory | null {
  if (matched && isEstablishmentCategory(matched.category)) {
    return matched.category;
  }
  return activityCategory;
}

function buildKey(name: string, establishmentId: number | null): string {
  if (establishmentId) return `est-${establishmentId}`;
  return `name-${normalizeName(name)}`;
}

export function collectVisitedEstablishmentsFromTrip(
  trip: TripWithDays,
  establishmentByName: Map<string, Establishment>
): VisitedEstablishment[] {
  const grouped = new Map<
    string,
    {
      establishment_id: number | null;
      establishment_name: string;
      category: EstablishmentCategory | null;
      activity_ids: number[];
      visit_dates: string[];
    }
  >();

  for (const day of trip.days) {
    for (const activity of day.activities) {
      if (!VISITED_ACTIVITY_TYPES.has(activity.activity_type)) continue;
      const title = activity.title.trim();
      if (!title) continue;

      const category =
        ACTIVITY_TYPE_ESTABLISHMENT_CATEGORY[activity.activity_type] ?? null;
      const lookupKey = category
        ? `${normalizeName(title)}::${category}`
        : normalizeName(title);
      const fallbackKey = normalizeName(title);
      const matched =
        establishmentByName.get(lookupKey) ??
        establishmentByName.get(fallbackKey);

      const establishment_id = matched?.id ?? null;
      const key = buildKey(title, establishment_id);
      const existing = grouped.get(key);

      if (existing) {
        existing.activity_ids.push(activity.id);
        if (day.date && !existing.visit_dates.includes(day.date)) {
          existing.visit_dates.push(day.date);
        }
        continue;
      }

      grouped.set(key, {
        establishment_id,
        establishment_name: matched?.name ?? title,
        category: resolveCategory(matched, category),
        activity_ids: [activity.id],
        visit_dates: day.date ? [day.date] : [],
      });
    }
  }

  return Array.from(grouped.entries())
    .map(([key, row]) => {
      const matched =
        row.establishment_id !== null
          ? establishmentByName.get(`id-${row.establishment_id}`)
          : undefined;
      const commission = normalizeEstablishmentCommission(
        matched ?? { commission_available: false }
      );

      return {
        key,
        establishment_id: row.establishment_id,
        establishment_name: row.establishment_name,
        category: row.category,
        activity_ids: row.activity_ids,
        visit_dates: row.visit_dates.sort(),
        commission,
        field_requirements: getStayClosingFieldRequirements(commission),
      };
    })
    .sort((a, b) =>
      a.establishment_name.localeCompare(b.establishment_name, undefined, {
        sensitivity: "base",
      })
    );
}

export function buildEstablishmentLookup(
  establishments: Establishment[]
): Map<string, Establishment> {
  const map = new Map<string, Establishment>();
  for (const est of establishments) {
    map.set(`id-${est.id}`, est);
    map.set(normalizeName(est.name), est);
    map.set(`${normalizeName(est.name)}::${est.category}`, est);
  }
  return map;
}
