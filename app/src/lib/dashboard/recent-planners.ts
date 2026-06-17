import { startOfDay, toIsoDate } from "@/lib/calendar/programmes";
import { isUntitledDestination } from "@/lib/planner-utils";
import type { Trip } from "@/lib/types";

export type RecentPlannerPhase = "in_stay" | "upcoming" | "past";

export interface GroupedRecentPlanners {
  inStay: Trip[];
  upcoming: Trip[];
  past: Trip[];
}

function compareIsoAsc(a: string, b: string): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return a.localeCompare(b);
}

function compareIsoDesc(a: string, b: string): number {
  return compareIsoAsc(b, a);
}

export function classifyRecentPlannerPhase(
  trip: Pick<Trip, "arrival_date" | "departure_date">,
  todayStr: string
): RecentPlannerPhase | null {
  const { arrival_date, departure_date } = trip;

  if (
    arrival_date &&
    departure_date &&
    arrival_date <= todayStr &&
    departure_date >= todayStr
  ) {
    return "in_stay";
  }

  if (departure_date && departure_date < todayStr) {
    return "past";
  }

  if (arrival_date && arrival_date > todayStr) {
    return "upcoming";
  }

  return null;
}

export function groupRecentPlanners(
  trips: Trip[],
  today = startOfDay(new Date())
): GroupedRecentPlanners {
  const todayStr = toIsoDate(today);
  const inStay: Trip[] = [];
  const upcoming: Trip[] = [];
  const past: Trip[] = [];

  for (const trip of trips) {
    if (isUntitledDestination(trip.destination)) continue;
    const phase = classifyRecentPlannerPhase(trip, todayStr);
    if (phase === "in_stay") inStay.push(trip);
    else if (phase === "upcoming") upcoming.push(trip);
    else if (phase === "past") past.push(trip);
  }

  inStay.sort((a, b) =>
    compareIsoAsc(a.arrival_date, b.arrival_date) ||
    compareIsoAsc(a.departure_date, b.departure_date)
  );

  upcoming.sort((a, b) =>
    compareIsoAsc(a.arrival_date, b.arrival_date) ||
    compareIsoAsc(a.departure_date, b.departure_date)
  );

  past.sort((a, b) =>
    compareIsoDesc(a.departure_date, b.departure_date) ||
    compareIsoDesc(a.arrival_date, b.arrival_date)
  );

  return { inStay, upcoming, past };
}

export function hasRecentPlanners(groups: GroupedRecentPlanners): boolean {
  return (
    groups.inStay.length > 0 ||
    groups.upcoming.length > 0 ||
    groups.past.length > 0
  );
}
