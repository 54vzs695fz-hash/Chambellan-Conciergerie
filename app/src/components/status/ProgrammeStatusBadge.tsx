import {
  FOLLOW_UP_STATUS_LABELS,
  statusBadgeClass,
  arrivalUrgencyClass,
  getArrivalUrgency,
} from "@/lib/calendar/status-styles";
import { PROGRAMME_STATUS_DOT } from "@/lib/calendar/display-utils";
import type { TripFollowUpStatus } from "@/lib/types";

interface Props {
  status: TripFollowUpStatus;
  showDot?: boolean;
  arrivalDate?: string;
  className?: string;
}

export function ProgrammeStatusBadge({
  status,
  showDot = false,
  arrivalDate,
  className = "",
}: Props) {
  const urgency =
    showDot && arrivalDate ? getArrivalUrgency(arrivalDate) : null;

  return (
    <span className={`${statusBadgeClass(status)} ${className}`.trim()}>
      <span
        className={`cal-dot ${PROGRAMME_STATUS_DOT[status]}`}
        aria-hidden
      />
      {urgency ? (
        <span className={arrivalUrgencyClass(urgency)} aria-hidden />
      ) : null}
      {FOLLOW_UP_STATUS_LABELS[status]}
    </span>
  );
}
