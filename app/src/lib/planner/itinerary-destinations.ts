import { citiesMatch, normalizeCity } from "@/lib/establishments/group-by-city";
import { normalizeDestination } from "@/lib/establishments/destinations";
import type { Activity, ActivityType, TripDay, TripWithDays } from "@/lib/types";
import {
  resolvePlannerDestinationHeader,
  type PlannerDestinationHeader,
} from "@/lib/planner/trip-destinations";

export type EstablishmentCityLookup = (
  title: string,
  activityType: ActivityType
) => string | null;

const COTE_AZUR_DESTINATIONS = new Set([
  "Monaco",
  "Saint-Tropez",
  "Cannes",
  "Nice",
  "Antibes",
  "Mougins",
  "Villefranche-sur-Mer",
]);

export function formatDestinationForDisplay(city: string): string {
  const trimmed = city.trim();
  if (!trimmed) return "";
  const normalized = normalizeDestination(trimmed);
  if (normalized === "Saint-Tropez") return "Saint Tropez";
  if (normalized === "Other") return trimmed;
  return normalized;
}

export function isMeaningfulActivity(activity: Activity): boolean {
  return Boolean(
    activity.time?.trim() ||
      activity.title?.trim() ||
      activity.details?.trim()
  );
}

export function resolveActivityCity(
  activity: Activity,
  lookup?: EstablishmentCityLookup
): string | null {
  if (!isMeaningfulActivity(activity)) return null;

  const stored = activity.establishment_city?.trim();
  if (stored) return formatDestinationForDisplay(stored);

  const title = activity.title?.trim();
  if (lookup && title) {
    const resolved = lookup(title, activity.activity_type)?.trim();
    if (resolved) return formatDestinationForDisplay(resolved);
  }

  return null;
}

export function resolveDayDestinationFromActivities(
  day: TripDay,
  lookup?: EstablishmentCityLookup
): string | null {
  const cities = new Set<string>();

  for (const activity of day.activities) {
    const city = resolveActivityCity(activity, lookup);
    if (city) cities.add(city);
  }

  if (cities.size === 1) return [...cities][0];
  return null;
}

export function resolveDayEffectiveDestination(
  day: TripDay,
  lookup?: EstablishmentCityLookup
): string | null {
  const override = day.destination_override?.trim();
  if (override) return formatDestinationForDisplay(override);
  return resolveDayDestinationFromActivities(day, lookup);
}

export interface DayDestinationLabel {
  dayId: number;
  destination: string;
  showLabel: boolean;
}

export function buildDayDestinationLabels(
  days: TripDay[],
  lookup?: EstablishmentCityLookup
): DayDestinationLabel[] {
  const sortedDays = [...days].sort((a, b) => a.date.localeCompare(b.date));
  const effective = sortedDays.map((day) => ({
    dayId: day.id,
    destination: resolveDayEffectiveDestination(day, lookup),
  }));

  const uniqueDestinations = [
    ...new Set(
      effective
        .map((entry) => entry.destination)
        .filter((value): value is string => Boolean(value))
    ),
  ];

  if (uniqueDestinations.length <= 1) {
    return effective.map((entry) => ({
      dayId: entry.dayId,
      destination: entry.destination ?? "",
      showLabel: false,
    }));
  }

  let previous: string | null = null;
  return effective.map(({ dayId, destination }) => {
    if (!destination) {
      return { dayId, destination: "", showLabel: false };
    }

    const showLabel =
      previous === null || !citiesMatch(previous, destination);
    previous = destination;
    return { dayId, destination, showLabel };
  });
}

export function detectItineraryDestinations(
  days: TripDay[],
  lookup?: EstablishmentCityLookup
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  const sortedDays = [...days].sort((a, b) => a.date.localeCompare(b.date));

  for (const day of sortedDays) {
    const destination = resolveDayEffectiveDestination(day, lookup);
    if (!destination) continue;
    const key = normalizeCity(destination);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(destination);
  }

  return result;
}

export function inferDestinationRegion(destinations: string[]): string {
  if (destinations.length < 2) return "";

  const canonical = destinations.map((destination) =>
    normalizeDestination(destination)
  );

  if (canonical.every((destination) => COTE_AZUR_DESTINATIONS.has(destination))) {
    return "Côte d'Azur";
  }

  return "";
}

/**
 * Manual per-day labels only when multi-destination is on.
 * No establishment-based city markers.
 */
export function dayDestinationLabelMap(
  trip: Pick<TripWithDays, "days" | "multi_destination">
): Map<number, string> {
  if (!trip.multi_destination) return new Map();

  const map = new Map<number, string>();
  for (const day of trip.days) {
    const override = day.destination_override?.trim();
    if (override) {
      map.set(day.id, formatDestinationForDisplay(override));
    }
  }
  return map;
}

export function buildEstablishmentCityLookup(
  rows: Array<{ name: string; city: string; category?: string }>
): EstablishmentCityLookup {
  const byNameAndCategory = new Map<string, string>();
  const byName = new Map<string, string>();

  for (const row of rows) {
    const nameKey = row.name.trim().toLowerCase();
    const city = row.city.trim();
    if (!nameKey || !city) continue;
    byName.set(nameKey, city);
    if (row.category) {
      byNameAndCategory.set(`${nameKey}|${row.category}`, city);
    }
  }

  return (title, activityType) => {
    const nameKey = title.trim().toLowerCase();
    if (!nameKey) return null;
    const category = activityType;
    return (
      byNameAndCategory.get(`${nameKey}|${category}`) ??
      byName.get(nameKey) ??
      null
    );
  };
}

/** PDF header — manual planner destination only. */
export function resolveAutoPlannerDestinationHeader(
  trip: TripWithDays,
  _lookup?: EstablishmentCityLookup
): PlannerDestinationHeader {
  return resolvePlannerDestinationHeader(trip);
}
