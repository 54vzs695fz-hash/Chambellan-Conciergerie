"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CalendarFiltersBar } from "@/components/calendar/CalendarFilters";
import { CalendarFollowUpPanel } from "@/components/calendar/CalendarFollowUpPanel";
import { CalendarListView } from "@/components/calendar/CalendarListView";
import { CalendarMonthView } from "@/components/calendar/CalendarMonthView";
import { CalendarProgrammeFollowUpPanel } from "@/components/calendar/CalendarProgrammeFollowUpPanel";
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
import { PLANNER_AUTOSAVE_MS } from "@/components/planner/use-planner-save";
import type { ChecklistItem, Trip, TripFollowUpStatus, TripPaymentStatus } from "@/lib/types";

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
  const [selectedProgramme, setSelectedProgramme] =
    useState<CalendarProgramme | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [updatingPaymentId, setUpdatingPaymentId] = useState<number | null>(
    null
  );
  const [paymentErrors, setPaymentErrors] = useState<Record<number, string>>(
    {}
  );
  const [checklistUpdatingId, setChecklistUpdatingId] = useState<number | null>(
    null
  );
  const [toast, setToast] = useState<string | null>(null);
  const patchTimers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const pendingPatches = useRef(new Map<number, Partial<ChecklistItem>>());
  const today = useMemo(() => startOfDay(new Date()), []);

  useEffect(() => {
    if (isMobile) setView("list");
  }, [isMobile]);

  useEffect(() => {
    const refresh = async () => {
      const res = await fetch("/api/trips");
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) {
        const next = tripsToCalendarProgrammes(data as Trip[]);
        setProgrammes(next);
        setSelectedProgramme((current) => {
          if (!current) return null;
          return next.find((p) => p.id === current.id) ?? null;
        });
      }
    };
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  useEffect(() => {
    return () => {
      for (const timer of patchTimers.current.values()) {
        clearTimeout(timer);
      }
    };
  }, []);

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

  const handlePaymentStatusChange = async (
    id: number,
    status: TripPaymentStatus
  ) => {
    const previous =
      programmes.find((p) => p.id === id)?.paymentStatus ?? "pending";
    if (previous === status) return;

    setUpdatingPaymentId(id);
    setPaymentErrors((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setProgrammes((prev) =>
      prev.map((p) => (p.id === id ? { ...p, paymentStatus: status } : p))
    );
    setSelectedProgramme((prev) =>
      prev?.id === id ? { ...prev, paymentStatus: status } : prev
    );
    try {
      const res = await fetch(`/api/trips/${id}/payment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment_status: status }),
      });
      if (!res.ok) throw new Error("Update failed");
    } catch {
      setProgrammes((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, paymentStatus: previous } : p
        )
      );
      setSelectedProgramme((prev) =>
        prev?.id === id ? { ...prev, paymentStatus: previous } : prev
      );
      setPaymentErrors((prev) => ({
        ...prev,
        [id]: "Could not save.",
      }));
    } finally {
      setUpdatingPaymentId(null);
    }
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
      setSelectedProgramme((prev) =>
        prev?.id === id ? { ...prev, followUpStatus: status } : prev
      );
      showToast("Status updated.");
    } catch {
      showToast("Could not update status.");
    } finally {
      setUpdatingId(null);
    }
  };

  const flushChecklistPatch = useCallback(async (id: number) => {
    const fields = pendingPatches.current.get(id);
    if (!fields || Object.keys(fields).length === 0) return;
    pendingPatches.current.delete(id);
    const res = await fetch(`/api/checklist-items/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
    if (!res.ok) throw new Error("Update failed");
  }, []);

  const handlePatchChecklistItem = useCallback(
    async (id: number, fields: Partial<ChecklistItem>) => {
      const immediate =
        fields.status !== undefined ||
        Object.keys(fields).length === 0;

      if (immediate && Object.keys(fields).length > 0) {
        pendingPatches.current.delete(id);
        const timer = patchTimers.current.get(id);
        if (timer) clearTimeout(timer);
        patchTimers.current.delete(id);
        const res = await fetch(`/api/checklist-items/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(fields),
        });
        if (!res.ok) throw new Error("Update failed");
        return;
      }

      pendingPatches.current.set(id, {
        ...pendingPatches.current.get(id),
        ...fields,
      });
      const existing = patchTimers.current.get(id);
      if (existing) clearTimeout(existing);
      patchTimers.current.set(
        id,
        setTimeout(() => {
          patchTimers.current.delete(id);
          void flushChecklistPatch(id).catch(() => {
            showToast("Could not save checklist item.");
          });
        }, PLANNER_AUTOSAVE_MS)
      );
    },
    [flushChecklistPatch]
  );

  const handleChecklistDone = async (id: number) => {
    setChecklistUpdatingId(id);
    try {
      const res = await fetch(`/api/checklist-items/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "done" }),
      });
      if (!res.ok) throw new Error("Update failed");
      showToast("Marked done.");
    } catch {
      showToast("Could not update checklist item.");
      throw new Error("Update failed");
    } finally {
      setChecklistUpdatingId(null);
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

      <CalendarFollowUpPanel
        programmes={programmes}
        today={today}
        onSelectProgramme={setSelectedProgramme}
        updatingPaymentId={updatingPaymentId}
        paymentErrors={paymentErrors}
        onPaymentStatusChange={handlePaymentStatusChange}
      />

      {selectedProgramme ? (
        <CalendarProgrammeFollowUpPanel
          programme={selectedProgramme}
          today={today}
          updatingId={checklistUpdatingId}
          updatingPaymentId={updatingPaymentId}
          paymentError={paymentErrors[selectedProgramme.id] ?? null}
          onClose={() => setSelectedProgramme(null)}
          onMarkDone={handleChecklistDone}
          onPatchItem={handlePatchChecklistItem}
          onPaymentStatusChange={(status) =>
            handlePaymentStatusChange(selectedProgramme.id, status)
          }
        />
      ) : null}

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
          updatingId={updatingId}
          selectedId={selectedProgramme?.id ?? null}
          onSelectProgramme={setSelectedProgramme}
          onStatusChange={handleStatusChange}
          updatingPaymentId={updatingPaymentId}
          paymentErrors={paymentErrors}
          onPaymentStatusChange={handlePaymentStatusChange}
        />
      ) : null}

      {view === "week" ? (
        <CalendarWeekView
          reference={reference}
          programmes={filtered}
          today={today}
          updatingId={updatingId}
          selectedId={selectedProgramme?.id ?? null}
          onSelectProgramme={setSelectedProgramme}
          onStatusChange={handleStatusChange}
          updatingPaymentId={updatingPaymentId}
          paymentErrors={paymentErrors}
          onPaymentStatusChange={handlePaymentStatusChange}
        />
      ) : null}

      {view === "list" ? (
        <CalendarListView
          programmes={filtered}
          updatingId={updatingId}
          selectedId={selectedProgramme?.id ?? null}
          onSelectProgramme={setSelectedProgramme}
          onStatusChange={handleStatusChange}
          updatingPaymentId={updatingPaymentId}
          paymentErrors={paymentErrors}
          onPaymentStatusChange={handlePaymentStatusChange}
        />
      ) : null}
    </div>
  );
}
