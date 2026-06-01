"use client";

import Link from "next/link";
import {
  buildWeekDays,
  formatDayNum,
  formatDayShort,
  programmeSpanInWeek,
  toIsoDate,
  type CalendarProgramme,
} from "@/lib/calendar/programmes";

interface Props {
  reference: Date;
  programmes: CalendarProgramme[];
  today: Date;
}

export function CalendarWeekView({ reference, programmes, today }: Props) {
  const weekDays = buildWeekDays(reference);
  const todayIso = toIsoDate(today);

  const visible = programmes
    .map((p) => ({ p, span: programmeSpanInWeek(p, weekDays) }))
    .filter((entry): entry is { p: CalendarProgramme; span: { startCol: number; span: number } } =>
      entry.span !== null
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
              <Link
                href={p.plannerHref}
                className="cal-week-bar"
                style={{
                  gridColumn: `${span.startCol + 1} / span ${span.span}`,
                }}
              >
                {p.clientName} · {p.destination}
              </Link>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
