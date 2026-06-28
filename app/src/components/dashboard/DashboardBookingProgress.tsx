"use client";

import Link from "next/link";
import { useCallback, useId, useState } from "react";
import { PaymentStatusBadge } from "@/components/status/PaymentStatusBadge";
import type { BookingProgressPlanner } from "@/lib/dashboard/booking-progress";
import {
  buildBookingRequestMessage,
  copyTextToClipboard,
  showsBookingRequestMessage,
} from "@/lib/dashboard/booking-request-message";
import {
  reconcileBookingProgressPlanner,
  sortBookingProgressPlanners,
} from "@/lib/dashboard/booking-progress";
import {
  BOOKING_ASSIGNEE_LABELS,
  BOOKING_ASSIGNEE_OPTIONS,
  BOOKING_PROGRESS_STATUS_LABELS,
  BOOKING_PROGRESS_STATUS_OPTIONS,
  PLANNER_BOOKING_PRIORITY_LABELS,
  bookingProgressStatusClass,
  sortBookingProgressItems,
  toBookingProgressStatus,
  type ReservationStatusItem,
} from "@/lib/reservations/reservation-status";
import type { BookingStatus } from "@/lib/types";
import { formatGridDayDate, formatGridDayName } from "@/lib/planner-utils";

interface Props {
  initialPlanners: BookingProgressPlanner[];
  embedded?: boolean;
}

function formatItemDate(date: string): string {
  if (!date) return "";
  return `${formatGridDayName(date)} ${formatGridDayDate(date)}`;
}

function formatItemTime(time: string): string {
  if (!time) return "—";
  return time.slice(0, 5);
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`dash-bp-planner-chevron${open ? " is-open" : ""}`}
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

function plannerListTone(
  planner: BookingProgressPlanner
): "urgent" | "pending" | "confirmed" {
  if (planner.summary.priority === "high") return "urgent";
  if (planner.summary.remaining > 0) return "pending";
  return "confirmed";
}

function PlannerPriorityBadge({
  priority,
}: {
  priority: BookingProgressPlanner["summary"]["priority"];
}) {
  return (
    <span className={`dash-booking-progress-priority bp-priority--${priority}`}>
      <span className="dash-booking-progress-priority-dot" aria-hidden />
      {PLANNER_BOOKING_PRIORITY_LABELS[priority]}
    </span>
  );
}

