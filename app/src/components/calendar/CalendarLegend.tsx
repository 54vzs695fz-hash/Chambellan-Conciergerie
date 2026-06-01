import {
  FOLLOW_UP_STATUS_LABELS,
  FOLLOW_UP_STATUS_OPTIONS,
  statusBadgeClass,
} from "@/lib/calendar/status-styles";
import {
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_OPTIONS,
  paymentBadgeClass,
} from "@/lib/planner/payment-status";

export function CalendarLegend() {
  return (
    <aside className="cal-legend" aria-label="Status legend">
      <p className="cal-legend-title">Legend</p>
      <div className="cal-legend-sections">
        <section className="cal-legend-section">
          <h2 className="cal-legend-kicker">Programme status</h2>
          <ul className="cal-legend-items">
            {FOLLOW_UP_STATUS_OPTIONS.map((status) => (
              <li key={status}>
                <span className={statusBadgeClass(status)}>
                  {FOLLOW_UP_STATUS_LABELS[status]}
                </span>
              </li>
            ))}
          </ul>
        </section>
        <section className="cal-legend-section">
          <h2 className="cal-legend-kicker">Payment status</h2>
          <ul className="cal-legend-items">
            {PAYMENT_STATUS_OPTIONS.map((status) => (
              <li key={status}>
                <span className={paymentBadgeClass(status)}>
                  {PAYMENT_STATUS_LABELS[status]}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </aside>
  );
}
