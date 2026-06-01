import { daysUntilArrival } from "@/lib/calendar/programmes";
import type { TripFollowUpStatus } from "@/lib/types";

export const FOLLOW_UP_STATUS_LABELS: Record<TripFollowUpStatus, string> = {
  follow_up: "Follow up",
  contacted: "Contacted",
  confirmed: "Confirmed",
  completed: "Completed",
};

export const STATUS_COLORS: Record<TripFollowUpStatus, string> = {
  follow_up: "#C79A35",
  contacted: "#6F8FAE",
  confirmed: "#6FA47A",
  completed: "#9A948C",
};

export function statusBadgeClass(status: TripFollowUpStatus): string {
  return `prog-status prog-status--${status.replace(/_/g, "-")}`;
}

export function statusEventClass(status: TripFollowUpStatus): string {
  return `cal-event--status-${status.replace(/_/g, "-")}`;
}

export type ArrivalUrgency = "within-7" | "within-3" | "tomorrow";

export function getArrivalUrgency(
  arrivalDate: string,
  today = new Date()
): ArrivalUrgency | null {
  const days = daysUntilArrival(arrivalDate, today);
  if (days === null || days < 0) return null;
  if (days <= 1) return "tomorrow";
  if (days <= 3) return "within-3";
  if (days <= 7) return "within-7";
  return null;
}

export function arrivalUrgencyClass(urgency: ArrivalUrgency | null): string {
  if (!urgency) return "";
  return `prog-urgency prog-urgency--${urgency}`;
}

export const FOLLOW_UP_STATUS_OPTIONS: TripFollowUpStatus[] = [
  "follow_up",
  "contacted",
  "confirmed",
  "completed",
];
