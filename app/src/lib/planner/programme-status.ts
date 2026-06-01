import type { TripFollowUpStatus } from "@/lib/types";

export const PROGRAMME_STATUS_LABELS: Record<TripFollowUpStatus, string> = {
  follow_up: "Follow up",
  contacted: "Contacted",
  confirmed: "Confirmed",
  completed: "Completed",
};

export const PROGRAMME_STATUS_OPTIONS: TripFollowUpStatus[] = [
  "follow_up",
  "contacted",
  "confirmed",
  "completed",
];

export function programmeStatusLabel(
  status: TripFollowUpStatus | undefined | null
): string {
  return PROGRAMME_STATUS_LABELS[status ?? "follow_up"];
}
