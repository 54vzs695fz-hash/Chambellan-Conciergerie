"use client";

import Link from "next/link";
import { formatDateRange } from "@/lib/planner-utils";
import { getActiveFollowUpSuggestions } from "@/lib/calendar/follow-up";
import {
  daysUntilArrival,
  programmesArrivingWithinDays,
  type CalendarProgramme,
} from "@/lib/calendar/programmes";

interface Props {
  programmes: CalendarProgramme[];
  today: Date;
}

export function CalendarFollowUpPanel({ programmes, today }: Props) {
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
              <Link href={p.plannerHref} className="font-serif text-gold tracking-wide">
                {p.clientName} · {p.destination}
              </Link>
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
