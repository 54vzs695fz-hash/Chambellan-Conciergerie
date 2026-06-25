import Link from "next/link";
import {
  countPaymentStatuses,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_OPTIONS,
} from "@/lib/planner/payment-status";
import type { Trip, TripPaymentStatus } from "@/lib/types";

interface Props {
  trips: Trip[];
  embedded?: boolean;
}

export function DashboardPaymentSummary({ trips, embedded = false }: Props) {
  const counts = countPaymentStatuses(trips);
  const total = PAYMENT_STATUS_OPTIONS.reduce(
    (sum, status) => sum + counts[status],
    0
  );

  if (!embedded && total === 0) return null;

  const grid = (
    <div className="dash-pay-grid dash-card dash-card--payments px-4 py-4">
      {PAYMENT_STATUS_OPTIONS.map((status) => (
        <PaymentCount key={status} status={status} count={counts[status]} />
      ))}
    </div>
  );

  if (embedded) {
    return (
      <div className="dash-embedded-section dash-pay-embedded">
        <div className="dash-embedded-head">
          <Link href="/calendar" className="btn-ghost">
            Calendar
          </Link>
        </div>
        {total === 0 ? (
          <p className="dash-accordion-empty text-sm text-muted">
            No payment data yet.
          </p>
        ) : (
          grid
        )}
      </div>
    );
  }

  return (
    <section className="dash-pay mb-10" data-section="payments">
      <div className="dash-pay-head">
        <h2 className="section-title">Payment summary</h2>
        <Link href="/calendar" className="btn-ghost">
          Calendar
        </Link>
      </div>
      {grid}
    </section>
  );
}

function PaymentCount({
  status,
  count,
}: {
  status: TripPaymentStatus;
  count: number;
}) {
  return (
    <div className="dash-pay-stat">
      <p className={`dash-pay-value dash-pay-value--${status.replace(/_/g, "-")}`}>
        {count}
      </p>
      <p className="dash-pay-label">{PAYMENT_STATUS_LABELS[status]}</p>
    </div>
  );
}
