"use client";

import { useMemo } from "react";
import {
  BOOKING_STATUS_LABELS,
  BOOKING_STATUS_OPTIONS,
  buildReservationStatusItems,
  formatBookingStatusSummary,
  type ReservationStatusItem,
} from "@/lib/reservations/reservation-status";
import type { BookingStatus, TripDay } from "@/lib/types";
import { formatGridDayDate, formatGridDayName } from "@/lib/planner-utils";

interface Props {
  days?: TripDay[];
  items?: ReservationStatusItem[];
  summary?: string;
  loading?: boolean;
  updatingId?: string | null;
  onPatchBookingStatus: (
    item: ReservationStatusItem,
    booking_status: BookingStatus
  ) => void | Promise<void>;
  variant?: "calendar" | "planner";
}

function formatReservationDate(date: string): string {
  if (!date) return "";
  const dayName = formatGridDayName(date);
  const dayDate = formatGridDayDate(date);
  return `${dayName} ${dayDate}`;
}

function formatReservationTime(time: string): string {
  if (!time) return "—";
  return time.slice(0, 5);
}

export function ReservationsStatusPanel({
  days,
  items: itemsProp,
  summary: summaryProp,
  loading = false,
  updatingId = null,
  onPatchBookingStatus,
  variant = "calendar",
}: Props) {
  const items = useMemo(() => {
    if (itemsProp) return itemsProp;
    if (days) return buildReservationStatusItems(days);
    return [];
  }, [days, itemsProp]);

  const summary = useMemo(() => {
    if (summaryProp !== undefined) return summaryProp;
    return formatBookingStatusSummary(items);
  }, [items, summaryProp]);

  const title =
    variant === "planner" ? "Reservations Status" : "Reservations Status";

  if (loading) {
    return (
      <section className="rs-panel" aria-label={title}>
        <p className="rs-loading">Loading reservations…</p>
      </section>
    );
  }

  return (
    <section className="rs-panel" aria-label={title}>
      <div className="rs-header">
        <h3 className="rs-title">{title}</h3>
        {summary ? <p className="rs-summary">{summary}</p> : null}
      </div>

      {items.length === 0 ? (
        <p className="rs-empty">
          No reservation activities yet. Add restaurants, beach clubs, clubs,
          events, or activities in the planner to track bookings here.
        </p>
      ) : (
        <ul className="rs-list">
          {items.map((item) => (
            <li key={item.itemKey} className="rs-item">
              <div className="rs-item-main">
                <select
                  className="rs-status"
                  value={item.booking_status}
                  disabled={updatingId === item.itemKey}
                  onChange={(e) =>
                    void onPatchBookingStatus(
                      item,
                      e.target.value as BookingStatus
                    )
                  }
                  aria-label={`Booking status for ${item.venue}${
                    item.beachClubPart
                      ? ` · ${item.beachClubPart === "sunbeds" ? "Sunbeds" : "Lunch"}`
                      : ""
                  }`}
                >
                  {BOOKING_STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {BOOKING_STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>
                <div className="rs-item-copy">
                  <span className="rs-venue">{item.venue}</span>
                  <span className="rs-meta">
                    {formatReservationDate(item.date)}
                    {item.beachClubPart ? (
                      <>
                        {" · "}
                        <span className="rs-beach-part">
                          {item.beachClubPart === "sunbeds" ? "Sunbeds" : "Lunch"}
                        </span>
                      </>
                    ) : null}
                    {" · "}
                    {formatReservationTime(item.time)}
                    {" · "}
                    {item.categoryLabel}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
