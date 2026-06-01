import {
  PAYMENT_STATUS_LABELS,
  needsPaymentWarning,
  paymentBadgeClass,
} from "@/lib/planner/payment-status";
import { PAYMENT_STATUS_DOT } from "@/lib/calendar/display-utils";
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
      <span
        className={`cal-dot ${PAYMENT_STATUS_DOT[status]}${warning ? " cal-dot--warn-ring" : ""}`}
        aria-hidden
        title={
          warning ? "Payment pending — arrival within 7 days" : undefined
        }
      />
      {PAYMENT_STATUS_LABELS[status]}
    </span>
  );
}
