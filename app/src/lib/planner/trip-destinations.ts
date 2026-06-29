import type { Trip } from "@/lib/types";

export const DESTINATION_SEPARATOR = " · ";

export type TripDestinationFields = Pick<
  Trip,
  "multi_destination" | "destinations" | "destination" | "destination_region"
>;

export function parseDestinationsJson(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function formatDestinationsJoin(destinations: string[]): string {
  return destinations
    .map((item) => item.trim())
    .filter(Boolean)
    .join(DESTINATION_SEPARATOR);
}

/** Manual `destination` is always authoritative; auto-detection never overwrites it. */
export function normalizeTripDestinations(
  trip: Partial<TripDestinationFields>
): TripDestinationFields {
  const manualDestination = String(trip.destination ?? "").trim();
  const multi_destination = Boolean(trip.multi_destination);
  const region = String(trip.destination_region ?? "").trim();

  let destinations = Array.isArray(trip.destinations)
    ? trip.destinations.map((item) => String(item).trim()).filter(Boolean)
    : parseDestinationsJson(trip.destinations);

  if (!multi_destination) {
    return {
      multi_destination: false,
      destination: manualDestination,
      destinations: manualDestination ? [manualDestination] : [],
      destination_region: "",
    };
  }

  return {
    multi_destination: true,
    destination: manualDestination,
    destinations,
    destination_region: region,
  };
}

export function syncTripDestinationFields(
  trip: Partial<TripDestinationFields>,
  patch: Partial<TripDestinationFields> = {}
): TripDestinationFields {
  return normalizeTripDestinations({ ...trip, ...patch });
}

export interface PlannerDestinationHeader {
  mainTitle: string;
  subtitle: string | null;
}

/** Planner / PDF / list title from manual fields only. */
export function resolvePlannerDisplayTitle(
  trip: Partial<TripDestinationFields>
): string {
  const normalized = normalizeTripDestinations(trip);

  if (!normalized.multi_destination) {
    return normalized.destination.trim();
  }

  const joined = formatDestinationsJoin(normalized.destinations);
  return joined || normalized.destination.trim();
}

/** PDF and document headers — manual fields only. */
export function resolvePlannerDestinationHeader(
  trip: Partial<TripDestinationFields>
): PlannerDestinationHeader {
  const mainTitle = resolvePlannerDisplayTitle(trip);
  if (!mainTitle) return { mainTitle: "", subtitle: null };
  return { mainTitle, subtitle: null };
}

export interface DashboardDestinationDisplay {
  primary: string;
  secondary: string | null;
}

export function resolveDashboardDestinationDisplay(
  trip: Partial<TripDestinationFields>,
  fallback = "Untitled destination"
): DashboardDestinationDisplay {
  const title = resolvePlannerDisplayTitle(trip).trim() || fallback;
  return { primary: title, secondary: null };
}

export function tripDestinationFilterValues(
  trip: Partial<TripDestinationFields>
): string[] {
  const normalized = normalizeTripDestinations(trip);
  const values = new Set<string>();

  const title = resolvePlannerDisplayTitle(trip);
  if (title) values.add(title);
  normalized.destinations.forEach((place) => values.add(place));
  if (normalized.destination) values.add(normalized.destination);
  if (normalized.destination_region) {
    values.add(normalized.destination_region);
  }

  return [...values];
}

/** First destination for library autocomplete prioritization. */
export function resolveLibraryDestinationPrioritize(
  trip: Partial<TripDestinationFields>
): string {
  const normalized = normalizeTripDestinations(trip);
  if (normalized.multi_destination && normalized.destinations.length > 0) {
    return normalized.destinations[0];
  }
  return normalized.destination.trim() || normalized.destinations[0] || "";
}
