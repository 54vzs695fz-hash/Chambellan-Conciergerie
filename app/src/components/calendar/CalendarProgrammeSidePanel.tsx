"use client";

import Link from "next/link";
import { formatDateRange } from "@/lib/planner-utils";
import { PlannerArrivalCountdown } from "@/components/planner/PlannerArrivalCountdown";
import { CalendarQuickActions } from "@/components/calendar/CalendarQuickActions";
import { CalendarProgrammeBadges } from "@/components/calendar/CalendarProgrammeBadges";
import { CalendarProgrammeChip } from "@/components/calendar/CalendarProgrammeChip";
import { CalendarProgrammeFollowUpPanel } from "@/components/calendar/CalendarProgrammeFollowUpPanel";
import { formatDayNum, formatDayShort } from "@/lib/calendar/programmes";
import type { CalendarProgramme } from "@/lib/calendar/programmes";
import type { ChecklistItem, TripFollowUpStatus, TripPaymentStatus } from "@/lib/types";

interface Props {
  programme: CalendarProgramme | null;
  dayProgrammes: CalendarProgramme[] | null;
  dayDate: Date | null;
  today: Date;
  checklistSummary: string | null;
  updatingId: number | null;
  updatingPaymentId: number | null;
  paymentError: string | null;
  checklistUpdatingId: number | null;
  onClose: () => void;
  onSelectProgramme: (programme: CalendarProgramme) => void;
  onStatusChange: (id: number, status: TripFollowUpStatus) => void;
  onPaymentStatusChange: (status: TripPaymentStatus) => void;
  onMarkDone: (id: number) => Promise<void>;
  onPatchItem: (id: number, fields: Partial<ChecklistItem>) => Promise<void>;
}

export function CalendarProgrammeSidePanel({
  programme,
  dayProgrammes,
  dayDate,
  today,
  checklistSummary,
  updatingId,
  updatingPaymentId,
  paymentError,
  checklistUpdatingId,
  onClose,
  onSelectProgramme,
  onStatusChange,
  onPaymentStatusChange,
  onMarkDone,
  onPatchItem,
}: Props) {
  const open = programme !== null || (dayProgrammes !== null && dayDate !== null);

  if (!open) return null;

  if (!programme && dayProgrammes && dayDate) {
    return (
      <aside className="cal-side-panel" aria-label="Programmes for day">
        <div className="cal-side-header">
          <div>
            <p className="cal-side-kicker">Programmes</p>
            <h2 className="cal-side-title">
              {formatDayShort(dayDate)} {formatDayNum(dayDate)}
            </h2>
            <p className="cal-side-meta">
              {dayProgrammes.length} programme
              {dayProgrammes.length === 1 ? "" : "s"}
            </p>
          </div>
          <button
            type="button"
            className="cal-side-close min-h-[44px] min-w-[44px]"
            onClick={onClose}
            aria-label="Close panel"
          >
            ×
          </button>
        </div>
        <ul className="cal-side-day-list">
          {dayProgrammes.map((p) => (
            <li key={p.id}>
              <CalendarProgrammeChip
                programme={p}
                onClick={() => onSelectProgramme(p)}
              />
            </li>
          ))}
        </ul>
      </aside>
    );
  }

  if (!programme) return null;

  return (
    <aside className="cal-side-panel" aria-label="Programme details">
      <div className="cal-side-header">
        <div>
          <p className="cal-side-kicker">{programme.clientName}</p>
          <h2 className="cal-side-title font-serif text-gold tracking-wide">
            {programme.destination}
          </h2>
          <p className="cal-side-meta">
            {formatDateRange(programme.arrivalDate, programme.departureDate)}
            {programme.guestCount ? ` · ${programme.guestCount}` : ""}
          </p>
          <PlannerArrivalCountdown
            arrivalDate={programme.arrivalDate}
            departureDate={programme.departureDate}
          />
        </div>
        <button
          type="button"
          className="cal-side-close min-h-[44px] min-w-[44px]"
          onClick={onClose}
          aria-label="Close panel"
        >
          ×
        </button>
      </div>

      <div className="cal-side-section">
        <CalendarProgrammeBadges
          programme={programme}
          showFollowUpDot
          paymentUpdating={updatingPaymentId === programme.id}
          paymentError={paymentError}
          onPaymentStatusChange={onPaymentStatusChange}
        />
      </div>

      <div className="cal-side-section">
        <p className="cal-side-label">Update status</p>
        <CalendarQuickActions
          programme={programme}
          updating={updatingId === programme.id}
          onStatusChange={onStatusChange}
        />
      </div>

      {checklistSummary ? (
        <p className="cal-side-checklist-summary">{checklistSummary}</p>
      ) : null}

      <div className="cal-side-actions">
        <Link href={programme.plannerHref} className="cal-side-planner-link">
          Open planner
        </Link>
      </div>

      <CalendarProgrammeFollowUpPanel
        programme={programme}
        today={today}
        updatingId={checklistUpdatingId}
        updatingPaymentId={updatingPaymentId}
        paymentError={paymentError}
        onClose={onClose}
        onMarkDone={onMarkDone}
        onPatchItem={onPatchItem}
        onPaymentStatusChange={onPaymentStatusChange}
        variant="embedded"
      />
    </aside>
  );
}
