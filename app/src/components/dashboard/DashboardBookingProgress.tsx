"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useState } from "react";
import type { BookingProgressPlanner } from "@/lib/dashboard/booking-progress";
import {
  getBookingProgressDisplaySummary,
  refreshBookingProgressPlanner,
  sortBookingProgressPlanners,
} from "@/lib/dashboard/booking-progress";
import {
  buildBeachClubBookingRequestMessage,
  buildBookingRequestMessage,
  copyTextToClipboard,
  showsBookingRequestMessage,
} from "@/lib/dashboard/booking-request-message";
import { buildActivityPatchFromReservationItem } from "@/lib/planner/beach-club";
import {
  BOOKING_PROGRESS_TAP_OPTIONS,
  bookingProgressTapStatusClass,
  isBookingRequiringAction,
  sortBookingProgressItems,
  toBookingProgressTapStatus,
  type BookingProgressTapStatus,
  type ReservationStatusItem,
} from "@/lib/reservations/reservation-status";
import type { BookingStatus } from "@/lib/types";
import { formatGridDayDate, formatGridDayName } from "@/lib/planner-utils";

interface Props {
  initialPlanners: BookingProgressPlanner[];
  embedded?: boolean;
  expandedTripId?: number | null;
  onExpandedTripIdChange?: (tripId: number | null) => void;
  onPlannersChange?: (planners: BookingProgressPlanner[]) => void;
}

function formatItemMeta(item: ReservationStatusItem): string {
  const parts: string[] = [];
  if (item.date) {
    parts.push(`${formatGridDayName(item.date)} ${formatGridDayDate(item.date)}`);
  }
  if (item.time) parts.push(item.time.slice(0, 5));
  if (item.beachClubPart) {
    parts.push(item.beachClubPart === "sunbeds" ? "Sunbeds" : "Lunch");
  }
  return parts.join(" · ");
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`bp-card-chevron${open ? " is-open" : ""}`}
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden
    >
      <path
        d="M5 3.5L9 7L5 10.5"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function buildRequestMessage(
  planner: BookingProgressPlanner,
  item: ReservationStatusItem
): string {
  if (item.beachClubPart) {
    return buildBeachClubBookingRequestMessage({
      establishmentName: item.venue,
      date: item.date,
      sunbedsTime: planner.items.find(
        (row) =>
          row.activityId === item.activityId && row.beachClubPart === "sunbeds"
      )?.time,
      lunchTime: planner.items.find(
        (row) =>
          row.activityId === item.activityId && row.beachClubPart === "lunch"
      )?.time,
      clientName: planner.client_name,
      guestCount: planner.guest_count,
      clientPhone: planner.client_file.phone,
      clientEmail: planner.client_file.email,
    });
  }

  return buildBookingRequestMessage({
    establishmentName: item.venue,
    date: item.date,
    time: item.time,
    clientName: planner.client_name,
    guestCount: planner.guest_count,
    clientPhone: planner.client_file.phone,
    clientEmail: planner.client_file.email,
  });
}

