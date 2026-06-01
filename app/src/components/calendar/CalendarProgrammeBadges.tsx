import { ProgrammeStatusBadge } from "@/components/status/ProgrammeStatusBadge";
import { PaymentStatusBadge } from "@/components/status/PaymentStatusBadge";
import type { CalendarProgramme } from "@/lib/calendar/programmes";

interface Props {
  programme: CalendarProgramme;
  showFollowUpDot?: boolean;
}

export function CalendarProgrammeBadges({
  programme,
  showFollowUpDot = true,
}: Props) {
  return (
    <span className="cal-programme-badges">
      <ProgrammeStatusBadge
        status={programme.followUpStatus}
        showDot={showFollowUpDot}
        arrivalDate={programme.arrivalDate}
      />
      <PaymentStatusBadge
        status={programme.paymentStatus}
        arrivalDate={programme.arrivalDate}
      />
    </span>
  );
}
