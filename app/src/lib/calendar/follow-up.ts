import { daysUntilArrival } from "@/lib/calendar/programmes";
import type { CalendarProgramme } from "@/lib/calendar/programmes";
import type { TripFollowUpStatus } from "@/lib/types";

export type FollowUpSuggestionKind =
  | "programme_confirmation"
  | "bookings_transport"
  | "final_itinerary"
  | "arrival_check_in";

export interface FollowUpSuggestion {
  kind: FollowUpSuggestionKind;
  daysUntilArrival: number;
  label: string;
  detail: string;
}

const SUGGESTIONS: Record<
  FollowUpSuggestionKind,
  { days: number; label: string; detail: string }
> = {
  programme_confirmation: {
    days: 7,
    label: "Programme confirmation",
    detail: "Check final programme confirmation with the client.",
  },
  bookings_transport: {
    days: 3,
    label: "Bookings & transport",
    detail: "Confirm all bookings and transport arrangements.",
  },
  final_itinerary: {
    days: 1,
    label: "Final itinerary",
    detail: "Send the final itinerary to the client.",
  },
  arrival_check_in: {
    days: 0,
    label: "Arrival day",
    detail: "Check in with the client on arrival day.",
  },
};

export function getFollowUpSuggestions(
  programme: CalendarProgramme,
  today = new Date()
): FollowUpSuggestion[] {
  const days = daysUntilArrival(programme.arrivalDate, today);
  if (days === null || days < 0) return [];

  const out: FollowUpSuggestion[] = [];
  for (const kind of Object.keys(SUGGESTIONS) as FollowUpSuggestionKind[]) {
    const spec = SUGGESTIONS[kind];
    if (days === spec.days) {
      out.push({
        kind,
        daysUntilArrival: days,
        label: spec.label,
        detail: spec.detail,
      });
    }
  }
  return out;
}

export function getActiveFollowUpSuggestions(
  programmes: CalendarProgramme[],
  today = new Date()
): Array<{ programme: CalendarProgramme; suggestions: FollowUpSuggestion[] }> {
  return programmes
    .map((programme) => ({
      programme,
      suggestions: getFollowUpSuggestions(programme, today),
    }))
    .filter((entry) => entry.suggestions.length > 0)
    .sort(
      (a, b) =>
        (daysUntilArrival(a.programme.arrivalDate, today) ?? 99) -
        (daysUntilArrival(b.programme.arrivalDate, today) ?? 99)
    );
}

export function needsFollowUp(programme: CalendarProgramme): boolean {
  return (
    programme.followUpStatus === "follow_up" ||
    programme.followUpStatus === "contacted"
  );
}

export const FOLLOW_UP_ACTIONS: {
  status: TripFollowUpStatus;
  label: string;
}[] = [
  { status: "contacted", label: "Mark as contacted" },
  { status: "confirmed", label: "Mark as confirmed" },
  { status: "completed", label: "Mark as completed" },
];

export const CALENDAR_QUICK_ACTIONS: {
  status: TripFollowUpStatus;
  label: string;
}[] = [
  { status: "contacted", label: "Contacted" },
  { status: "confirmed", label: "Confirmed" },
  { status: "completed", label: "Completed" },
];
