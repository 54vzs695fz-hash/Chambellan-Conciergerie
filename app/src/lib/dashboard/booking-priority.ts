import {
  buildBookingProgressPlanner,
  buildEstablishmentContactLookup,
  isClientProgrammeConfirmed,
} from "@/lib/dashboard/booking-progress";
import type { BookingProgressPlanner } from "@/lib/dashboard/booking-progress";
import { isUntitledDestination } from "@/lib/planner-utils";
import {
  isBookingRequiringAction,
  type BookingProgressTone,
  type ReservationStatusItem,
} from "@/lib/reservations/reservation-status";
import type { Establishment, TripPaymentStatus, TripWithDays } from "@/lib/types";

export type BookingPriorityLevel = "high" | "medium" | "ready";

export interface BookingPriorityItem {
  tripId: number;
  client_name: string;
  destination: string;
  destination_subtitle: string | null;
  dates: string;
  arrival_date: string;
  guest_label: string | null;
  remaining: number;
  percent: number;
  progressTone: BookingProgressTone;
  priority: BookingPriorityLevel;
  priority_label: string;
  priority_emoji: string;
  remaining_label: string;
  href: string;
}

interface BookingPrioritySortFields {
  remaining: number;
  arrival_date: string;
  waiting_confirmations: number;
  pending_transfers: number;
  pending_payment: number;
}

const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

const PRIORITY_META: Record<
  BookingPriorityLevel,
  { emoji: string; label: string }
> = {
  high: { emoji: "🔴", label: "HIGH PRIORITY" },
  medium: { emoji: "🟠", label: "MEDIUM PRIORITY" },
  ready: { emoji: "🟢", label: "READY" },
};

export function formatBookingPriorityStayDates(
  arrival: string,
  departure: string
): string {
  if (!arrival || !departure) return "";
  const a = new Date(`${arrival}T12:00:00`);
  const b = new Date(`${departure}T12:00:00`);
  const fmt = (d: Date) =>
    `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
  if (arrival === departure) return fmt(a);
  return `${fmt(a)} – ${fmt(b)}`;
}

export function formatBookingPriorityGuestLabel(
  guestCount: string | null | undefined
): string | null {
  const trimmed = String(guestCount ?? "").trim();
  if (!trimmed) return null;

  const match = trimmed.match(/^(\d+)\s*guests?$/i);
  if (match) {
    const count = Number(match[1]);
    return `${count} Guest${count === 1 ? "" : "s"}`;
  }

  if (/^\d+$/.test(trimmed)) {
    const count = Number(trimmed);
    return `${count} Guest${count === 1 ? "" : "s"}`;
  }

  return trimmed;
}

function countWaitingConfirmations(items: ReservationStatusItem[]): number {
  return items.filter((item) => item.booking_status === "waiting_confirmation")
    .length;
}

function countPendingTransfers(items: ReservationStatusItem[]): number {
  return items.filter(
    (item) =>
      item.category === "transportation" &&
      isBookingRequiringAction(item.booking_status)
  ).length;
}

function pendingPaymentWeight(paymentStatus: TripPaymentStatus): number {
  return paymentStatus === "pending" || paymentStatus === "deposit_paid" ? 1 : 0;
}

export function resolveBookingPriorityLevel(
  planner: Pick<BookingProgressPlanner, "summary">
): BookingPriorityLevel {
  if (planner.summary.remaining === 0) return "ready";
  if (planner.summary.priority === "high") return "high";
  return "medium";
}

export function compareBookingPrioritySortFields(
  a: BookingPrioritySortFields,
  b: BookingPrioritySortFields
): number {
  if (b.remaining !== a.remaining) return b.remaining - a.remaining;

  const dateCmp = a.arrival_date.localeCompare(b.arrival_date);
  if (dateCmp !== 0) return dateCmp;

  const waitingCmp = b.waiting_confirmations - a.waiting_confirmations;
  if (waitingCmp !== 0) return waitingCmp;

  const transferCmp = b.pending_transfers - a.pending_transfers;
  if (transferCmp !== 0) return transferCmp;

  return b.pending_payment - a.pending_payment;
}

function buildBookingPriorityItem(
  planner: BookingProgressPlanner,
  arrivalDate: string,
  departureDate: string
): BookingPriorityItem & BookingPrioritySortFields {
  const priority = resolveBookingPriorityLevel(planner);
  const meta = PRIORITY_META[priority];
  const remaining = planner.summary.remaining;

  return {
    tripId: planner.tripId,
    client_name: planner.client_name,
    destination: planner.destination,
    destination_subtitle: planner.destination_subtitle,
    dates: formatBookingPriorityStayDates(arrivalDate, departureDate),
    arrival_date: arrivalDate,
    guest_label: formatBookingPriorityGuestLabel(planner.guest_count),
    remaining,
    percent: planner.summary.percent,
    progressTone: planner.summary.progressTone,
    priority,
    priority_emoji: meta.emoji,
    priority_label: meta.label,
    remaining_label:
      remaining === 0
        ? "All bookings completed"
        : `${remaining} booking${remaining === 1 ? "" : "s"} remaining`,
    href: planner.href,
    waiting_confirmations: countWaitingConfirmations(planner.items),
    pending_transfers: countPendingTransfers(planner.items),
    pending_payment: pendingPaymentWeight(planner.payment_status),
  };
}

export function listBookingPriorityItems(
  confirmedTrips: TripWithDays[],
  establishments: Establishment[] = []
): BookingPriorityItem[] {
  const lookup = buildEstablishmentContactLookup(establishments);

  return confirmedTrips
    .filter(
      (trip) =>
        isClientProgrammeConfirmed(trip) &&
        !isUntitledDestination(trip.destination)
    )
    .map((trip) => {
      const planner = buildBookingProgressPlanner(trip, lookup);
      if (planner.summary.total === 0) return null;
      return buildBookingPriorityItem(
        planner,
        trip.arrival_date,
        trip.departure_date
      );
    })
    .filter((item): item is BookingPriorityItem & BookingPrioritySortFields =>
      item !== null
    )
    .sort(compareBookingPrioritySortFields)
    .map(
      ({
        waiting_confirmations,
        pending_transfers,
        pending_payment,
        ...item
      }) => item
    );
}
