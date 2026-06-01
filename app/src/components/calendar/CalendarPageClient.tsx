"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarFiltersBar } from "@/components/calendar/CalendarFilters";
import { CalendarFollowUpPanel } from "@/components/calendar/CalendarFollowUpPanel";
import { CalendarListView } from "@/components/calendar/CalendarListView";
import { CalendarMonthView } from "@/components/calendar/CalendarMonthView";
import { CalendarWeekView } from "@/components/calendar/CalendarWeekView";
import {
  addDays,
  DEFAULT_CALENDAR_FILTERS,
  filterProgrammes,
  formatMonthYear,
  formatWeekRange,
  buildWeekDays,
  startOfDay,
  tripsToCalendarProgrammes,
  uniqueClients,
  uniqueDestinations,
  type CalendarFilters,
  type CalendarProgramme,
  type CalendarView,
} from "@/lib/calendar/programmes";
import type { Trip, TripFollowUpStatus } from "@/lib/types";

interface Props {
  initialTrips: Trip[];
}

function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return mobile;
}

export function CalendarPageClient({ initialTrips }: Props) {
  const isMobile = useIsMobile();
  const [view, setView] = useState<CalendarView>("month");
  const [reference, setReference] = useState(() => startOfDay(new Date()));
  const [filters, setFilters] = useState<CalendarFilters>({
    ...DEFAULT_CALENDAR_FILTERS,
  });
  const [programmes, setProgrammes] = useState<CalendarProgramme[]>(() =>
    tripsToCalendarProgrammes(initialTrips)
  );
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const today = useMemo(() => startOfDay(new Date()), []);

  useEffect(() => {
    if (isMobile) setView("list");
  }, [isMobile]);

  const filtered = useMemo(
    () => filterProgrammes(programmes, filters, today),
    [programmes, filters, today]
  );

  const destinations = useMemo(
    () => uniqueDestinations(programmes),
    [programmes]
  );
  const clients = useMemo(() => uniqueClients(programmes), [programmes]);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2500);
  };

  const handleStatusChange = async (id: number, status: TripFollowUpStatus) => {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/trips/${id}/follow-up`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ follow_up_status: status }),
      });
      if (!res.ok) throw new Error("Update failed");
      setProgrammes((prev) =>
        prev.map((p) => (p.id === id ? { ...p, followUpStatus: status } : p))
      );
      showToast("Status updated.");
    } catch {
      showToast("Could not update status.");
    } finally {
      setUpdatingId(null);
    }
  };

  const navTitle =
    view === "month"
      ? formatMonthYear(reference)
      : view === "week"
        ? formatWeekRange(buildWeekDays(reference))
        : "All programmes";

  const shiftReference = (delta: number) => {
    if (view === "month") {
      setReference(
        (r) => new Date(r.getFullYear(), r.getMonth() + delta, 1, 12, 0, 0)
      );
    } else if (view === "week") {
      setReference((r) => addDays(r, delta * 7));
    }
  };

  return (
    <div className="cal-shell">
      {toast ? (
        <p className="est-save-toast" role="status">
          {toast}
        </p>
      ) : null}

      <div className="cal-header">
        <div className="cal-view-tabs" role="tablist" aria-label="Calendar view">
          {(["month", "week", "list"] as CalendarView[]).map((v) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={view === v}
              className={`cal-view-tab${view === v ? " is-active" : ""}`}
              onClick={() => setView(v)}
            >
              {v === "month" ? "Month" : v === "week" ? "Week" : "List"}
            </button>
          ))}
        </div>
      </div>

      <CalendarFiltersBar
        filters={filters}
        destinations={destinations}
        clients={clients}
        onChange={setFilters}
      />

      <CalendarFollowUpPanel programmes={programmes} today={today} />

      {view !== "list" ? (
        <div className="cal-nav">
          <button
            type="button"
            className="cal-nav-btn"
            onClick={() => shiftReference(-1)}
            aria-label="Previous"
          >
            ←
          </button>
          <h2 className="cal-nav-title">{navTitle}</h2>
          <div className="flex gap-2">
            <button
              type="button"
              className="cal-nav-btn"
              onClick={() => setReference(startOfDay(new Date()))}
            >
              Today
            </button>
            <button
              type="button"
              className="cal-nav-btn"
              onClick={() => shiftReference(1)}
              aria-label="Next"
            >
              →
            </button>
          </div>
        </div>
      ) : null}

      {view === "month" ? (
        <CalendarMonthView
          reference={reference}
          programmes={filtered}
          today={today}
        />
      ) : null}

      {view === "week" ? (
        <CalendarWeekView
          reference={reference}
          programmes={filtered}
          today={today}
        />
      ) : null}

      {view === "list" ? (
        <CalendarListView
          programmes={filtered}
          updatingId={updatingId}
          onStatusChange={handleStatusChange}
        />
      ) : null}
    </div>
  );
}
