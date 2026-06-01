import {
  FOLLOW_UP_STATUS_LABELS,
  statusBadgeClass,
  arrivalUrgencyClass,
  getArrivalUrgency,
} from "@/lib/calendar/status-styles";
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
      {urgency ? (
        <span
          className={arrivalUrgencyClass(urgency)}
          aria-hidden
        />
      ) : null}
      {FOLLOW_UP_STATUS_LABELS[status]}
    </span>
  );
}
