import { citiesMatch, normalizeCity } from "@/lib/establishments/group-by-city";
import { normalizeDestination } from "@/lib/establishments/destinations";
import type { Activity, ActivityType, TripDay, TripWithDays } from "@/lib/types";
import {
  formatDestinationsJoin,
  normalizeTripDestinations,
  type PlannerDestinationHeader,
  type TripDestinationFields,
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

export function syncTripDestinationsFromItinerary(
  trip: Pick<TripWithDays, "days" | "destination" | "destination_region"> &
    Partial<TripDestinationFields>,
  lookup?: EstablishmentCityLookup
): TripDestinationFields {
  const detected = detectItineraryDestinations(trip.days, lookup);

  if (detected.length === 0) {
    return normalizeTripDestinations(trip);
  }

  if (detected.length === 1) {
    return {
      multi_destination: false,
      destinations: detected,
      destination: detected[0],
      destination_region: "",
    };
  }

  const region =
    inferDestinationRegion(detected) ||
    String(trip.destination_region ?? "").trim();

  return {
    multi_destination: true,
    destinations: detected,
    destination: formatDestinationsJoin(detected),
    destination_region: region,
  };
}

export function applyItineraryDestinationSync(
  trip: TripWithDays,
  lookup?: EstablishmentCityLookup
): TripWithDays {
  return {
    ...trip,
    ...syncTripDestinationsFromItinerary(trip, lookup),
  };
}

export function resolveAutoPlannerDestinationHeader(
  trip: TripWithDays,
  lookup?: EstablishmentCityLookup
): PlannerDestinationHeader {
  const detected = detectItineraryDestinations(trip.days, lookup);

  if (detected.length === 0) {
    const manual = normalizeTripDestinations(trip);
    if (!manual.destination.trim()) {
      return { mainTitle: "", subtitle: null };
    }
    if (!manual.multi_destination || manual.destinations.length <= 1) {
      return { mainTitle: manual.destination.trim(), subtitle: null };
    }
    const region = manual.destination_region.trim();
    const joined = formatDestinationsJoin(manual.destinations);
    return region
      ? { mainTitle: region, subtitle: joined }
      : { mainTitle: joined, subtitle: null };
  }

  if (detected.length === 1) {
    const fallback = trip.destination?.trim();
    return {
      mainTitle: fallback || detected[0],
      subtitle: null,
    };
  }

  const region = inferDestinationRegion(detected);
  const joined = formatDestinationsJoin(detected);

  if (region) {
    return { mainTitle: region, subtitle: joined };
  }

  return { mainTitle: joined, subtitle: null };
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

export function dayDestinationLabelMap(
  days: TripDay[],
  lookup?: EstablishmentCityLookup
): Map<number, string> {
  const labels = buildDayDestinationLabels(days, lookup);
  const map = new Map<number, string>();
  for (const label of labels) {
    if (label.showLabel && label.destination) {
      map.set(label.dayId, label.destination);
    }
  }
  return map;
}
