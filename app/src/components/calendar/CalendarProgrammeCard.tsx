"use client";

import Link from "next/link";
import { formatDateRange } from "@/lib/planner-utils";
import { PlannerArrivalCountdown } from "@/components/planner/PlannerArrivalCountdown";
import { CalendarProgrammeBadges } from "@/components/calendar/CalendarProgrammeBadges";
import type { CalendarProgramme } from "@/lib/calendar/programmes";
import type { TripPaymentStatus } from "@/lib/types";

interface Props {
  programme: CalendarProgramme;
  selected?: boolean;
  checklistSummary?: string | null;
  onSelect: () => void;
  updatingPaymentId?: number | null;
  paymentErrors?: Record<number, string>;
  onPaymentStatusChange?: (id: number, status: TripPaymentStatus) => void;
}

export function CalendarProgrammeCard({
  programme,
  selected = false,
  checklistSummary = null,
  onSelect,
  updatingPaymentId = null,
  paymentErrors = {},
  onPaymentStatusChange,
}: Props) {
  return (
    <article
      className={`cal-prog-card${selected ? " is-selected" : ""}`}
    >
      <button
        type="button"
        className="cal-prog-card-body min-h-[44px]"
        onClick={onSelect}
      >
        <div className="cal-prog-card-top">
          <div className="cal-prog-card-head">
            <p className="cal-prog-card-client">{programme.clientName}</p>
            <p className="cal-prog-card-destination font-serif text-gold tracking-wide">
              {programme.destination}
            </p>
          </div>
          <CalendarProgrammeBadges
            programme={programme}
            showFollowUpDot
            paymentUpdating={updatingPaymentId === programme.id}
            paymentError={paymentErrors[programme.id] ?? null}
            onPaymentStatusChange={
              onPaymentStatusChange
                ? (status) => onPaymentStatusChange(programme.id, status)
                : undefined
            }
          />
        </div>
        <p className="cal-prog-card-dates">
          {formatDateRange(programme.arrivalDate, programme.departureDate)}
          {programme.guestCount ? ` · ${programme.guestCount}` : ""}
        </p>
        <PlannerArrivalCountdown
          arrivalDate={programme.arrivalDate}
          departureDate={programme.departureDate}
        />
        {checklistSummary ? (
          <p className="cal-prog-card-checklist">{checklistSummary}</p>
        ) : null}
      </button>
      <Link
        href={programme.plannerHref}
        className="cal-prog-card-planner min-h-[44px]"
        onClick={(event) => event.stopPropagation()}
      >
        Planner
      </Link>
    </article>
  );
}
