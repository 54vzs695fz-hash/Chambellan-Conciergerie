import {
  arrivalUrgencyClass,
  getArrivalUrgency,
  statusEventClass,
} from "@/lib/calendar/status-styles";
import { CALENDAR_QUICK_ACTIONS } from "@/lib/calendar/follow-up";
import type { CalendarProgramme } from "@/lib/calendar/programmes";
import type { TripFollowUpStatus } from "@/lib/types";

interface Props {
  programme: CalendarProgramme;
  updating?: boolean;
  onStatusChange: (id: number, status: TripFollowUpStatus) => void;
  compact?: boolean;
}

export function CalendarQuickActions({
  programme,
  updating = false,
  onStatusChange,
  compact = false,
}: Props) {
  return (
    <div
      className={`cal-quick-actions${compact ? " cal-quick-actions--compact" : ""}`}
      role="group"
      aria-label="Update programme status"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      {CALENDAR_QUICK_ACTIONS.map((action) => (
        <button
          key={action.status}
          type="button"
          className={`cal-quick-btn cal-quick-btn--${action.status.replace(/_/g, "-")}${programme.followUpStatus === action.status ? " is-active" : ""}`}
          disabled={updating}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onStatusChange(programme.id, action.status);
          }}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}

export function calendarEventClasses(
  programme: CalendarProgramme,
  segmentClass = "",
  today = new Date(),
  baseClass = "cal-event"
): string {
  const urgency = getArrivalUrgency(programme.arrivalDate, today);
  return [
    baseClass,
    segmentClass,
    statusEventClass(programme.followUpStatus),
    urgency ? arrivalUrgencyClass(urgency) : "",
  ]
    .filter(Boolean)
    .join(" ");
}
