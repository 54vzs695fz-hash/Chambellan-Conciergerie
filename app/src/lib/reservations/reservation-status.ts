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
  "waiting_confirmation",
  "paid",
  "confirmed",
  "cancelled",
] as const satisfies readonly BookingStatus[];

export const BOOKING_PROGRESS_STATUS_LABELS: Record<
  (typeof BOOKING_PROGRESS_STATUS_OPTIONS)[number],
  string
> = {
  to_request: "To book",
  request_sent: "Requested",
  waiting_confirmation: "Pending confirmation",
  paid: "Paid",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
};

/** Actionable-first order inside each planner card. */
export const BOOKING_PROGRESS_SORT_ORDER: BookingStatus[] = [
  "to_request",
  "request_sent",
  "waiting_confirmation",
  "paid",
  "confirmed",
  "rejected",
  "cancelled",
];

export type BookingProgressTone =
  | "urgent"
  | "pending"
  | "paid"
  | "confirmed"
  | "cancelled";

export type PlannerBookingPriority = "high" | "medium";

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
  if (status === "rejected") return "cancelled";
  if (status === "waiting_confirmation") return "waiting_confirmation";
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
    status === "cancelled" ||
    status === "rejected"
  );
}

export function isBookingRequiringAction(status: BookingStatus): boolean {
  return !isBookingProgressComplete(status);
}

export function bookingProgressSortRank(status: BookingStatus): number {
  const index = BOOKING_PROGRESS_SORT_ORDER.indexOf(status);
  return index === -1 ? 0 : index;
}

export function sortBookingProgressItems(
  items: ReservationStatusItem[]
): ReservationStatusItem[] {
  return [...items].sort((a, b) => {
    const statusCmp =
      bookingProgressSortRank(a.booking_status) -
      bookingProgressSortRank(b.booking_status);
    if (statusCmp !== 0) return statusCmp;
    const dateCmp = a.date.localeCompare(b.date);
    if (dateCmp !== 0) return dateCmp;
    const timeCmp = a.time.localeCompare(b.time);
    if (timeCmp !== 0) return timeCmp;
    return a.venue.localeCompare(b.venue);
  });
}

export function bookingProgressTone(status: BookingStatus): BookingProgressTone {
  switch (toBookingProgressStatus(status)) {
    case "to_request":
      return "urgent";
    case "request_sent":
    case "waiting_confirmation":
      return "pending";
    case "paid":
      return "paid";
    case "confirmed":
      return "confirmed";
    case "cancelled":
      return "cancelled";
    default:
      return "urgent";
  }
}

export function bookingProgressToneClass(tone: BookingProgressTone): string {
  return `bp-tone--${tone}`;
}

export function bookingProgressStatusClass(status: BookingStatus): string {
  return bookingProgressToneClass(bookingProgressTone(status));
}

export function worstBookingProgressTone(
  items: ReservationStatusItem[]
): BookingProgressTone {
  if (items.some((item) => item.booking_status === "to_request")) {
    return "urgent";
  }
  if (
    items.some((item) =>
      ["request_sent", "waiting_confirmation"].includes(item.booking_status)
    )
  ) {
    return "pending";
  }
  if (items.some((item) => item.booking_status === "paid")) {
    return "paid";
  }
  if (items.every((item) => isBookingProgressComplete(item.booking_status))) {
    return "confirmed";
  }
  return "pending";
}

export function computePlannerBookingPriority(
  items: ReservationStatusItem[]
): PlannerBookingPriority {
  if (items.some((item) => item.booking_status === "to_request")) {
    return "high";
  }
  return "medium";
}

export const PLANNER_BOOKING_PRIORITY_LABELS: Record<
  PlannerBookingPriority,
  string
> = {
  high: "High Priority",
  medium: "Medium Priority",
};

export interface PlannerBookingSummary {
  total: number;
  confirmed: number;
  remaining: number;
  percent: number;
  priority: PlannerBookingPriority;
  progressTone: BookingProgressTone;
}

export function computePlannerBookingSummary(
  items: ReservationStatusItem[]
): PlannerBookingSummary {
  const total = items.length;
  const confirmed = items.filter(
    (item) => item.booking_status === "confirmed"
  ).length;
  const remaining = items.filter((item) =>
    isBookingRequiringAction(item.booking_status)
  ).length;
  const percent = total === 0 ? 100 : Math.round((confirmed / total) * 100);

  return {
    total,
    confirmed,
    remaining,
    percent,
    priority: computePlannerBookingPriority(items),
    progressTone: worstBookingProgressTone(items),
  };
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

  return sortBookingProgressItems(items);
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
  switch (bookingProgressTone(status)) {
    case "confirmed":
      return "rs-dot rs-dot--confirmed";
    case "pending":
      return "rs-dot rs-dot--pending";
    case "paid":
      return "rs-dot rs-dot--paid";
    case "cancelled":
      return "rs-dot rs-dot--closed";
    default:
      return "rs-dot rs-dot--todo";
  }
}
