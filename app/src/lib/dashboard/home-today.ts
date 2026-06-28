import { startOfDay, toIsoDate } from "@/lib/calendar/programmes";
import { resolveDashboardDestinationDisplay } from "@/lib/planner/trip-destinations";
import {
  normalizeTripPaymentStatus,
} from "@/lib/planner/payment-status";
import { paymentRemainingBadgeLabel } from "@/lib/planner/payment-summary";
import { isUntitledDestination } from "@/lib/planner-utils";
import {
  buildReservationStatusItems,
  isBookingRequiringAction,
  type ReservationStatusItem,
} from "@/lib/reservations/reservation-status";
import type { Trip, TripWithDays } from "@/lib/types";

export type TodayActionKind =
  | "arrival"
  | "departure"
  | "booking_request"
  | "waiting_confirmation"
  | "pending_transfer"
  | "pending_payment";

export interface TodayActionItem {
  id: string;
  kind: TodayActionKind;
  title: string;
  subtitle: string;
  href: string;
}

export interface TodayActionGroup {
  kind: TodayActionKind;
  label: string;
  items: TodayActionItem[];
}

export const TODAY_ACTION_LABELS: Record<TodayActionKind, string> = {
  arrival: "Today's arrivals",
  departure: "Today's departures",
  booking_request: "Booking requests to send",
  waiting_confirmation: "Waiting confirmations",
  pending_transfer: "Pending transfers",
  pending_payment: "Pending payments",
};

function isActiveProgramme(trip: Pick<Trip, "follow_up_status">): boolean {
  return trip.follow_up_status !== "completed";
}

function isInStayToday(
  trip: Pick<Trip, "arrival_date" | "departure_date">,
  todayStr: string
): boolean {
  return (
    Boolean(trip.arrival_date) &&
    Boolean(trip.departure_date) &&
    trip.arrival_date <= todayStr &&
    trip.departure_date >= todayStr
  );
}

function formatTripSubtitle(trip: TripWithDays | Trip): string {
  const destination = resolveDashboardDestinationDisplay(trip, "Untitled");
  const client = trip.client_name.trim() || "Client";
  if (destination.primary === "Untitled") return client;
  return `${client} · ${destination.primary}`;
}

function formatBookingSubtitle(
  trip: TripWithDays,
  item: ReservationStatusItem
): string {
  const client = trip.client_name.trim() || "Client";
  const time = item.time ? item.time.slice(0, 5) : "";
  const parts = [client, item.venue, time].filter(Boolean);
  return parts.join(" · ");
}

function tripHref(tripId: number): string {
  return `/planner/${tripId}`;
}

function itemsForTripDay(
  trip: TripWithDays,
  todayStr: string,
  predicate: (item: ReservationStatusItem) => boolean
): TodayActionItem[] {
  const items = buildReservationStatusItems(trip.days).filter(
    (item) => item.date === todayStr && predicate(item)
  );

  return items.map((item) => ({
    id: `${trip.id}-${item.itemKey}`,
    kind:
      item.category === "transportation"
        ? "pending_transfer"
        : item.booking_status === "waiting_confirmation"
          ? "waiting_confirmation"
          : "booking_request",
    title: item.venue,
    subtitle: formatBookingSubtitle(trip, item),
    href: tripHref(trip.id),
  }));
}

export function buildTodayActionGroups(
  trips: Trip[],
  confirmedTrips: TripWithDays[],
  today = startOfDay(new Date())
): TodayActionGroup[] {
  const todayStr = toIsoDate(today);
  const groups = new Map<TodayActionKind, TodayActionItem[]>();

  const push = (kind: TodayActionKind, item: TodayActionItem) => {
    const list = groups.get(kind) ?? [];
    list.push(item);
    groups.set(kind, list);
  };

  for (const trip of trips) {
    if (!isActiveProgramme(trip)) continue;
    if (isUntitledDestination(trip.destination)) continue;

    const subtitle = formatTripSubtitle(trip);
    const href = tripHref(trip.id);

    if (trip.arrival_date === todayStr) {
      push("arrival", {
        id: `arrival-${trip.id}`,
        kind: "arrival",
        title: trip.client_name.trim() || "Client",
        subtitle,
        href,
      });
    }

    if (trip.departure_date === todayStr) {
      push("departure", {
        id: `departure-${trip.id}`,
        kind: "departure",
        title: trip.client_name.trim() || "Client",
        subtitle,
        href,
      });
    }
  }

  for (const trip of confirmedTrips) {
    if (!isActiveProgramme(trip)) continue;
    if (isUntitledDestination(trip.destination)) continue;

    for (const item of itemsForTripDay(
      trip,
      todayStr,
      (row) => row.booking_status === "to_request"
    )) {
      push("booking_request", { ...item, kind: "booking_request" });
    }

    for (const item of itemsForTripDay(
      trip,
      todayStr,
      (row) => row.booking_status === "waiting_confirmation"
    )) {
      push("waiting_confirmation", { ...item, kind: "waiting_confirmation" });
    }

    for (const item of itemsForTripDay(
      trip,
      todayStr,
      (row) =>
        row.category === "transportation" &&
        isBookingRequiringAction(row.booking_status)
    )) {
      push("pending_transfer", { ...item, kind: "pending_transfer" });
    }

    const paymentStatus = normalizeTripPaymentStatus(trip.payment_status);
    const paymentRelevant =
      isInStayToday(trip, todayStr) ||
      trip.arrival_date === todayStr ||
      trip.departure_date === todayStr;

    if (
      paymentRelevant &&
      (paymentStatus === "pending" || paymentStatus === "deposit_paid")
    ) {
      const detail = paymentRemainingBadgeLabel(trip);
      push("pending_payment", {
        id: `payment-${trip.id}`,
        kind: "pending_payment",
        title: trip.client_name.trim() || "Client",
        subtitle: detail
          ? `${formatTripSubtitle(trip)} · ${detail}`
          : formatTripSubtitle(trip),
        href: tripHref(trip.id),
      });
    }
  }

  const order: TodayActionKind[] = [
    "arrival",
    "departure",
    "booking_request",
    "waiting_confirmation",
    "pending_transfer",
    "pending_payment",
  ];

  return order
    .map((kind) => ({
      kind,
      label: TODAY_ACTION_LABELS[kind],
      items: groups.get(kind) ?? [],
    }))
    .filter((group) => group.items.length > 0);
}

export function countTodayActions(groups: TodayActionGroup[]): number {
  return groups.reduce((sum, group) => sum + group.items.length, 0);
}
