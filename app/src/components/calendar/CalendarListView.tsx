"use client";

import { CalendarProgrammeCard } from "@/components/calendar/CalendarProgrammeCard";
import {
  groupProgrammesForList,
  groupProgrammesForMobileDayList,
} from "@/lib/calendar/list-groups";
import { startOfDay, type CalendarProgramme } from "@/lib/calendar/programmes";
import type { TripFollowUpStatus, TripPaymentStatus } from "@/lib/types";

interface Props {
  programmes: CalendarProgramme[];
  today?: Date;
  selectedId: number | null;
  checklistSummaries: Record<number, string>;
  onSelectProgramme: (programme: CalendarProgramme) => void;
  updatingPaymentId: number | null;
  updatingStatusId?: number | null;
  paymentErrors: Record<number, string>;
  onPaymentStatusChange: (id: number, status: TripPaymentStatus) => void;
  onStatusChange?: (id: number, status: TripFollowUpStatus) => void;
  groupByDay?: boolean;
}

export function CalendarListView({
  programmes,
  today = startOfDay(new Date()),
  selectedId,
  checklistSummaries,
  onSelectProgramme,
  updatingPaymentId,
  updatingStatusId = null,
  paymentErrors,
  onPaymentStatusChange,
  onStatusChange,
  groupByDay = false,
}: Props) {
  if (programmes.length === 0) {
    return <p className="cal-empty">No programmes match your filters.</p>;
  }

  if (groupByDay) {
    const dayGroups = groupProgrammesForMobileDayList(programmes, today);

    return (
      <div className="cal-list cal-list--by-day">
        {dayGroups.map((group) => (
          <section key={group.iso} className="cal-list-day-group">
            <h2 className="cal-list-day-title">{group.label}</h2>
            <div className="cal-list-group-cards">
              {group.programmes.map((p) => (
                <CalendarProgrammeCard
                  key={`${group.iso}-${p.id}`}
                  programme={p}
                  selected={selectedId === p.id}
                  checklistSummary={checklistSummaries[p.id] ?? null}
                  onSelect={() => onSelectProgramme(p)}
                  updatingPaymentId={updatingPaymentId}
                  updatingStatusId={updatingStatusId}
                  paymentErrors={paymentErrors}
                  onPaymentStatusChange={onPaymentStatusChange}
                  onStatusChange={onStatusChange}
                  mobileLayout
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    );
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
