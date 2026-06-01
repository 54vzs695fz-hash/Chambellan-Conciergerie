"use client";

import { CalendarProgrammeChip } from "@/components/calendar/CalendarProgrammeChip";
import {
  buildMonthGrid,
  formatDayNum,
  formatDayShort,
  isSameMonth,
  isToday,
  programmeActiveOnDate,
  toIsoDate,
  type CalendarProgramme,
} from "@/lib/calendar/programmes";

const MAX_CHIPS_PER_DAY = 3;

interface Props {
  reference: Date;
  programmes: CalendarProgramme[];
  today: Date;
  selectedId: number | null;
  onSelectProgramme: (programme: CalendarProgramme) => void;
  onSelectDay: (iso: string, programmes: CalendarProgramme[]) => void;
}

export function CalendarMonthView({
  reference,
  programmes,
  today,
  selectedId,
  onSelectProgramme,
  onSelectDay,
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
            const dayProgrammes = programmes
              .filter((p) => programmeActiveOnDate(p, iso))
              .sort((a, b) => a.clientName.localeCompare(b.clientName));
            const visible = dayProgrammes.slice(0, MAX_CHIPS_PER_DAY);
            const overflow = dayProgrammes.length - visible.length;
            const inMonth = isSameMonth(day, reference);
            const todayCell = isToday(day, today);

            return (
              <div
                key={iso}
                className={`cal-day-cell${inMonth ? "" : " is-other-month"}${todayCell ? " is-today" : ""}`}
              >
                <span className="cal-day-num">{formatDayNum(day)}</span>
                <div className="cal-day-events">
                  {visible.map((p) => (
                    <CalendarProgrammeChip
                      key={`${p.id}-${iso}`}
                      programme={p}
                      selected={selectedId === p.id}
                      onClick={() => onSelectProgramme(p)}
                    />
                  ))}
                  {overflow > 0 ? (
                    <button
                      type="button"
                      className="cal-chip-more min-h-[44px]"
                      onClick={() => onSelectDay(iso, dayProgrammes)}
                    >
                      + {overflow} more
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
