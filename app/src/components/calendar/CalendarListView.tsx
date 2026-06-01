"use client";

import { formatDateRange } from "@/lib/planner-utils";
import { CalendarQuickActions } from "@/components/calendar/CalendarQuickActions";
import { CalendarProgrammeBadges } from "@/components/calendar/CalendarProgrammeBadges";
import type { CalendarProgramme } from "@/lib/calendar/programmes";
import type { TripFollowUpStatus, TripPaymentStatus } from "@/lib/types";

interface Props {
  programmes: CalendarProgramme[];
  updatingId: number | null;
  selectedId: number | null;
  onSelectProgramme: (programme: CalendarProgramme) => void;
  onStatusChange: (id: number, status: TripFollowUpStatus) => void;
  updatingPaymentId: number | null;
  paymentErrors: Record<number, string>;
  onPaymentStatusChange: (id: number, status: TripPaymentStatus) => void;
}

export function CalendarListView({
  programmes,
  updatingId,
  selectedId,
  onSelectProgramme,
  onStatusChange,
  updatingPaymentId,
  paymentErrors,
  onPaymentStatusChange,
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
        <article
          key={p.id}
          className={`cal-list-card${selectedId === p.id ? " is-selected" : ""}`}
        >
          <div className="cal-list-card-inner">
            <button
              type="button"
              className="cal-list-card-body"
              onClick={() => onSelectProgramme(p)}
            >
              <div className="cal-list-top">
                <span className="cal-list-destination">{p.destination}</span>
                <CalendarProgrammeBadges
                  programme={p}
                  paymentUpdating={updatingPaymentId === p.id}
                  paymentError={paymentErrors[p.id] ?? null}
                  onPaymentStatusChange={(status) =>
                    onPaymentStatusChange(p.id, status)
                  }
                />
              </div>
              <p className="cal-list-meta">
                {p.clientName}
                {p.guestCount ? ` · ${p.guestCount} guests` : ""}
              </p>
              <p className="cal-list-dates">
                {formatDateRange(p.arrivalDate, p.departureDate)}
              </p>
            </button>
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
