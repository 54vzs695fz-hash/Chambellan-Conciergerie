import type { DaySection, TripDay, TripWithDays } from "../types";

export const DEFAULT_DAY_SECTIONS: DaySection[] = [
  { id: "afternoon", label: "Afternoon", sort_order: 0 },
  { id: "evening", label: "Evening / Night", sort_order: 1 },
];

export function eachDayBetween(start: string, end: string): string[] {
  const dates: string[] = [];
  const cur = new Date(start + "T12:00:00");
  const last = new Date(end + "T12:00:00");
  if (last < cur) return dates;
  while (cur <= last) {
    dates.push(cur.toISOString().split("T")[0]);
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

export function datesMatchRange(
  days: TripDay[],
  arrival: string,
  departure: string
): boolean {
  const wanted = eachDayBetween(arrival, departure);
  if (days.length !== wanted.length) return false;
  return wanted.every((date, index) => days[index]?.date === date);
}

export function syncTripDaysInState(trip: TripWithDays): TripWithDays {
  if (!trip.arrival_date || !trip.departure_date) {
    return trip.days.length === 0 ? trip : { ...trip, days: [] };
  }

  const wanted = eachDayBetween(trip.arrival_date, trip.departure_date);
  if (wanted.length === 0) {
    return trip.days.length === 0 ? trip : { ...trip, days: [] };
  }

  if (datesMatchRange(trip.days, trip.arrival_date, trip.departure_date)) {
    return trip;
  }

  const existingByDate = new Map(trip.days.map((day) => [day.date, day]));
  const days: TripDay[] = wanted.map((date, index) => {
    const existing = existingByDate.get(date);
    if (existing) return existing;
    return {
      id: -(index + 1),
      trip_id: trip.id,
      date,
      sections: DEFAULT_DAY_SECTIONS.map((section) => ({ ...section })),
      activities: [],
    };
  });

  return { ...trip, days };
}

export function serializeDefaultDaySections(): string {
  return JSON.stringify(DEFAULT_DAY_SECTIONS);
}
