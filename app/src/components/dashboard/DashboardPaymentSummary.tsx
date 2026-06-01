import Link from "next/link";
import {
  countPaymentStatuses,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_OPTIONS,
} from "@/lib/planner/payment-status";
import type { Trip, TripPaymentStatus } from "@/lib/types";

interface Props {
  trips: Trip[];
}

export function DashboardPaymentSummary({ trips }: Props) {
  const counts = countPaymentStatuses(trips);
  const total = PAYMENT_STATUS_OPTIONS.reduce(
    (sum, status) => sum + counts[status],
    0
  );

  if (total === 0) return null;

  return (
    <section className="dash-pay mb-10" data-section="payments">
      <div className="dash-pay-head">
        <h2 className="section-title">Payment summary</h2>
        <Link href="/calendar" className="btn-ghost">
          Calendar
        </Link>
      </div>
      <div className="dash-pay-grid card px-4 py-4">
        {PAYMENT_STATUS_OPTIONS.map((status) => (
          <PaymentCount key={status} status={status} count={counts[status]} />
        ))}
      </div>
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
