"use client";

import {
  CalendarQuickActions,
  calendarEventClasses,
} from "@/components/calendar/CalendarQuickActions";
import { CalendarProgrammeBadges } from "@/components/calendar/CalendarProgrammeBadges";
import {
  buildMonthGrid,
  formatDayNum,
  formatDayShort,
  isSameMonth,
  isToday,
  programmeActiveOnDate,
  programmeSegmentClass,
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

export function CalendarMonthView({
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
  const weeks = buildMonthGrid(reference);
  const weekdays = weeks[0].map(formatDayShort);

  return (
    <div className="cal-month">
      <div className="cal-month-head">
        {weekdays.map((label) => (
          <div key={label} className="cal-month-head-cell">
            {label}
          </div>
        ))}
      </div>
      {weeks.map((week, wi) => (
        <div key={wi} className="cal-month-week">
          {week.map((day) => {
            const iso = toIsoDate(day);
            const dayProgrammes = programmes.filter((p) =>
              programmeActiveOnDate(p, iso)
            );
            const inMonth = isSameMonth(day, reference);
            const todayCell = isToday(day, today);

            return (
              <div
                key={iso}
                className={`cal-day-cell${inMonth ? "" : " is-other-month"}${todayCell ? " is-today" : ""}`}
              >
                <span className="cal-day-num">{formatDayNum(day)}</span>
                <div className="cal-day-events">
                  {dayProgrammes.map((p) => {
                    const segment = programmeSegmentClass(p, iso);
                    const showActions = segment !== "cal-event--middle";

                    return (
                      <div key={`${p.id}-${iso}`} className="cal-event-wrap">
                        <button
                          type="button"
                          className={`${calendarEventClasses(p, segment, today)}${selectedId === p.id ? " is-selected" : ""}`}
                          onClick={() => onSelectProgramme(p)}
                        >
                          <span className="cal-event-label">
                            {p.clientName} · {p.destination}
                          </span>
                          {showActions ? (
                            <span className="cal-event-sub">
                              <CalendarProgrammeBadges
                                programme={p}
                                showFollowUpDot
                                paymentUpdating={updatingPaymentId === p.id}
                                paymentError={paymentErrors[p.id] ?? null}
                                onPaymentStatusChange={(status) =>
                                  onPaymentStatusChange(p.id, status)
                                }
                              />
                            </span>
                          ) : null}
                        </button>
                        {showActions ? (
                          <CalendarQuickActions
                            programme={p}
                            updating={updatingId === p.id}
                            onStatusChange={onStatusChange}
                            compact
                          />
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
