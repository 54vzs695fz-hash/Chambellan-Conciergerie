"use client";

import { formatDateRange } from "@/lib/planner-utils";
import { ProgrammeStatusBadge } from "@/components/status/ProgrammeStatusBadge";
import { getActiveFollowUpSuggestions } from "@/lib/calendar/follow-up";
import {
  daysUntilArrival,
  programmesArrivingWithinDays,
  type CalendarProgramme,
} from "@/lib/calendar/programmes";

interface Props {
  programmes: CalendarProgramme[];
  today: Date;
  onSelectProgramme: (programme: CalendarProgramme) => void;
}

export function CalendarFollowUpPanel({
  programmes,
  today,
  onSelectProgramme,
}: Props) {
  const arrivingSoon = programmesArrivingWithinDays(programmes, 7, today);
  const suggestions = getActiveFollowUpSuggestions(arrivingSoon, today);

  if (arrivingSoon.length === 0 && suggestions.length === 0) {
    return null;
  }

  return (
    <section className="cal-reminder-panel">
      <h2 className="cal-reminder-title">Arrivals & follow-up</h2>
      <ul className="cal-reminder-list">
        {arrivingSoon.map((p) => {
          const days = daysUntilArrival(p.arrivalDate, today);
          const daySuggestions = suggestions.find((s) => s.programme.id === p.id);

          return (
            <li key={p.id} className="cal-reminder-item">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="cal-follow-up-select font-serif text-gold tracking-wide"
                  onClick={() => onSelectProgramme(p)}
                >
                  {p.clientName} · {p.destination}
                </button>
                <ProgrammeStatusBadge
                  status={p.followUpStatus}
                  showDot
                  arrivalDate={p.arrivalDate}
                />
              </div>
              <p className="cal-reminder-meta">
                {formatDateRange(p.arrivalDate, p.departureDate)}
                {days !== null
                  ? days === 0
                    ? " · Arrives today"
                    : ` · ${days} day${days === 1 ? "" : "s"} until arrival`
                  : ""}
              </p>
              {daySuggestions?.suggestions.map((s) => (
                <p key={s.kind} className="cal-suggestion">
                  <strong>{s.label}:</strong> {s.detail}
                </p>
              ))}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
