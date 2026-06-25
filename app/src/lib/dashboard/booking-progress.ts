import {
  buildReservationStatusItems,
  computePlannerBookingSummary,
  isBookingRequiringAction,
  sortBookingProgressItems,
  type PlannerBookingSummary,
  type ReservationStatusItem,
} from "@/lib/reservations/reservation-status";
import { normalizeTripPaymentStatus } from "@/lib/planner/payment-status";
import { paymentRemainingBadgeLabel } from "@/lib/planner/payment-summary";
import { formatDateRange, isUntitledDestination } from "@/lib/planner-utils";
import type { TripPaymentStatus, TripWithDays } from "@/lib/types";

export interface BookingProgressPlanner {
  tripId: number;
  client_name: string;
  destination: string;
  dates: string;
  arrival_date: string;
  payment_status: TripPaymentStatus;
  payment_detail: string | null;
  items: ReservationStatusItem[];
  summary: PlannerBookingSummary;
  href: string;
}

export type { PlannerBookingSummary };

export function isClientProgrammeConfirmed(
  trip: Pick<TripWithDays, "follow_up_status">
): boolean {
  return trip.follow_up_status === "confirmed";
}

export function hasOpenReservationBookings(
  items: ReservationStatusItem[]
): boolean {
  if (items.length === 0) return false;
  return items.some((item) => isBookingRequiringAction(item.booking_status));
}

export function reconcileBookingProgressPlanner(
  planner: Omit<BookingProgressPlanner, "items" | "summary"> & {
    items: ReservationStatusItem[];
  }
): BookingProgressPlanner | null {
  const items = sortBookingProgressItems(planner.items);
  if (!hasOpenReservationBookings(items)) return null;

  return {
    ...planner,
    items,
    summary: computePlannerBookingSummary(items),
  };
}

export function qualifiesForBookingProgress(trip: TripWithDays): boolean {
  if (isUntitledDestination(trip.destination)) return false;
  if (!isClientProgrammeConfirmed(trip)) return false;
  const items = buildReservationStatusItems(trip.days);
  return hasOpenReservationBookings(items);
}

export function buildBookingProgressPlanner(
  trip: TripWithDays
): BookingProgressPlanner {
  const paymentStatus = normalizeTripPaymentStatus(trip.payment_status);
  const items = buildReservationStatusItems(trip.days);

  return {
    tripId: trip.id,
    client_name: trip.client_name.trim() || "Client",
    destination: trip.destination.trim() || "Untitled",
    dates: formatDateRange(trip.arrival_date, trip.departure_date),
    arrival_date: trip.arrival_date,
    payment_status: paymentStatus,
    payment_detail: paymentRemainingBadgeLabel(trip),
    items,
    summary: computePlannerBookingSummary(items),
    href: `/planner/${trip.id}`,
  };
}

export function countBookingsRequiringAction(
  planners: BookingProgressPlanner[]
): number {
  return planners.reduce((sum, planner) => sum + planner.summary.remaining, 0);
}

const PLANNER_PRIORITY_ORDER = { high: 0, medium: 1 } as const;

export function sortBookingProgressPlanners(
  planners: BookingProgressPlanner[]
): BookingProgressPlanner[] {
  return [...planners].sort((a, b) => {
    const priorityCmp =
      PLANNER_PRIORITY_ORDER[a.summary.priority] -
      PLANNER_PRIORITY_ORDER[b.summary.priority];
    if (priorityCmp !== 0) return priorityCmp;
    const dateCmp = a.arrival_date.localeCompare(b.arrival_date);
    if (dateCmp !== 0) return dateCmp;
    return a.destination.localeCompare(b.destination);
  });
}

export function listBookingProgressPlanners(
  trips: TripWithDays[]
): BookingProgressPlanner[] {
  return sortBookingProgressPlanners(
    trips.filter(qualifiesForBookingProgress).map(buildBookingProgressPlanner)
  );
}
