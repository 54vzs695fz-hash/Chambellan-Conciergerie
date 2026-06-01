"use client";

import {
  PAYMENT_STATUS_DOT,
  PROGRAMME_STATUS_DOT,
  programmeChipLabel,
} from "@/lib/calendar/display-utils";
import { needsPaymentWarning } from "@/lib/planner/payment-status";
import type { CalendarProgramme } from "@/lib/calendar/programmes";

interface Props {
  programme: CalendarProgramme;
  selected?: boolean;
  onClick: () => void;
}

export function CalendarProgrammeChip({
  programme,
  selected = false,
  onClick,
}: Props) {
  const paymentWarn = needsPaymentWarning(
    programme.arrivalDate,
    programme.paymentStatus
  );

  return (
    <button
      type="button"
      className={`cal-chip${selected ? " is-selected" : ""}`}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      title={`${programme.clientName} · ${programme.destination}`}
    >
      <span className="cal-chip-dots" aria-hidden>
        <span
          className={`cal-dot ${PROGRAMME_STATUS_DOT[programme.followUpStatus]}`}
        />
        <span
          className={`cal-dot ${PAYMENT_STATUS_DOT[programme.paymentStatus]}${paymentWarn ? " cal-dot--warn-ring" : ""}`}
        />
      </span>
      <span className="cal-chip-label">{programmeChipLabel(programme)}</span>
    </button>
  );
}
