"use client";

import Link from "next/link";
import {
  buildMonthGrid,
  formatDayNum,
  formatDayShort,
  FOLLOW_UP_STATUS_LABELS,
  isSameMonth,
  isToday,
  programmeActiveOnDate,
  programmeSegmentClass,
  toIsoDate,
  type CalendarProgramme,
} from "@/lib/calendar/programmes";

interface Props {
  reference: Date;
  programmes: CalendarProgramme[];
  today: Date;
}

export function CalendarMonthView({ reference, programmes, today }: Props) {
  const weeks = buildMonthGrid(reference);
  const weekdays = buildMonthGrid(reference)[0].map(formatDayShort);

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
                  {dayProgrammes.map((p) => (
                    <Link
                      key={`${p.id}-${iso}`}
                      href={p.plannerHref}
                      className={`cal-event ${programmeSegmentClass(p, iso)}`}
                    >
                      <span className="cal-event-label">
                        {p.clientName} · {p.destination}
                      </span>
                      <span className="cal-event-sub">
                        {FOLLOW_UP_STATUS_LABELS[p.followUpStatus]}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
