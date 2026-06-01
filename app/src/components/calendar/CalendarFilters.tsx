"use client";

import {
  DEFAULT_CALENDAR_FILTERS,
  FOLLOW_UP_STATUS_LABELS,
  type CalendarFilters,
} from "@/lib/calendar/programmes";
import type { TripFollowUpStatus } from "@/lib/types";

interface Props {
  filters: CalendarFilters;
  destinations: string[];
  clients: string[];
  onChange: (filters: CalendarFilters) => void;
}

export function CalendarFiltersBar({
  filters,
  destinations,
  clients,
  onChange,
}: Props) {
  const set = (patch: Partial<CalendarFilters>) =>
    onChange({ ...filters, ...patch });

  const toggle = (key: keyof CalendarFilters) => {
    if (typeof filters[key] === "boolean") {
      set({ [key]: !filters[key] } as Partial<CalendarFilters>);
    }
  };

  return (
    <div className="cal-filters">
      <select
        className="field-input min-h-[44px]"
        value={filters.destination}
        onChange={(e) => set({ destination: e.target.value })}
        aria-label="Filter by destination"
      >
        <option value="">All destinations</option>
        {destinations.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>

      <select
        className="field-input min-h-[44px]"
        value={filters.client}
        onChange={(e) => set({ client: e.target.value })}
        aria-label="Filter by client"
      >
        <option value="">All clients</option>
        {clients.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      <select
        className="field-input min-h-[44px]"
        value={filters.status}
        onChange={(e) => set({ status: e.target.value })}
        aria-label="Filter by status"
      >
        <option value="">All statuses</option>
        {(Object.keys(FOLLOW_UP_STATUS_LABELS) as TripFollowUpStatus[]).map(
          (s) => (
            <option key={s} value={s}>
              {FOLLOW_UP_STATUS_LABELS[s]}
            </option>
          )
        )}
      </select>

      <div className="cal-filter-toggles">
        <label className="cal-filter-toggle">
          <input
            type="checkbox"
            checked={filters.upcomingOnly}
            onChange={() => toggle("upcomingOnly")}
          />
          Upcoming only
        </label>
        <label className="cal-filter-toggle">
          <input
            type="checkbox"
            checked={filters.thisWeek}
            onChange={() => toggle("thisWeek")}
          />
          This week
        </label>
        <label className="cal-filter-toggle">
          <input
            type="checkbox"
            checked={filters.thisMonth}
            onChange={() => toggle("thisMonth")}
          />
          This month
        </label>
        <button
          type="button"
          className="btn-ghost min-h-[44px] text-xs"
          onClick={() => onChange({ ...DEFAULT_CALENDAR_FILTERS })}
        >
          Clear filters
        </button>
      </div>
    </div>
  );
}
