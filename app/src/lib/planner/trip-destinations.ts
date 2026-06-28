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

/** PDF and document headers — manual planner destination only. */
export function resolvePlannerDestinationHeader(
  trip: Partial<TripDestinationFields>
): PlannerDestinationHeader {
  const normalized = normalizeTripDestinations(trip);
  const manual = normalized.destination.trim();
  if (!manual) return { mainTitle: "", subtitle: null };
  return { mainTitle: manual, subtitle: null };
}

export interface DashboardDestinationDisplay {
  primary: string;
  secondary: string | null;
}

export function resolveDashboardDestinationDisplay(
  trip: Partial<TripDestinationFields>,
  fallback = "Untitled destination"
): DashboardDestinationDisplay {
  const normalized = normalizeTripDestinations(trip);
  const manual = normalized.destination.trim() || fallback;

  if (!normalized.multi_destination || normalized.destinations.length === 0) {
    return { primary: manual, secondary: null };
  }

  const joined = formatDestinationsJoin(normalized.destinations);
  return {
    primary: manual,
    secondary: joined && joined !== manual ? joined : null,
  };
}

export function tripDestinationFilterValues(
  trip: Partial<TripDestinationFields>
): string[] {
  const normalized = normalizeTripDestinations(trip);
  const values = new Set<string>();

  if (normalized.destination) values.add(normalized.destination);
  normalized.destinations.forEach((place) => values.add(place));
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
  return normalized.destination.trim() || normalized.destinations[0] || "";
}
