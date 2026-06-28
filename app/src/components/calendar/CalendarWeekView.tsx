"use client";

import {
  CalendarQuickActions,
  calendarEventClasses,
} from "@/components/calendar/CalendarQuickActions";
import { CalendarProgrammeBadges } from "@/components/calendar/CalendarProgrammeBadges";
import {
  buildWeekDays,
  formatDayNum,
  formatDayShort,
  programmeSpanInWeek,
  toIsoDate,
  type CalendarProgramme,
} from "@/lib/calendar/programmes";
import type { TripFollowUpStatus, TripPaymentStatus } from "@/lib/types";

interface Props {
  reference: Date;
  programmes: CalendarProgramme[];
  today: Date;
  updatingId: number | null;
  selectedId: number | null;
  onSelectProgramme: (programme: CalendarProgramme) => void;
  onStatusChange: (id: number, status: TripFollowUpStatus) => void;
  updatingPaymentId: number | null;
  paymentErrors: Record<number, string>;
  onPaymentStatusChange: (id: number, status: TripPaymentStatus) => void;
}

export function CalendarWeekView({
  reference,
  programmes,
  today,
  updatingId,
  selectedId,
  onSelectProgramme,
  onStatusChange,
  updatingPaymentId,
  paymentErrors,
  onPaymentStatusChange,
}: Props) {
  const weekDays = buildWeekDays(reference);
  const todayIso = toIsoDate(today);

  const visible = programmes
    .map((p) => ({ p, span: programmeSpanInWeek(p, weekDays) }))
    .filter(
      (
        entry
      ): entry is {
        p: CalendarProgramme;
        span: { startCol: number; span: number };
      } => entry.span !== null
    );

  return (
    <div className="cal-week">
      <div className="cal-week-head">
        {weekDays.map((day) => {
          const iso = toIsoDate(day);
          return (
            <div
              key={iso}
              className={`cal-week-head-cell${iso === todayIso ? " is-today" : ""}`}
            >
              <div className="cal-week-day-name">{formatDayShort(day)}</div>
              <div className="cal-week-day-num">{formatDayNum(day)}</div>
            </div>
          );
        })}
      </div>
      <div className="cal-week-body">
        {visible.length === 0 ? (
          <p className="cal-empty">No programmes this week.</p>
        ) : (
          visible.map(({ p, span }) => (
            <div key={p.id} className="cal-week-row">
              <div
                className="cal-event-wrap cal-week-event-wrap"
                style={{
                  gridColumn: `${span.startCol + 1} / span ${span.span}`,
                }}
              >
                <button
                  type="button"
                  className={`${calendarEventClasses(p, "", today, "cal-week-bar")}${selectedId === p.id ? " is-selected" : ""}`}
                  onClick={() => onSelectProgramme(p)}
                >
                  <span>
                    {p.clientName} · {p.destination}
                    {p.destinationSubtitle ? ` · ${p.destinationSubtitle}` : ""}
                  </span>
                  <CalendarProgrammeBadges
                    programme={p}
                    showFollowUpDot
                    paymentUpdating={updatingPaymentId === p.id}
                    paymentError={paymentErrors[p.id] ?? null}
                    onPaymentStatusChange={(status) =>
                      onPaymentStatusChange(p.id, status)
                    }
                  />
                </button>
                <CalendarQuickActions
                  programme={p}
                  updating={updatingId === p.id}
                  onStatusChange={onStatusChange}
                  compact
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
