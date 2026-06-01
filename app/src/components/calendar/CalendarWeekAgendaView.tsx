"use client";

import { CalendarProgrammeCard } from "@/components/calendar/CalendarProgrammeCard";
import {
  buildWeekDays,
  formatDayNum,
  formatDayShort,
  isToday,
  toIsoDate,
  type CalendarProgramme,
} from "@/lib/calendar/programmes";
import { groupProgrammesByDay } from "@/lib/calendar/list-groups";
import type { TripPaymentStatus } from "@/lib/types";

interface Props {
  reference: Date;
  programmes: CalendarProgramme[];
  today: Date;
  selectedId: number | null;
  checklistSummaries: Record<number, string>;
  onSelectProgramme: (programme: CalendarProgramme) => void;
  updatingPaymentId: number | null;
  paymentErrors: Record<number, string>;
  onPaymentStatusChange: (id: number, status: TripPaymentStatus) => void;
}

export function CalendarWeekAgendaView({
  reference,
  programmes,
  today,
  selectedId,
  checklistSummaries,
  onSelectProgramme,
  updatingPaymentId,
  paymentErrors,
  onPaymentStatusChange,
}: Props) {
  const weekDays = buildWeekDays(reference);
  const todayIso = toIsoDate(today);
  const grouped = groupProgrammesByDay(weekDays, programmes);
  const hasAny = grouped.some((day) => day.programmes.length > 0);

  if (!hasAny) {
    return <p className="cal-empty">No programmes this week.</p>;
  }

  return (
    <div className="cal-agenda">
      {grouped.map(({ iso, date, programmes: dayProgrammes }) => {
        if (dayProgrammes.length === 0) return null;
        const todayCell = isToday(date, today);

        return (
          <section
            key={iso}
            className={`cal-agenda-day${todayCell ? " is-today" : ""}`}
          >
            <header className="cal-agenda-day-head">
              <span className="cal-agenda-day-name">{formatDayShort(date)}</span>
              <span className="cal-agenda-day-num">{formatDayNum(date)}</span>
              {iso === todayIso ? (
                <span className="cal-agenda-today-tag">Today</span>
              ) : null}
            </header>
            <div className="cal-agenda-cards">
              {dayProgrammes.map((p) => (
                <CalendarProgrammeCard
                  key={p.id}
                  programme={p}
                  selected={selectedId === p.id}
                  checklistSummary={checklistSummaries[p.id] ?? null}
                  onSelect={() => onSelectProgramme(p)}
                  updatingPaymentId={updatingPaymentId}
                  paymentErrors={paymentErrors}
                  onPaymentStatusChange={onPaymentStatusChange}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
