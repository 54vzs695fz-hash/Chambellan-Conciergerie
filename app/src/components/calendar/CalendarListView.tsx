"use client";

import Link from "next/link";
import { formatDateRange } from "@/lib/planner-utils";
import { FOLLOW_UP_ACTIONS } from "@/lib/calendar/follow-up";
import {
  FOLLOW_UP_STATUS_LABELS,
  type CalendarProgramme,
} from "@/lib/calendar/programmes";
import type { TripFollowUpStatus } from "@/lib/types";

interface Props {
  programmes: CalendarProgramme[];
  updatingId: number | null;
  onStatusChange: (id: number, status: TripFollowUpStatus) => void;
}

export function CalendarListView({
  programmes,
  updatingId,
  onStatusChange,
}: Props) {
  if (programmes.length === 0) {
    return <p className="cal-empty">No programmes match your filters.</p>;
  }

  const sorted = [...programmes].sort((a, b) =>
    a.arrivalDate.localeCompare(b.arrivalDate)
  );

  return (
    <div className="cal-list">
      {sorted.map((p) => (
        <article key={p.id} className="cal-list-card">
          <Link href={p.plannerHref} className="block">
            <div className="cal-list-top">
              <span className="cal-list-destination">{p.destination}</span>
              <span
                className={`cal-list-status${p.followUpStatus === "follow_up" ? " is-follow-up" : ""}`}
              >
                {FOLLOW_UP_STATUS_LABELS[p.followUpStatus]}
              </span>
            </div>
            <p className="cal-list-meta">
              {p.clientName}
              {p.guestCount ? ` · ${p.guestCount} guests` : ""}
            </p>
            <p className="cal-list-dates">
              {formatDateRange(p.arrivalDate, p.departureDate)}
            </p>
          </Link>
          <div className="cal-list-actions">
            {FOLLOW_UP_ACTIONS.map((action) => (
              <button
                key={action.status}
                type="button"
                className={`cal-action-btn${p.followUpStatus === action.status ? " is-active" : ""}`}
                disabled={updatingId === p.id}
                onClick={() => onStatusChange(p.id, action.status)}
              >
                {action.label}
              </button>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}
