import {
  PAYMENT_STATUS_DOT,
  PROGRAMME_STATUS_DOT,
} from "@/lib/calendar/display-utils";
import {
  FOLLOW_UP_STATUS_LABELS,
  FOLLOW_UP_STATUS_OPTIONS,
} from "@/lib/calendar/status-styles";
import {
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_OPTIONS,
} from "@/lib/planner/payment-status";

export function CalendarLegend() {
  return (
    <div className="cal-legend" aria-label="Status legend">
      <div className="cal-legend-row">
        <span className="cal-legend-group">Programme:</span>
        <ul className="cal-legend-items">
          {FOLLOW_UP_STATUS_OPTIONS.map((status) => (
            <li key={status} className="cal-legend-item">
              <span
                className={`cal-dot cal-dot--legend ${PROGRAMME_STATUS_DOT[status]}`}
                aria-hidden
              />
              {FOLLOW_UP_STATUS_LABELS[status]}
            </li>
          ))}
        </ul>
      </div>
      <div className="cal-legend-row">
        <span className="cal-legend-group">Payment:</span>
        <ul className="cal-legend-items">
          {PAYMENT_STATUS_OPTIONS.map((status) => (
            <li key={status} className="cal-legend-item">
              <span
                className={`cal-dot cal-dot--legend ${PAYMENT_STATUS_DOT[status]}`}
                aria-hidden
              />
              {PAYMENT_STATUS_LABELS[status]}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
