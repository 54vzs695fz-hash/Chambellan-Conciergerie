import {
  buildReservationStatusItems,
  isBookingProgressComplete,
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
  href: string;
}

export function isClientProgrammeConfirmed(
  trip: Pick<TripWithDays, "follow_up_status">
): boolean {
  return trip.follow_up_status === "confirmed";
}

export function hasOpenReservationBookings(
  items: ReservationStatusItem[]
): boolean {
  if (items.length === 0) return false;
  return items.some((item) => !isBookingProgressComplete(item.booking_status));
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
    href: `/planner/${trip.id}`,
  };
}

export function listBookingProgressPlanners(
  trips: TripWithDays[]
): BookingProgressPlanner[] {
  return trips
    .filter(qualifiesForBookingProgress)
    .map(buildBookingProgressPlanner)
    .sort((a, b) => {
      const dateCmp = a.arrival_date.localeCompare(b.arrival_date);
      if (dateCmp !== 0) return dateCmp;
      return a.destination.localeCompare(b.destination);
    });
}
