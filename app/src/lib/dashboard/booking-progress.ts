import {
  buildReservationStatusItems,
  computePlannerBookingSummary,
  isBookingRequiringAction,
  sortBookingProgressItems,
  type PlannerBookingSummary,
  type ReservationStatusItem,
} from "@/lib/reservations/reservation-status";
import { resolveDashboardDestinationDisplay } from "@/lib/planner/trip-destinations";
import { normalizeTripPaymentStatus } from "@/lib/planner/payment-status";
import { paymentRemainingBadgeLabel } from "@/lib/planner/payment-summary";
import { formatDateRange, isUntitledDestination } from "@/lib/planner-utils";
import type { TripPaymentStatus, TripWithDays } from "@/lib/types";

export interface BookingProgressClientFile {
  client_id: number | null;
  profile_href: string | null;
  email: string;
  phone: string;
  nationality: string | null;
  notes: string | null;
}

export interface BookingProgressPlanner {
  tripId: number;
  client_name: string;
  destination: string;
  destination_subtitle: string | null;
  dates: string;
  arrival_date: string;
  guest_count: string | null;
  client_file: BookingProgressClientFile;
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

export function formatBookingProgressGuestLabel(
  tailoredFor: string | null | undefined
): string | null {
  const trimmed = String(tailoredFor ?? "").trim();
  if (!trimmed) return null;
  if (/^\d+$/.test(trimmed)) {
    return `${trimmed} guest${trimmed === "1" ? "" : "s"}`;
  }
  return trimmed;
}

function buildBookingProgressClientFile(
  trip: TripWithDays
): BookingProgressClientFile {
  const client = trip.client ?? null;
  const email = String(client?.email ?? "").trim();
  const phone = String(client?.phone ?? "").trim();
  const whatsapp = String(client?.whatsapp ?? "").trim();
  const phoneDisplay = phone || whatsapp;
  const nationality = String(client?.nationality ?? "").trim() || null;
  const notes = String(client?.notes ?? "").trim() || null;

  return {
    client_id: trip.client_id,
    profile_href: trip.client_id ? `/clients/${trip.client_id}` : null,
    email: email || "Missing email",
    phone: phoneDisplay || "Missing phone",
    nationality,
    notes,
  };
}

export function buildBookingProgressPlanner(
  trip: TripWithDays
): BookingProgressPlanner {
  const paymentStatus = normalizeTripPaymentStatus(trip.payment_status);
  const items = buildReservationStatusItems(trip.days);
  const destinationDisplay = resolveDashboardDestinationDisplay(trip, "Untitled");

  return {
    tripId: trip.id,
    client_name: trip.client_name.trim() || "Client",
    destination: destinationDisplay.primary,
    destination_subtitle: destinationDisplay.secondary,
    dates: formatDateRange(trip.arrival_date, trip.departure_date),
    arrival_date: trip.arrival_date,
    guest_count: formatBookingProgressGuestLabel(trip.tailored_for),
    client_file: buildBookingProgressClientFile(trip),
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
