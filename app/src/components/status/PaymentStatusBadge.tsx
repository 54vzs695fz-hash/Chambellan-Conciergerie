import {
  PAYMENT_STATUS_LABELS,
  needsPaymentWarning,
  paymentBadgeClass,
} from "@/lib/planner/payment-status";
import type { TripPaymentStatus } from "@/lib/types";

interface Props {
  status: TripPaymentStatus;
  arrivalDate?: string;
  className?: string;
}

export function PaymentStatusBadge({
  status,
  arrivalDate,
  className = "",
}: Props) {
  const warning =
    !!arrivalDate && needsPaymentWarning(arrivalDate, status);

  return (
    <span className={`${paymentBadgeClass(status)} ${className}`.trim()}>
      {warning ? (
        <span
          className="pay-status-warn"
          aria-hidden
          title="Payment pending — arrival within 7 days"
        />
      ) : null}
      {PAYMENT_STATUS_LABELS[status]}
    </span>
  );
}
