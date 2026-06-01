"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_CALENDAR_FILTERS,
  FOLLOW_UP_STATUS_LABELS,
  type CalendarFilters,
} from "@/lib/calendar/programmes";
import {
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_OPTIONS,
} from "@/lib/planner/payment-status";
import type { TripFollowUpStatus } from "@/lib/types";

interface FormProps {
  filters: CalendarFilters;
  destinations: string[];
  clients: string[];
  onChange: (filters: CalendarFilters) => void;
}

export function countActiveCalendarFilters(filters: CalendarFilters): number {
  let count = 0;
  if (filters.destination) count += 1;
  if (filters.client) count += 1;
  if (filters.status) count += 1;
  if (filters.paymentStatus) count += 1;
  if (filters.upcomingOnly) count += 1;
  if (filters.thisWeek) count += 1;
  if (filters.thisMonth) count += 1;
  if (filters.arrivalWithin7Days) count += 1;
  if (filters.pendingPaymentOnly) count += 1;
  if (filters.urgentFollowUpOnly) count += 1;
  return count;
}

function CalendarFiltersForm({
  filters,
  destinations,
  clients,
  onChange,
}: FormProps) {
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
        aria-label="Filter by programme status"
      >
        <option value="">All programme statuses</option>
        {(Object.keys(FOLLOW_UP_STATUS_LABELS) as TripFollowUpStatus[]).map(
          (s) => (
            <option key={s} value={s}>
              {FOLLOW_UP_STATUS_LABELS[s]}
            </option>
          )
        )}
      </select>

      <select
        className="field-input min-h-[44px]"
        value={filters.paymentStatus}
        onChange={(e) => set({ paymentStatus: e.target.value })}
        aria-label="Filter by payment status"
      >
        <option value="">All payment statuses</option>
        {PAYMENT_STATUS_OPTIONS.map((s) => (
          <option key={s} value={s}>
            {PAYMENT_STATUS_LABELS[s]}
          </option>
        ))}
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
        <label className="cal-filter-toggle">
          <input
            type="checkbox"
            checked={filters.arrivalWithin7Days}
            onChange={() => toggle("arrivalWithin7Days")}
          />
          Arrival within 7 days
        </label>
        <label className="cal-filter-toggle">
          <input
            type="checkbox"
            checked={filters.pendingPaymentOnly}
            onChange={() => toggle("pendingPaymentOnly")}
          />
          Pending payment only
        </label>
        <label className="cal-filter-toggle">
          <input
            type="checkbox"
            checked={filters.urgentFollowUpOnly}
            onChange={() => toggle("urgentFollowUpOnly")}
          />
          Urgent follow-up only
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

export function CalendarFiltersBar(props: FormProps) {
  return <CalendarFiltersForm {...props} />;
}

export function CalendarFiltersDrawer(props: FormProps) {
  const [open, setOpen] = useState(false);
  const activeCount = useMemo(
    () => countActiveCalendarFilters(props.filters),
    [props.filters]
  );

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.body.classList.add("cal-filters-open");
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.classList.remove("cal-filters-open");
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="cal-filters-drawer">
      <button
        type="button"
        className="cal-filters-drawer-trigger min-h-[44px]"
        aria-expanded={open}
        aria-controls="cal-filters-sheet"
        onClick={() => setOpen((value) => !value)}
      >
        Filters
        {activeCount > 0 ? (
          <span className="cal-filters-drawer-count">{activeCount}</span>
        ) : null}
      </button>

      {open ? (
        <div className="cal-filters-drawer-root">
          <button
            type="button"
            className="cal-filters-drawer-backdrop"
            aria-label="Close filters"
            onClick={() => setOpen(false)}
          />
          <div
            id="cal-filters-sheet"
            className="cal-filters-drawer-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Calendar filters"
          >
            <div className="cal-filters-drawer-head">
              <p className="cal-filters-drawer-title">Filters</p>
              <button
                type="button"
                className="cal-filters-drawer-close min-h-[44px] min-w-[44px]"
                aria-label="Close filters"
                onClick={() => setOpen(false)}
              >
                ×
              </button>
            </div>
            <CalendarFiltersForm {...props} />
            <button
              type="button"
              className="cal-filters-drawer-apply min-h-[44px]"
              onClick={() => setOpen(false)}
            >
              Show results
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
