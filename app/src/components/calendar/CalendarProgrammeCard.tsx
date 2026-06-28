"use client";

import Link from "next/link";
import { formatDateRange } from "@/lib/planner-utils";
import { PlannerArrivalCountdown } from "@/components/planner/PlannerArrivalCountdown";
import { CalendarProgrammeBadges } from "@/components/calendar/CalendarProgrammeBadges";
import { CalendarQuickActions } from "@/components/calendar/CalendarQuickActions";
import type { CalendarProgramme } from "@/lib/calendar/programmes";
import type { TripFollowUpStatus, TripPaymentStatus } from "@/lib/types";

interface Props {
  programme: CalendarProgramme;
  selected?: boolean;
  checklistSummary?: string | null;
  onSelect: () => void;
  updatingPaymentId?: number | null;
  updatingStatusId?: number | null;
  paymentErrors?: Record<number, string>;
  onPaymentStatusChange?: (id: number, status: TripPaymentStatus) => void;
  onStatusChange?: (id: number, status: TripFollowUpStatus) => void;
  mobileLayout?: boolean;
}

export function CalendarProgrammeCard({
  programme,
  selected = false,
  checklistSummary = null,
  onSelect,
  updatingPaymentId = null,
  updatingStatusId = null,
  paymentErrors = {},
  onPaymentStatusChange,
  onStatusChange,
  mobileLayout = false,
}: Props) {
  const badges = (
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
  );

  const statusActions =
    mobileLayout && onStatusChange ? (
      <CalendarQuickActions
        programme={programme}
        updating={updatingStatusId === programme.id}
        onStatusChange={onStatusChange}
        compact
      />
    ) : null;

  return (
    <article
      className={`cal-prog-card${selected ? " is-selected" : ""}${mobileLayout ? " cal-prog-card--mobile" : ""}`}
    >
      <button
        type="button"
        className="cal-prog-card-body min-h-[44px]"
        onClick={onSelect}
      >
        {mobileLayout ? (
          <>
            <p className="cal-prog-card-client">{programme.clientName}</p>
            <p className="cal-prog-card-destination font-serif text-gold tracking-wide">
              {programme.destination}
            </p>
            {programme.destinationSubtitle ? (
              <p className="cal-prog-card-destination-sub">
                {programme.destinationSubtitle}
              </p>
            ) : null}
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
          </>
        ) : (
          <>
            <div className="cal-prog-card-top">
              <div className="cal-prog-card-head">
                <p className="cal-prog-card-client">{programme.clientName}</p>
                <p className="cal-prog-card-destination font-serif text-gold tracking-wide">
                  {programme.destination}
                </p>
                {programme.destinationSubtitle ? (
                  <p className="cal-prog-card-destination-sub">
                    {programme.destinationSubtitle}
                  </p>
                ) : null}
              </div>
              {badges}
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
          </>
        )}
      </button>

      {mobileLayout ? (
        <div
          className="cal-prog-card-mobile-actions"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          {badges}
          {statusActions}
        </div>
      ) : null}

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
