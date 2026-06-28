import type { Trip } from "@/lib/types";

export const DESTINATION_SEPARATOR = " · ";

/** Safe single-line length for two destinations in the PDF main title. */
const TWO_DEST_JOIN_MAX_LEN = 42;

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

export function normalizeTripDestinations(
  trip: Partial<TripDestinationFields>
): TripDestinationFields {
  const region = String(trip.destination_region ?? "").trim();
  let destinations = Array.isArray(trip.destinations)
    ? trip.destinations.map((item) => String(item).trim()).filter(Boolean)
    : parseDestinationsJson(trip.destinations);

  if (destinations.length === 0) {
    const single = String(trip.destination ?? "").trim();
    if (single) destinations = [single];
  }

  const destination =
    formatDestinationsJoin(destinations) ||
    String(trip.destination ?? "").trim();

  let multi_destination = Boolean(trip.multi_destination);
  if (destinations.length <= 1 && !region) {
    multi_destination = false;
  }

  return {
    multi_destination: multi_destination && destinations.length > 0,
    destinations,
    destination,
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

export function resolvePlannerDestinationHeader(
  trip: Partial<TripDestinationFields>
): PlannerDestinationHeader {
  const normalized = normalizeTripDestinations(trip);
  const { destinations, destination_region, multi_destination } = normalized;

  if (destinations.length === 0) {
    return { mainTitle: "", subtitle: null };
  }

  if (!multi_destination || destinations.length === 1) {
    return { mainTitle: destinations[0], subtitle: null };
  }

  const region = destination_region.trim();
  const joined = formatDestinationsJoin(destinations);

  if (region) {
    return { mainTitle: region, subtitle: joined };
  }

  if (destinations.length === 2 && joined.length <= TWO_DEST_JOIN_MAX_LEN) {
    return { mainTitle: joined, subtitle: null };
  }

  if (destinations.length === 2) {
    return {
      mainTitle: destinations[0],
      subtitle: destinations[1],
    };
  }

  return {
    mainTitle: destinations[0],
    subtitle: formatDestinationsJoin(destinations.slice(1)),
  };
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
  const { destinations, destination_region, multi_destination, destination } =
    normalized;

  if (!multi_destination || destinations.length <= 1) {
    return {
      primary: destination.trim() || fallback,
      secondary: null,
    };
  }

  const region = destination_region.trim();
  const joined = formatDestinationsJoin(destinations);

  if (region) {
    return { primary: region, secondary: joined };
  }

  if (destinations.length === 2) {
    return { primary: joined, secondary: null };
  }

  return {
    primary: destinations[0],
    secondary: formatDestinationsJoin(destinations.slice(1)),
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
  return normalized.destinations[0] ?? normalized.destination;
}
