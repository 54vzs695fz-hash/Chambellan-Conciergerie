"use client";

import { CalendarProgrammeCard } from "@/components/calendar/CalendarProgrammeCard";
import { groupProgrammesForList } from "@/lib/calendar/list-groups";
import { startOfDay, type CalendarProgramme } from "@/lib/calendar/programmes";
import type { TripPaymentStatus } from "@/lib/types";

interface Props {
  programmes: CalendarProgramme[];
  today?: Date;
  selectedId: number | null;
  checklistSummaries: Record<number, string>;
  onSelectProgramme: (programme: CalendarProgramme) => void;
  updatingPaymentId: number | null;
  paymentErrors: Record<number, string>;
  onPaymentStatusChange: (id: number, status: TripPaymentStatus) => void;
}

export function CalendarListView({
  programmes,
  today = startOfDay(new Date()),
  selectedId,
  checklistSummaries,
  onSelectProgramme,
  updatingPaymentId,
  paymentErrors,
  onPaymentStatusChange,
}: Props) {
  if (programmes.length === 0) {
    return <p className="cal-empty">No programmes match your filters.</p>;
  }

  const groups = groupProgrammesForList(programmes, today);

  return (
    <div className="cal-list">
      {groups.map((group) => (
        <section key={group.key} className="cal-list-group">
          <h2 className="cal-list-group-title">{group.label}</h2>
          <div className="cal-list-group-cards">
            {group.programmes.map((p) => (
              <CalendarProgrammeCard
                key={`${group.key}-${p.id}`}
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
      ))}
    </div>
  );
}
