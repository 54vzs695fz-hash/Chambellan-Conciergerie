"use client";

import Link from "next/link";
import { formatDateRange } from "@/lib/planner-utils";
import { CalendarQuickActions } from "@/components/calendar/CalendarQuickActions";
import { ProgrammeStatusBadge } from "@/components/status/ProgrammeStatusBadge";
import type { CalendarProgramme } from "@/lib/calendar/programmes";
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
          <div className="cal-list-card-inner">
            <Link href={p.plannerHref} className="cal-list-card-body block">
              <div className="cal-list-top">
                <span className="cal-list-destination">{p.destination}</span>
                <ProgrammeStatusBadge
                  status={p.followUpStatus}
                  showDot
                  arrivalDate={p.arrivalDate}
                />
              </div>
              <p className="cal-list-meta">
                {p.clientName}
                {p.guestCount ? ` · ${p.guestCount} guests` : ""}
              </p>
              <p className="cal-list-dates">
                {formatDateRange(p.arrivalDate, p.departureDate)}
              </p>
            </Link>
            <CalendarQuickActions
              programme={p}
              updating={updatingId === p.id}
              onStatusChange={onStatusChange}
            />
          </div>
        </article>
      ))}
    </div>
  );
}