function ProgressBar({
  percent,
  tone,
}: {
  percent: number;
  tone: BookingProgressPlanner["summary"]["progressTone"];
}) {
  return (
    <div
      className="bp-card-progress-track"
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${percent}% confirmed`}
    >
      <div
        className={`bp-card-progress-bar bp-card-progress-bar--${tone}`}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

function BookingStatusTap({
  value,
  onChange,
}: {
  value: BookingProgressTapStatus;
  onChange: (status: BookingProgressTapStatus) => void;
}) {
  return (
    <div
      className="bp-booking-status-tap"
      role="group"
      aria-label="Booking status"
    >
      {BOOKING_PROGRESS_TAP_OPTIONS.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            className={`bp-status-tap${active ? " is-active" : ""} ${bookingProgressTapStatusClass(option.value)}`}
            aria-pressed={active}
            onClick={() => {
              if (!active) onChange(option.value);
            }}
          >
            <span className="bp-status-tap-emoji" aria-hidden>
              {option.emoji}
            </span>
            <span className="bp-status-tap-label">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function BookingRow({
  item,
  copied,
  onCopyRequest,
  onStatusChange,
}: {
  item: ReservationStatusItem;
  copied: boolean;
  onCopyRequest: () => void;
  onStatusChange: (status: BookingProgressTapStatus) => void;
}) {
  const meta = formatItemMeta(item);
  const tapStatus = toBookingProgressTapStatus(item.booking_status);
  const showCopy = showsBookingRequestMessage(item.booking_status);

  return (
    <li className="bp-booking">
      <div className="bp-booking-head">
        <p className="bp-booking-venue">{item.venue}</p>
        {meta ? <p className="bp-booking-meta">{meta}</p> : null}
      </div>

      {showCopy ? (
        <button
          type="button"
          className={`bp-booking-copy${copied ? " is-copied" : ""}`}
          onClick={onCopyRequest}
        >
          {copied ? "✓ Copied" : "📋 Copy Request"}
        </button>
      ) : null}

      <BookingStatusTap value={tapStatus} onChange={onStatusChange} />
    </li>
  );
}

function PlannerCard({
  planner,
  isOpen,
  onToggle,
  copiedItemKey,
  onCopyRequest,
  onStatusChange,
}: {
  planner: BookingProgressPlanner;
  isOpen: boolean;
  onToggle: () => void;
  copiedItemKey: string | null;
  onCopyRequest: (itemKey: string) => void;
  onStatusChange: (
    tripId: number,
    item: ReservationStatusItem,
    status: BookingProgressTapStatus
  ) => void;
}) {
  const panelId = useId();
  const display = getBookingProgressDisplaySummary(planner.summary);
  const remainingLabel = display.isReady
    ? "🟢 READY"
    : `${planner.summary.remaining} booking${
        planner.summary.remaining === 1 ? "" : "s"
      } remaining`;
  const visibleItems = planner.items.filter((item) =>
    isBookingRequiringAction(item.booking_status)
  );

  return (
    <li className={`bp-card${isOpen ? " is-open" : ""}${display.isReady ? " bp-card--ready" : ""}`}>
      <button
        type="button"
        className="bp-card-trigger"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={onToggle}
      >
        <span className="bp-card-trigger-main">
          <ChevronIcon open={isOpen} />
          <span className="bp-card-copy">
            <span className="bp-card-client">{planner.client_name}</span>
            <span className="bp-card-destination">{planner.destination}</span>
            {planner.destination_subtitle ? (
              <span className="bp-card-destination-sub">
                {planner.destination_subtitle}
              </span>
            ) : null}
            <span className="bp-card-dates">{planner.dates}</span>
            {planner.guest_count ? (
              <span className="bp-card-guests">{planner.guest_count}</span>
            ) : null}
          </span>
        </span>
      </button>

      <div className="bp-card-summary">
        <ProgressBar percent={display.percent} tone={display.progressTone} />
        <p
          className={`bp-card-remaining${display.isReady ? " bp-card-remaining--ready" : ""}`}
        >
          {remainingLabel}
        </p>
      </div>

      <div
        id={panelId}
        className={`bp-card-panel${isOpen ? " is-open" : ""}`}
        aria-hidden={!isOpen}
        {...(!isOpen ? { inert: true } : {})}
      >
        <div className="bp-card-panel-inner">
          <div className="bp-card-panel-head">
            <Link href={planner.href} className="bp-card-planner-link btn-ghost">
              Open planner
            </Link>
          </div>
          {visibleItems.length === 0 ? (
            <p className="bp-booking-all-done">All bookings confirmed.</p>
          ) : (
            <ul className="bp-booking-list">
              {visibleItems.map((item) => (
                <BookingRow
                  key={item.itemKey}
                  item={item}
                  copied={copiedItemKey === item.itemKey}
                  onCopyRequest={() => onCopyRequest(item.itemKey)}
                  onStatusChange={(status) => {
                    onStatusChange(planner.tripId, item, status);
                  }}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </li>
  );
}

export function DashboardBookingProgress({
  initialPlanners,
  embedded = false,
  expandedTripId: expandedTripIdProp,
  onExpandedTripIdChange,
  onPlannersChange,
}: Props) {
  const [planners, setPlanners] = useState(initialPlanners);
  const [internalExpandedTripId, setInternalExpandedTripId] = useState<
    number | null
  >(null);
  const expandedTripId =
    expandedTripIdProp !== undefined
      ? expandedTripIdProp
      : internalExpandedTripId;
  const [copiedItemKey, setCopiedItemKey] = useState<string | null>(null);

  useEffect(() => {
    setPlanners(initialPlanners);
  }, [initialPlanners]);

  const setExpandedTripId = useCallback(
    (tripId: number | null) => {
      if (onExpandedTripIdChange) {
        onExpandedTripIdChange(tripId);
        return;
      }
      setInternalExpandedTripId(tripId);
    },
    [onExpandedTripIdChange]
  );

  const applyPlannerUpdate = useCallback(
    (
      tripId: number,
      updater: (items: ReservationStatusItem[]) => ReservationStatusItem[]
    ) => {
      setPlanners((current) => {
        const next = sortBookingProgressPlanners(
          current.map((planner) => {
            if (planner.tripId !== tripId) return planner;
            return refreshBookingProgressPlanner({
              ...planner,
              items: sortBookingProgressItems(updater(planner.items)),
            });
          })
        );
        onPlannersChange?.(next);
        return next;
      });
    },
    [onPlannersChange]
  );

  const patchItem = useCallback(
    async (
      tripId: number,
      item: ReservationStatusItem,
      status: BookingStatus
    ) => {
      const previousStatus = item.booking_status;

      applyPlannerUpdate(tripId, (items) =>
        items.map((row) =>
          row.itemKey === item.itemKey
            ? { ...row, booking_status: status }
            : row
        )
      );

      try {
        const body = buildActivityPatchFromReservationItem(item, {
          booking_status: status,
        });
        const res = await fetch(`/api/activities/${item.activityId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          applyPlannerUpdate(tripId, (items) =>
            items.map((row) =>
              row.itemKey === item.itemKey
                ? { ...row, booking_status: previousStatus }
                : row
            )
          );
        }
      } catch {
        applyPlannerUpdate(tripId, (items) =>
          items.map((row) =>
            row.itemKey === item.itemKey
              ? { ...row, booking_status: previousStatus }
              : row
          )
        );
      }
    },
    [applyPlannerUpdate]
  );

  const togglePlanner = useCallback(
    (tripId: number) => {
      setExpandedTripId(expandedTripId === tripId ? null : tripId);
    },
    [expandedTripId, setExpandedTripId]
  );

  const handleCopyRequest = useCallback(
    (planner: BookingProgressPlanner, itemKey: string) => {
      const item = planner.items.find((row) => row.itemKey === itemKey);
      if (!item) return;

      void copyTextToClipboard(buildRequestMessage(planner, item)).then((ok) => {
        if (!ok) return;
        setCopiedItemKey(itemKey);
        window.setTimeout(() => {
          setCopiedItemKey((current) => (current === itemKey ? null : current));
        }, 2000);
      });
    },
    []
  );

  if (!embedded && planners.length === 0) return null;

  const content =
    planners.length === 0 ? (
      <p className="dash-accordion-empty text-sm text-muted">
        No active planners with bookings to complete.
      </p>
    ) : (
      <ul className="bp-list">
        {planners.map((planner) => (
          <PlannerCard
            key={planner.tripId}
            planner={planner}
            isOpen={expandedTripId === planner.tripId}
            onToggle={() => togglePlanner(planner.tripId)}
            copiedItemKey={copiedItemKey}
            onCopyRequest={(itemKey) => handleCopyRequest(planner, itemKey)}
            onStatusChange={(tripId, item, status) => {
              void patchItem(tripId, item, status);
            }}
          />
        ))}
      </ul>
    );

  if (embedded) {
    return (
      <div className="dash-embedded-section dash-booking-progress-embedded">
        {content}
      </div>
    );
  }

  return (
    <section className="mb-10 dash-booking-progress" data-section="planner">
      <div className="dash-booking-progress-head">
        <div>
          <h2 className="section-title">Bookings Progress</h2>
          <p className="dash-booking-progress-lead">
            Manage live booking requests for confirmed programmes.
          </p>
        </div>
        <Link href="/calendar" className="btn-ghost">
          Calendar
        </Link>
      </div>
      {content}
    </section>
  );
}
