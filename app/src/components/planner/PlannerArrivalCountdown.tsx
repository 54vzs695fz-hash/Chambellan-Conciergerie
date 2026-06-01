import { getArrivalCountdown } from "@/lib/planner/arrival-countdown";
import { arrivalUrgencyClass } from "@/lib/calendar/status-styles";

interface Props {
  arrivalDate: string;
  departureDate: string;
}

export function PlannerArrivalCountdown({ arrivalDate, departureDate }: Props) {
  const countdown = getArrivalCountdown(arrivalDate, departureDate);
  if (!countdown) return null;

  return (
    <p className="planner-list-arrival">
      {countdown.urgency ? (
        <span className={arrivalUrgencyClass(countdown.urgency)} aria-hidden />
      ) : null}
      {countdown.label}
    </p>
  );
}
