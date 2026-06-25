"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { PaymentStatusBadge } from "@/components/status/PaymentStatusBadge";
import type { BookingProgressPlanner } from "@/lib/dashboard/booking-progress";
import {
  BOOKING_ASSIGNEE_LABELS,
  BOOKING_ASSIGNEE_OPTIONS,
  BOOKING_PROGRESS_STATUS_LABELS,
  BOOKING_PROGRESS_STATUS_OPTIONS,
  isBookingProgressComplete,
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

function bookingProgressStatusClass(
  status: ReturnType<typeof toBookingProgressStatus>
): string {
  if (status === "confirmed" || status === "paid") return "bp-status--done";
  if (status === "request_sent") return "bp-status--pending";
  if (status === "cancelled") return "bp-status--cancelled";
  return "bp-status--todo";
}

export function DashboardBookingProgress({
  initialPlanners,
  embedded = false,
}: Props) {
  const [planners, setPlanners] = useState(initialPlanners);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

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

        setPlanners((current) => {
          const next = current
            .map((planner) => {
              if (planner.tripId !== tripId) return planner;
              const items = planner.items.map((item) =>
                item.activityId === activityId ? { ...item, ...patch } : item
              );
              return { ...planner, items };
            })
            .filter((planner) =>
              planner.items.some(
                (item) => !isBookingProgressComplete(item.booking_status)
              )
            );
          return next;
        });
      } finally {
        setUpdatingId(null);
      }
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
      <ul className="dash-booking-progress-list">
        {planners.map((planner) => (
          <li key={planner.tripId}>
            <article className="dash-card dash-card--follow-up dash-booking-progress-card">
              <div className="dash-booking-progress-card-head">
                <div className="dash-booking-progress-card-meta">
                  <p className="dash-booking-progress-client">
                    {planner.client_name}
                    <span className="dash-booking-progress-sep">·</span>
                    {planner.destination}
                  </p>
                  <p className="dash-booking-progress-dates">{planner.dates}</p>
                </div>
                <div className="dash-booking-progress-card-badges">
                  <PaymentStatusBadge
                    status={planner.payment_status}
                    arrivalDate={planner.arrival_date}
                    detail={planner.payment_detail}
                  />
                  <Link href={planner.href} className="btn-ghost dash-booking-progress-open">
                    Open planner
                  </Link>
                </div>
              </div>

              <ul className="dash-booking-progress-items">
                {planner.items.map((item) => {
                  const progressStatus = toBookingProgressStatus(
                    item.booking_status
                  );

                  return (
                    <li key={item.activityId} className="dash-booking-progress-item">
                      <div className="dash-booking-progress-item-main">
                        <p className="dash-booking-progress-venue">{item.venue}</p>
                        <p className="dash-booking-progress-item-meta">
                          {formatItemDate(item.date)}
                          {" · "}
                          {formatItemTime(item.time)}
                          {" · "}
                          {item.categoryLabel}
                        </p>
                      </div>

                      <div className="dash-booking-progress-item-controls">
                        <label className="dash-booking-progress-field">
                          <span className="dash-booking-progress-label">Status</span>
                          <select
                            className={`dash-booking-progress-select ${bookingProgressStatusClass(progressStatus)}`}
                            value={progressStatus}
                            disabled={updatingId === item.activityId}
                            onChange={(event) => {
                              const next = event.target
                                .value as (typeof BOOKING_PROGRESS_STATUS_OPTIONS)[number];
                              void patchItem(planner.tripId, item.activityId, {
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
                              void patchItem(planner.tripId, item.activityId, {
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
                              const value = event.target.value;
                              setPlanners((current) =>
                                current.map((p) =>
                                  p.tripId !== planner.tripId
                                    ? p
                                    : {
                                        ...p,
                                        items: p.items.map((row) =>
                                          row.activityId === item.activityId
                                            ? { ...row, booking_notes: value }
                                            : row
                                        ),
                                      }
                                )
                              );
                            }}
                            onBlur={(event) => {
                              const value = event.target.value.trim();
                              if (value === item.booking_notes) return;
                              void patchItem(planner.tripId, item.activityId, {
                                booking_notes: value,
                              });
                            }}
                          />
                        </label>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </article>
          </li>
        ))}
      </ul>
    );

  if (embedded) {
    return (
      <div className="dash-embedded-section dash-booking-progress-embedded">
        <p className="dash-booking-progress-lead dash-booking-progress-lead--embedded">
          Internal follow-up after client programme confirmation — assign and track
          each reservation until fully booked.
        </p>
        {content}
      </div>
    );
  }

  return (
    <section className="mb-10 dash-booking-progress" data-section="planner">
      <div className="dash-booking-progress-head">
        <div>
          <h2 className="section-title">Booking Progress</h2>
          <p className="dash-booking-progress-lead">
            Internal follow-up after client programme confirmation — assign and
            track each reservation until fully booked.
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
