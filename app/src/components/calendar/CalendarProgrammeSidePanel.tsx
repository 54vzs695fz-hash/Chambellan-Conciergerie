"use client";

import type { ReactNode } from "react";
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
  mobileFullScreen?: boolean;
  onClose: () => void;
  onSelectProgramme: (programme: CalendarProgramme) => void;
  onStatusChange: (id: number, status: TripFollowUpStatus) => void;
  onPaymentStatusChange: (status: TripPaymentStatus) => void;
  onMarkDone: (id: number) => Promise<void>;
  onPatchItem: (id: number, fields: Partial<ChecklistItem>) => Promise<void>;
}

function panelClassName(mobileFullScreen: boolean): string {
  return mobileFullScreen
    ? "cal-side-panel cal-side-panel--mobile-full"
    : "cal-side-panel";
}

function MobilePanelChrome({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <>
      <button
        type="button"
        className="cal-mobile-panel-backdrop"
        onClick={onClose}
        aria-label="Close programme details"
      />
      <div className="cal-mobile-panel-topbar">
        <p className="cal-mobile-panel-topbar-title">{title}</p>
        <button
          type="button"
          className="cal-mobile-panel-close min-h-[44px]"
          onClick={onClose}
        >
          Close
        </button>
      </div>
      {children}
    </>
  );
}

function ProgrammeHero({
  programme,
  mobileFullScreen,
  onClose,
  updatingPaymentId,
  paymentError,
  onPaymentStatusChange,
}: {
  programme: CalendarProgramme;
  mobileFullScreen: boolean;
  onClose: () => void;
  updatingPaymentId: number | null;
  paymentError: string | null;
  onPaymentStatusChange: (status: TripPaymentStatus) => void;
}) {
  return (
    <div className="cal-side-hero">
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
        {!mobileFullScreen ? (
          <button
            type="button"
            className="cal-side-close min-h-[44px] min-w-[44px]"
            onClick={onClose}
            aria-label="Close panel"
          >
            ×
          </button>
        ) : null}
      </div>

      <div className="cal-side-section cal-side-section--hero-badges">
        <CalendarProgrammeBadges
          programme={programme}
          showFollowUpDot
          paymentUpdating={updatingPaymentId === programme.id}
          paymentError={paymentError}
          onPaymentStatusChange={onPaymentStatusChange}
        />
      </div>

      {mobileFullScreen ? (
        <div className="cal-side-actions cal-side-actions--hero">
          <Link href={programme.plannerHref} className="cal-side-planner-link">
            Open planner
          </Link>
        </div>
      ) : null}
    </div>
  );
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
  mobileFullScreen = false,
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
    const dayPanel = (
      <aside
        className={panelClassName(mobileFullScreen)}
        aria-label="Programmes for day"
        role={mobileFullScreen ? "dialog" : undefined}
        aria-modal={mobileFullScreen ? true : undefined}
      >
        {mobileFullScreen ? (
          <MobilePanelChrome title="Programmes" onClose={onClose}>
            <div className="cal-mobile-panel-body">
              <div className="cal-mobile-panel-scroll">
                <div className="cal-side-header cal-side-header--day">
                  <div>
                    <p className="cal-side-kicker">Selected day</p>
                    <h2 className="cal-side-title">
                      {formatDayShort(dayDate)} {formatDayNum(dayDate)}
                    </h2>
                    <p className="cal-side-meta">
                      {dayProgrammes.length} programme
                      {dayProgrammes.length === 1 ? "" : "s"}
                    </p>
                  </div>
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
              </div>
            </div>
          </MobilePanelChrome>
        ) : (
          <>
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
          </>
        )}
      </aside>
    );

    return dayPanel;
  }

  if (!programme) return null;

  const followUpPanel = (
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
  );

  if (mobileFullScreen) {
    return (
      <aside
        className={panelClassName(true)}
        aria-label="Programme details"
        role="dialog"
        aria-modal
      >
        <MobilePanelChrome title="Programme details" onClose={onClose}>
          <div className="cal-mobile-panel-body">
            <ProgrammeHero
              programme={programme}
              mobileFullScreen
              onClose={onClose}
              updatingPaymentId={updatingPaymentId}
              paymentError={paymentError}
              onPaymentStatusChange={onPaymentStatusChange}
            />
            <div className="cal-mobile-panel-scroll">
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

              {followUpPanel}
            </div>
          </div>
        </MobilePanelChrome>
      </aside>
    );
  }

  return (
    <aside className={panelClassName(false)} aria-label="Programme details">
      <ProgrammeHero
        programme={programme}
        mobileFullScreen={false}
        onClose={onClose}
        updatingPaymentId={updatingPaymentId}
        paymentError={paymentError}
        onPaymentStatusChange={onPaymentStatusChange}
      />

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

      {followUpPanel}
    </aside>
  );
}
