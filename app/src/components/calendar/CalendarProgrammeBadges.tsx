import { ProgrammeStatusBadge } from "@/components/status/ProgrammeStatusBadge";
import { PaymentStatusBadge } from "@/components/status/PaymentStatusBadge";
import { PaymentStatusPicker } from "@/components/status/PaymentStatusPicker";
import type { CalendarProgramme } from "@/lib/calendar/programmes";
import type { TripPaymentStatus } from "@/lib/types";

interface Props {
  programme: CalendarProgramme;
  showFollowUpDot?: boolean;
  paymentUpdating?: boolean;
  paymentError?: string | null;
  onPaymentStatusChange?: (status: TripPaymentStatus) => void;
}

export function CalendarProgrammeBadges({
  programme,
  showFollowUpDot = true,
  paymentUpdating = false,
  paymentError = null,
  onPaymentStatusChange,
}: Props) {
  return (
    <span className="cal-programme-badges">
      <ProgrammeStatusBadge
        status={programme.followUpStatus}
        showDot={showFollowUpDot}
        arrivalDate={programme.arrivalDate}
      />
      {onPaymentStatusChange ? (
        <PaymentStatusPicker
          status={programme.paymentStatus}
          arrivalDate={programme.arrivalDate}
          saving={paymentUpdating}
          error={paymentError}
          onSelect={onPaymentStatusChange}
        />
      ) : (
        <PaymentStatusBadge
          status={programme.paymentStatus}
          arrivalDate={programme.arrivalDate}
        />
      )}
    </span>
  );
}
