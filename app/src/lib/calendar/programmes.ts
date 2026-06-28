import { formatClientGuestCount } from "@/lib/planner/planner-sheet-model";
import { normalizeTripPaymentStatus } from "@/lib/planner/payment-status";
import { needsPaymentWarning } from "@/lib/planner/payment-status";
import { paymentRemainingBadgeLabel } from "@/lib/planner/payment-summary";
import {
  resolveDashboardDestinationDisplay,
  tripDestinationFilterValues,
} from "@/lib/planner/trip-destinations";
import type { Trip, TripFollowUpStatus, TripPaymentStatus, TripWithDays } from "@/lib/types";

export type CalendarView = "agenda" | "month" | "list";

export interface CalendarProgramme {
  id: number;
  clientName: string;
  destination: string;
  destinationSubtitle: string | null;
  destinationPlaces: string[];
  arrivalDate: string;
  departureDate: string;
  guestCount: string | null;
  followUpStatus: TripFollowUpStatus;
  paymentStatus: TripPaymentStatus;
  paymentDetail: string | null;
  plannerHref: string;
}

export interface CalendarFilters {
  destination: string;
  client: string;
  status: string;
  paymentStatus: string;
  upcomingOnly: boolean;
  thisWeek: boolean;
  thisMonth: boolean;
  arrivalWithin7Days: boolean;
  pendingPaymentOnly: boolean;
  urgentFollowUpOnly: boolean;
}

export const DEFAULT_CALENDAR_FILTERS: CalendarFilters = {
  destination: "",
  client: "",
  status: "",
  paymentStatus: "",
  upcomingOnly: false,
  thisWeek: false,
  thisMonth: false,
  arrivalWithin7Days: false,
  pendingPaymentOnly: false,
  urgentFollowUpOnly: false,
};

export { FOLLOW_UP_STATUS_LABELS } from "@/lib/calendar/status-styles";

function parseIsoDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const d = new Date(`${dateStr}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0);
}

export function addDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return startOfDay(next);
}

export function startOfWeekMonday(d: Date): Date {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(d, diff);
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 12, 0, 0);
}

export function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 12, 0, 0);
}

export function daysBetweenInclusive(start: string, end: string): string[] {
  const s = parseIsoDate(start);
  const e = parseIsoDate(end);
  if (!s || !e) return [];
  const out: string[] = [];
  let cur = startOfDay(s);
  const last = startOfDay(e);
  while (cur <= last) {
    out.push(toIsoDate(cur));
    cur = addDays(cur, 1);
  }
  return out;
}

export function tripToCalendarProgramme(
  trip: Trip | TripWithDays
): CalendarProgramme | null {
  if (!trip.arrival_date || !trip.departure_date) return null;
  const arrival = parseIsoDate(trip.arrival_date);
  const departure = parseIsoDate(trip.departure_date);
  if (!arrival || !departure) return null;

  const destinationDisplay = resolveDashboardDestinationDisplay(trip);

  return {
    id: trip.id,
    clientName: trip.client_name.trim() || "Client",
    destination: destinationDisplay.primary,
    destinationSubtitle: destinationDisplay.secondary,
    destinationPlaces: tripDestinationFilterValues(trip),
    arrivalDate: trip.arrival_date,
    departureDate: trip.departure_date,
    guestCount: formatClientGuestCount(trip.tailored_for),
    followUpStatus: trip.follow_up_status ?? "follow_up",
    paymentStatus: normalizeTripPaymentStatus(trip.payment_status),
    paymentDetail: paymentRemainingBadgeLabel(trip),
    plannerHref: `/planner/${trip.id}`,
  };
}

export function tripsToCalendarProgrammes(trips: Trip[]): CalendarProgramme[] {
  return trips
    .map(tripToCalendarProgramme)
    .filter((p): p is CalendarProgramme => p !== null);
}

export function programmeActiveOnDate(
  programme: CalendarProgramme,
  isoDate: string
): boolean {
  return isoDate >= programme.arrivalDate && isoDate <= programme.departureDate;
}

export function daysUntilArrival(
  arrivalDate: string,
  today = startOfDay(new Date())
): number | null {
  const arrival = parseIsoDate(arrivalDate);
  if (!arrival) return null;
  const diff = startOfDay(arrival).getTime() - today.getTime();
  return Math.round(diff / (24 * 60 * 60 * 1000));
}

export function isUpcomingProgramme(
  programme: CalendarProgramme,
  today = startOfDay(new Date())
): boolean {
  if (!programme.departureDate) return false;
  return programme.departureDate >= toIsoDate(today);
}

export function isThisWeek(
  programme: CalendarProgramme,
  today = startOfDay(new Date())
): boolean {
  const weekStart = toIsoDate(startOfWeekMonday(today));
  const weekEnd = toIsoDate(addDays(startOfWeekMonday(today), 6));
  if (!programme.arrivalDate || !programme.departureDate) return false;
  return programme.departureDate >= weekStart && programme.arrivalDate <= weekEnd;
}

export function isThisMonth(
  programme: CalendarProgramme,
  today = startOfDay(new Date())
): boolean {
  const monthStart = toIsoDate(startOfMonth(today));
  const monthEnd = toIsoDate(endOfMonth(today));
  if (!programme.arrivalDate || !programme.departureDate) return false;
  return programme.departureDate >= monthStart && programme.arrivalDate <= monthEnd;
}

export function filterProgrammes(
  programmes: CalendarProgramme[],
  filters: CalendarFilters,
  today = startOfDay(new Date())
): CalendarProgramme[] {
  return programmes.filter((p) => {
    if (filters.destination) {
      const matchesDestination =
        p.destination === filters.destination ||
        p.destinationSubtitle === filters.destination ||
        p.destinationPlaces.includes(filters.destination);
      if (!matchesDestination) return false;
    }
    if (
      filters.client &&
      !p.clientName.toLowerCase().includes(filters.client.toLowerCase())
    ) {
      return false;
    }
    if (filters.status && p.followUpStatus !== filters.status) return false;
    if (filters.paymentStatus && p.paymentStatus !== filters.paymentStatus) {
      return false;
    }
    if (filters.upcomingOnly && !isUpcomingProgramme(p, today)) return false;
    if (filters.thisWeek && !isThisWeek(p, today)) return false;
    if (filters.thisMonth && !isThisMonth(p, today)) return false;
    if (filters.arrivalWithin7Days) {
      const days = daysUntilArrival(p.arrivalDate, today);
      if (days === null || days < 0 || days > 7) return false;
    }
    if (filters.pendingPaymentOnly && p.paymentStatus !== "pending") {
      return false;
    }
    if (filters.urgentFollowUpOnly) {
      const days = daysUntilArrival(p.arrivalDate, today);
      const urgent =
        p.followUpStatus === "follow_up" &&
        isUpcomingProgramme(p, today) &&
        days !== null &&
        days >= 0 &&
        days <= 7;
      const paymentUrgent = needsPaymentWarning(p.arrivalDate, p.paymentStatus, today);
      if (!urgent && !paymentUrgent) return false;
    }
    return true;
  });
}

export function uniqueDestinations(programmes: CalendarProgramme[]): string[] {
  const values = new Set<string>();
  for (const programme of programmes) {
    values.add(programme.destination);
    programme.destinationPlaces.forEach((place) => values.add(place));
  }
  return [...values].sort((a, b) => a.localeCompare(b));
}

export function uniqueClients(programmes: CalendarProgramme[]): string[] {
  return [...new Set(programmes.map((p) => p.clientName))].sort((a, b) =>
    a.localeCompare(b)
  );
}

export function buildMonthGrid(reference: Date): Date[][] {
  const first = startOfMonth(reference);
  const gridStart = startOfWeekMonday(first);
  const weeks: Date[][] = [];
  let cursor = gridStart;
  for (let w = 0; w < 6; w++) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(cursor);
      cursor = addDays(cursor, 1);
    }
    weeks.push(week);
    if (w >= 4 && cursor > endOfMonth(reference)) break;
  }
  return weeks;
}

export function buildWeekDays(reference: Date): Date[] {
  const start = startOfWeekMonday(reference);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function programmeSpanInWeek(
  programme: CalendarProgramme,
  weekDays: Date[]
): { startCol: number; span: number } | null {
  const weekStart = toIsoDate(weekDays[0]);
  const weekEnd = toIsoDate(weekDays[6]);
  if (programme.departureDate < weekStart || programme.arrivalDate > weekEnd) {
    return null;
  }
  const visibleStart =
    programme.arrivalDate > weekStart ? programme.arrivalDate : weekStart;
  const visibleEnd =
    programme.departureDate < weekEnd ? programme.departureDate : weekEnd;
  const startCol = weekDays.findIndex((d) => toIsoDate(d) === visibleStart);
  const endCol = weekDays.findIndex((d) => toIsoDate(d) === visibleEnd);
  if (startCol < 0 || endCol < 0) return null;
  return { startCol, span: endCol - startCol + 1 };
}

export function programmesArrivingWithinDays(
  programmes: CalendarProgramme[],
  days: number,
  today = startOfDay(new Date())
): CalendarProgramme[] {
  return programmes
    .filter((p) => {
      const until = daysUntilArrival(p.arrivalDate, today);
      return until !== null && until >= 0 && until <= days;
    })
    .sort(
      (a, b) =>
        parseIsoDate(a.arrivalDate)!.getTime() -
        parseIsoDate(b.arrivalDate)!.getTime()
    );
}

export function countProgrammesThisWeek(
  programmes: CalendarProgramme[],
  today = startOfDay(new Date())
): number {
  return programmes.filter((p) => isThisWeek(p, today)).length;
}

export function countProgrammesThisMonth(
  programmes: CalendarProgramme[],
  today = startOfDay(new Date())
): number {
  return programmes.filter((p) => isThisMonth(p, today)).length;
}

export function countClientsToFollowUp(
  programmes: CalendarProgramme[],
  today = startOfDay(new Date())
): number {
  return programmes.filter(
    (p) =>
      p.followUpStatus === "follow_up" &&
      isUpcomingProgramme(p, today) &&
      (daysUntilArrival(p.arrivalDate, today) ?? 99) <= 7
  ).length;
}

export function formatMonthYear(d: Date): string {
  return d.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

export function formatWeekRange(weekDays: Date[]): string {
  const start = weekDays[0];
  const end = weekDays[6];
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  if (start.getMonth() === end.getMonth()) {
    return `${start.getDate()} – ${end.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })}`;
  }
  return `${start.toLocaleDateString("en-GB", opts)} – ${end.toLocaleDateString("en-GB", { ...opts, year: "numeric" })}`;
}

export function formatDayShort(d: Date): string {
  return d.toLocaleDateString("en-GB", { weekday: "short" });
}

export function formatDayNum(d: Date): string {
  return String(d.getDate());
}

export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export function isToday(d: Date, today = startOfDay(new Date())): boolean {
  return toIsoDate(d) === toIsoDate(today);
}

export function programmeSegmentClass(
  programme: CalendarProgramme,
  isoDate: string
): string {
  if (isoDate === programme.arrivalDate && isoDate === programme.departureDate) {
    return "cal-event--single";
  }
  if (isoDate === programme.arrivalDate) return "cal-event--start";
  if (isoDate === programme.departureDate) return "cal-event--end";
  return "cal-event--middle";
}