function BookingProgressItemRow({
  item,
  planner,
  tripId,
  updatingId,
  copied,
  onCopyMessage,
  onOpenClientFile,
  onPatch,
  onNotesChange,
}: {
  item: ReservationStatusItem;
  planner: BookingProgressPlanner;
  tripId: number;
  updatingId: number | null;
  copied: boolean;
  onCopyMessage: () => void;
  onOpenClientFile: () => void;
  onPatch: (
    tripId: number,
    activityId: number,
    patch: Partial<
      Pick<ReservationStatusItem, "booking_status" | "assigned_to" | "booking_notes">
    >
  ) => void;
  onNotesChange: (tripId: number, activityId: number, value: string) => void;
}) {
  const progressStatus = toBookingProgressStatus(item.booking_status);
  const statusClass = bookingProgressStatusClass(item.booking_status);
  const showRequestActions = showsBookingRequestMessage(item.booking_status);

  return (
    <li className={`dash-booking-progress-item ${statusClass}`}>
      <div className="dash-booking-progress-item-main">
        <p className="dash-booking-progress-venue">
          <span className="dash-booking-progress-status-dot" aria-hidden />
          {item.venue}
        </p>
        <p className="dash-booking-progress-item-meta">
          {formatItemDate(item.date)}
          {" · "}
          {formatItemTime(item.time)}
          {" · "}
          {item.categoryLabel}
        </p>
        {showRequestActions ? (
          <div className="dash-bp-request-actions">
            <button
              type="button"
              className={`dash-bp-copy-message-btn${copied ? " is-copied" : ""}`}
              onClick={onCopyMessage}
            >
              {copied ? "Copied" : "Copy message"}
            </button>
            <button
              type="button"
              className="dash-bp-client-file-btn dash-bp-client-file-btn--inline"
              onClick={onOpenClientFile}
            >
              Open client file
            </button>
          </div>
        ) : null}
      </div>

      <div className="dash-booking-progress-item-controls">
        <label className="dash-booking-progress-field">
          <span className="dash-booking-progress-label">Status</span>
          <select
            className={`dash-booking-progress-select ${statusClass}`}
            value={progressStatus}
            disabled={updatingId === item.activityId}
            onChange={(event) => {
              const next = event.target
                .value as (typeof BOOKING_PROGRESS_STATUS_OPTIONS)[number];
              onPatch(tripId, item.activityId, {
                booking_status: next as BookingStatus,
              });
            }}
          >
            {BOOKING_PROGRESS_STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {BOOKING_PROGRESS_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </label>

        <label className="dash-booking-progress-field">
          <span className="dash-booking-progress-label">Assigned</span>
          <select
            className="dash-booking-progress-select"
            value={item.assigned_to}
            disabled={updatingId === item.activityId}
            onChange={(event) => {
              onPatch(tripId, item.activityId, {
                assigned_to: event.target.value,
              });
            }}
          >
            {BOOKING_ASSIGNEE_OPTIONS.map((assignee) => (
              <option key={assignee || "none"} value={assignee}>
                {BOOKING_ASSIGNEE_LABELS[assignee]}
              </option>
            ))}
          </select>
        </label>

        <label className="dash-booking-progress-field dash-booking-progress-field--notes">
          <span className="dash-booking-progress-label">Notes</span>
          <input
            type="text"
            className="dash-booking-progress-notes"
            value={item.booking_notes}
            placeholder="Internal booking notes"
            disabled={updatingId === item.activityId}
            onChange={(event) => {
              onNotesChange(tripId, item.activityId, event.target.value);
            }}
            onBlur={(event) => {
              const value = event.target.value.trim();
              if (value === item.booking_notes) return;
              onPatch(tripId, item.activityId, { booking_notes: value });
            }}
          />
        </label>
      </div>
    </li>
  );
}

function ClientFilePanel({
  planner,
}: {
  planner: BookingProgressPlanner;
}) {
  const { client_file: file } = planner;
  const emailMissing = file.email === "Missing email";
  const phoneMissing = file.phone === "Missing phone";

  return (
    <div className="dash-bp-client-file-panel">
      <dl className="dash-bp-client-file-list">
        <div className="dash-bp-client-file-row">
          <dt>Email</dt>
          <dd className={emailMissing ? "is-missing" : undefined}>{file.email}</dd>
        </div>
        <div className="dash-bp-client-file-row">
          <dt>Phone</dt>
          <dd className={phoneMissing ? "is-missing" : undefined}>{file.phone}</dd>
        </div>
        {file.nationality ? (
          <div className="dash-bp-client-file-row">
            <dt>Nationality</dt>
            <dd>{file.nationality}</dd>
          </div>
        ) : null}
        {file.notes ? (
          <div className="dash-bp-client-file-row dash-bp-client-file-row--notes">
            <dt>Notes</dt>
            <dd>{file.notes}</dd>
          </div>
        ) : null}
      </dl>
      {file.profile_href ? (
        <Link href={file.profile_href} className="dash-bp-client-file-link btn-ghost">
          Open client profile
        </Link>
      ) : null}
    </div>
  );
}

function BookingProgressPlannerCard({
  planner,
  isOpen,
  isClientFileOpen,
  onToggle,
  onToggleClientFile,
  onOpenClientFile,
  copiedActivityId,
  onCopyMessage,
  updatingId,
  onPatch,
  onNotesChange,
}: {
  planner: BookingProgressPlanner;
  isOpen: boolean;
  isClientFileOpen: boolean;
  onToggle: () => void;
  onToggleClientFile: () => void;
  onOpenClientFile: () => void;
  copiedActivityId: number | null;
  onCopyMessage: (activityId: number) => void;
  updatingId: number | null;
  onPatch: (
    tripId: number,
    activityId: number,
    patch: Partial<
      Pick<ReservationStatusItem, "booking_status" | "assigned_to" | "booking_notes">
    >
  ) => void;
  onNotesChange: (tripId: number, activityId: number, value: string) => void;
}) {
  const panelId = useId();
  const listTone = plannerListTone(planner);
  const remainingLabel = `${planner.summary.remaining} booking${
    planner.summary.remaining === 1 ? "" : "s"
  } remaining`;

  return (
    <li
      className={`dash-bp-planner-section bp-list-tone--${listTone}${
        isOpen ? " is-open" : ""
      }${isClientFileOpen ? " is-client-file-open" : ""}`}
    >
      <div className="dash-bp-planner-card-top">
        <button
          type="button"
          className="dash-bp-planner-trigger"
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={onToggle}
        >
          <span className="dash-bp-planner-trigger-main">
            <ChevronIcon open={isOpen} />
            <span className="dash-bp-planner-trigger-copy">
              <span className="dash-booking-progress-client">
                {planner.client_name}
                <span className="dash-booking-progress-sep">·</span>
                {planner.destination}
              </span>
              {planner.destination_subtitle ? (
                <span className="dash-booking-progress-destination-sub">
                  {planner.destination_subtitle}
                </span>
              ) : null}
              <span className="dash-booking-progress-dates">{planner.dates}</span>
              {planner.guest_count ? (
                <span className="dash-bp-planner-guests">{planner.guest_count}</span>
              ) : null}
              <span className="dash-bp-planner-remaining">{remainingLabel}</span>
            </span>
          </span>
          <PlannerPriorityBadge priority={planner.summary.priority} />
        </button>

        <button
          type="button"
          className={`dash-bp-client-file-btn${isClientFileOpen ? " is-active" : ""}`}
          aria-expanded={isClientFileOpen}
          onClick={(event) => {
            event.stopPropagation();
            onToggleClientFile();
          }}
        >
          Client file
        </button>
      </div>

      {isClientFileOpen ? <ClientFilePanel planner={planner} /> : null}

      <div
        id={panelId}
        className={`dash-bp-planner-panel${isOpen ? " is-open" : ""}`}
        aria-hidden={!isOpen}
        {...(!isOpen ? { inert: true } : {})}
      >
        <div className="dash-bp-planner-panel-inner">
          <div className="dash-bp-planner-panel-head">
            <PaymentStatusBadge
              status={planner.payment_status}
              arrivalDate={planner.arrival_date}
              detail={planner.payment_detail}
            />
            <Link href={planner.href} className="btn-ghost dash-booking-progress-open">
              Open planner
            </Link>
          </div>

          <ul className="dash-booking-progress-items">
            {planner.items.map((item) => (
              <BookingProgressItemRow
                key={item.activityId}
                item={item}
                planner={planner}
                tripId={planner.tripId}
                updatingId={updatingId}
                copied={copiedActivityId === item.activityId}
                onCopyMessage={() => onCopyMessage(item.activityId)}
                onOpenClientFile={onOpenClientFile}
                onPatch={onPatch}
                onNotesChange={onNotesChange}
              />
            ))}
          </ul>
        </div>
      </div>
    </li>
  );
}

export function DashboardBookingProgress({
  initialPlanners,
  embedded = false,
}: Props) {
  const [planners, setPlanners] = useState(initialPlanners);
  const [expandedTripId, setExpandedTripId] = useState<number | null>(null);
  const [clientFileTripId, setClientFileTripId] = useState<number | null>(null);
  const [copiedActivityId, setCopiedActivityId] = useState<number | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const applyPlannerUpdate = useCallback(
    (tripId: number, updater: (items: ReservationStatusItem[]) => ReservationStatusItem[]) => {
      setPlanners((current) => {
        const next = sortBookingProgressPlanners(
          current
            .map((planner) => {
              if (planner.tripId !== tripId) return planner;
              return reconcileBookingProgressPlanner({
                ...planner,
                items: sortBookingProgressItems(updater(planner.items)),
              });
            })
            .filter((planner): planner is BookingProgressPlanner => planner !== null)
        );

        if (expandedTripId !== null && !next.some((p) => p.tripId === expandedTripId)) {
          setExpandedTripId(null);
        }
        if (clientFileTripId !== null && !next.some((p) => p.tripId === clientFileTripId)) {
          setClientFileTripId(null);
        }

        return next;
      });
    },
    [expandedTripId, clientFileTripId]
  );

  const handleNotesChange = useCallback(
    (tripId: number, activityId: number, value: string) => {
      setPlanners((current) =>
        current.map((planner) =>
          planner.tripId !== tripId
            ? planner
            : {
                ...planner,
                items: sortBookingProgressItems(
                  planner.items.map((row) =>
                    row.activityId === activityId
                      ? { ...row, booking_notes: value }
                      : row
                  )
                ),
              }
        )
      );
    },
    []
  );

  const patchItem = useCallback(
    async (
      tripId: number,
      activityId: number,
      patch: Partial<
        Pick<ReservationStatusItem, "booking_status" | "assigned_to" | "booking_notes">
      >
    ) => {
      setUpdatingId(activityId);
      try {
        const res = await fetch(`/api/activities/${activityId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        if (!res.ok) return;

        applyPlannerUpdate(tripId, (items) =>
          items.map((item) =>
            item.activityId === activityId ? { ...item, ...patch } : item
          )
        );
      } finally {
        setUpdatingId(null);
      }
    },
    [applyPlannerUpdate]
  );

  const togglePlanner = useCallback((tripId: number) => {
    setExpandedTripId((current) => (current === tripId ? null : tripId));
  }, []);

  const toggleClientFile = useCallback((tripId: number) => {
    setClientFileTripId((current) => (current === tripId ? null : tripId));
  }, []);

  const openClientFile = useCallback((tripId: number) => {
    setExpandedTripId(tripId);
    setClientFileTripId(tripId);
  }, []);

  const handleCopyMessage = useCallback(
    (planner: BookingProgressPlanner, activityId: number) => {
      const item = planner.items.find((row) => row.activityId === activityId);
      if (!item) return;

      const message = buildBookingRequestMessage({
        establishmentName: item.venue,
        date: item.date,
        time: item.time,
        clientName: planner.client_name,
        guestCount: planner.guest_count,
        clientPhone: planner.client_file.phone,
        clientEmail: planner.client_file.email,
      });

      void copyTextToClipboard(message).then((ok) => {
        if (!ok) return;
        setCopiedActivityId(activityId);
        window.setTimeout(() => {
          setCopiedActivityId((current) =>
            current === activityId ? null : current
          );
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
      <ul className="dash-bp-planner-list">
        {planners.map((planner) => (
          <BookingProgressPlannerCard
            key={planner.tripId}
            planner={planner}
            isOpen={expandedTripId === planner.tripId}
            isClientFileOpen={clientFileTripId === planner.tripId}
            onToggle={() => togglePlanner(planner.tripId)}
            onToggleClientFile={() => toggleClientFile(planner.tripId)}
            onOpenClientFile={() => openClientFile(planner.tripId)}
            copiedActivityId={copiedActivityId}
            onCopyMessage={(activityId) => handleCopyMessage(planner, activityId)}
            updatingId={updatingId}
            onPatch={(tripId, activityId, patch) => {
              void patchItem(tripId, activityId, patch);
            }}
            onNotesChange={handleNotesChange}
          />
        ))}
      </ul>
    );

  if (embedded) {
    return (
      <div className="dash-embedded-section dash-booking-progress-embedded">
        <p className="dash-booking-progress-lead dash-booking-progress-lead--embedded">
          Select a client to view and update their reservations.
        </p>
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
            Select a client to view and update their reservations.
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
