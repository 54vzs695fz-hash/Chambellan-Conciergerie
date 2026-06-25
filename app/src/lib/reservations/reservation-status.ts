import type { Activity, ActivityType, BookingStatus, TripDay } from "@/lib/types";
import { ACTIVITY_TYPE_LABELS } from "@/lib/types";

export type { BookingStatus };

export const BOOKING_STATUS_OPTIONS: BookingStatus[] = [
  "to_request",
  "request_sent",
  "waiting_confirmation",
  "confirmed",
  "paid",
  "rejected",
  "cancelled",
];

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  to_request: "To request",
  request_sent: "Request sent",
  waiting_confirmation: "Waiting confirmation",
  confirmed: "Confirmed",
  paid: "Paid",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

/** Simplified labels for the internal Booking Progress dashboard. */
export const BOOKING_PROGRESS_STATUS_OPTIONS = [
  "to_request",
  "request_sent",
  "confirmed",
  "paid",
  "cancelled",
] as const satisfies readonly BookingStatus[];

export const BOOKING_PROGRESS_STATUS_LABELS: Record<
  (typeof BOOKING_PROGRESS_STATUS_OPTIONS)[number],
  string
> = {
  to_request: "To book",
  request_sent: "Requested",
  confirmed: "Confirmed",
  paid: "Paid",
  cancelled: "Cancelled",
};

export const BOOKING_ASSIGNEE_OPTIONS = [
  "",
  "matthieu",
  "yanis",
  "chambellan",
] as const;

export const BOOKING_ASSIGNEE_LABELS: Record<
  (typeof BOOKING_ASSIGNEE_OPTIONS)[number],
  string
> = {
  "": "Unassigned",
  matthieu: "Matthieu",
  yanis: "Yanis",
  chambellan: "Chambellan",
};

/** Activity types that represent bookable reservations (not transfers or notes). */
export const RESERVATION_ACTIVITY_TYPES: ActivityType[] = [
  "restaurant",
  "beach_club",
  "club",
  "event",
  "activity",
];

const RESERVATION_TYPE_SET = new Set<ActivityType>(RESERVATION_ACTIVITY_TYPES);

export function isReservationActivityType(
  activityType: ActivityType
): boolean {
  return RESERVATION_TYPE_SET.has(activityType);
}

export function normalizeBookingStatus(value: unknown): BookingStatus {
  if (
    typeof value === "string" &&
    BOOKING_STATUS_OPTIONS.includes(value as BookingStatus)
  ) {
    return value as BookingStatus;
  }
  return "to_request";
}

export function normalizeBookingAssignee(value: unknown): string {
  if (
    typeof value === "string" &&
    BOOKING_ASSIGNEE_OPTIONS.includes(
      value as (typeof BOOKING_ASSIGNEE_OPTIONS)[number]
    )
  ) {
    return value;
  }
  return "";
}

export function toBookingProgressStatus(
  status: BookingStatus
): (typeof BOOKING_PROGRESS_STATUS_OPTIONS)[number] {
  if (status === "waiting_confirmation" || status === "rejected") {
    return "request_sent";
  }
  if (
    BOOKING_PROGRESS_STATUS_OPTIONS.includes(
      status as (typeof BOOKING_PROGRESS_STATUS_OPTIONS)[number]
    )
  ) {
    return status as (typeof BOOKING_PROGRESS_STATUS_OPTIONS)[number];
  }
  return "to_request";
}

/** Reservation is handled — no longer blocks Booking Progress removal. */
export function isBookingProgressComplete(status: BookingStatus): boolean {
  return (
    status === "confirmed" ||
    status === "paid" ||
    status === "cancelled" ||
    status === "rejected"
  );
}

export function isTrackableReservationActivity(activity: Activity): boolean {
  return (
    isReservationActivityType(activity.activity_type) &&
    activity.title.trim().length > 0
  );
}

export interface ReservationStatusItem {
  activityId: number;
  venue: string;
  date: string;
  time: string;
  category: ActivityType;
  categoryLabel: string;
  booking_status: BookingStatus;
  assigned_to: string;
  booking_notes: string;
}

export function buildReservationStatusItems(
  days: TripDay[]
): ReservationStatusItem[] {
  const items: ReservationStatusItem[] = [];

  for (const day of days) {
    for (const activity of day.activities) {
      if (!isTrackableReservationActivity(activity)) continue;
      items.push({
        activityId: activity.id,
        venue: activity.title.trim(),
        date: day.date,
        time: activity.time.trim(),
        category: activity.activity_type,
        categoryLabel: ACTIVITY_TYPE_LABELS[activity.activity_type],
        booking_status: normalizeBookingStatus(activity.booking_status),
        assigned_to: normalizeBookingAssignee(activity.assigned_to),
        booking_notes: activity.booking_notes?.trim() ?? "",
      });
    }
  }

  items.sort((a, b) => {
    const dateCmp = a.date.localeCompare(b.date);
    if (dateCmp !== 0) return dateCmp;
    const timeCmp = a.time.localeCompare(b.time);
    if (timeCmp !== 0) return timeCmp;
    return a.venue.localeCompare(b.venue);
  });

  return items;
}

/** Summary order for compact display (most actionable first). */
const SUMMARY_STATUS_ORDER: BookingStatus[] = [
  "confirmed",
  "paid",
  "waiting_confirmation",
  "request_sent",
  "to_request",
  "rejected",
  "cancelled",
];

export function countBookingStatuses(
  items: ReservationStatusItem[]
): Partial<Record<BookingStatus, number>> {
  const counts: Partial<Record<BookingStatus, number>> = {};
  for (const item of items) {
    counts[item.booking_status] = (counts[item.booking_status] ?? 0) + 1;
  }
  return counts;
}

export function formatBookingStatusSummary(
  items: ReservationStatusItem[]
): string {
  const counts = countBookingStatuses(items);
  const parts: string[] = [];

  for (const status of SUMMARY_STATUS_ORDER) {
    const count = counts[status];
    if (!count) continue;
    const label = BOOKING_STATUS_LABELS[status].toLowerCase();
    parts.push(`${count} ${label}`);
  }

  return parts.join(" · ");
}

export function bookingStatusDotClass(status: BookingStatus): string {
  if (status === "confirmed" || status === "paid") return "rs-dot rs-dot--confirmed";
  if (status === "waiting_confirmation" || status === "request_sent") {
    return "rs-dot rs-dot--pending";
  }
  if (status === "rejected" || status === "cancelled") {
    return "rs-dot rs-dot--closed";
  }
  return "rs-dot rs-dot--todo";
}
