"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PlannerLuxuryDocument } from "./PlannerLuxuryDocument";
import {
  PlannerConciergeDashboard,
  PlannerConciergeNav,
} from "./PlannerConciergeDashboard";
import type {
  Activity,
  ActivityType,
  Client,
  DaySection,
  TripWithDays,
} from "@/lib/types";
import {
  tripPayloadForApi,
  type PlannerExportVariant,
} from "@/lib/planner/planner-sheet-model";
import {
  datesMatchRange,
  syncTripDaysInState,
} from "@/lib/planner/trip-days-sync";
import { downloadPlannerPdf } from "./planner-pdf-download";
import { PlannerPreviewErrorBoundary } from "./PlannerPreviewErrorBoundary";

type ViewMode = "concierge" | "client";

interface Props {
  initialTrip: TripWithDays;
}

export function PlannerEditor({ initialTrip }: Props) {
  const router = useRouter();
  const [trip, setTrip] = useState(initialTrip);
  const [clients, setClients] = useState<Client[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("concierge");
  const [pdfLoading, setPdfLoading] = useState<PlannerExportVariant | null>(
    null
  );
  const [pdfError, setPdfError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/clients")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setClients(data);
      })
      .catch(() => {});
  }, []);

  const persist = useCallback(
    async (next: TripWithDays) => {
      setSaving(true);
      try {
        const res = await fetch(`/api/trips/${trip.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(tripPayloadForApi(next)),
        });
        if (!res.ok) return;
        const updated: TripWithDays = await res.json();
        setTrip(updated);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        router.refresh();
      } finally {
        setSaving(false);
      }
    },
    [trip.id, router]
  );

  const updateField = <K extends keyof TripWithDays>(
    key: K,
    value: TripWithDays[K]
  ) => {
    setTrip((prev) => ({ ...prev, [key]: value }));
  };

  const onFieldBlur = () => {
    setTrip((current) => {
      void persist(current);
      return current;
    });
  };

  const onDateFieldChange = (
    key: "arrival_date" | "departure_date",
    value: string
  ) => {
    setTrip((prev) => {
      const synced = syncTripDaysInState({ ...prev, [key]: value });
      if (
        synced.arrival_date &&
        synced.departure_date &&
        !datesMatchRange(prev.days, synced.arrival_date, synced.departure_date)
      ) {
        void persist(synced);
      }
      return synced;
    });
  };

  const onDatesCommit = () => {
    setTrip((current) => {
      const synced = syncTripDaysInState(current);
      if (synced.arrival_date && synced.departure_date) {
        void persist(synced);
      }
      return synced;
    });
  };

  const updateSections = async (dayId: number, sections: DaySection[]) => {
    const res = await fetch(`/api/trip-days/${dayId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sections }),
    });
    if (!res.ok) return;
    const updated = await res.json();
    setTrip((prev) => ({
      ...prev,
      days: prev.days.map((d) =>
        d.id === dayId ? { ...d, sections: updated.sections ?? sections } : d
      ),
    }));
  };

  const addActivity = async (
    dayId: number,
    period: string,
    activity_type: ActivityType
  ) => {
    const res = await fetch(`/api/trips/${trip.id}/activities`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trip_day_id: dayId, period, activity_type }),
    });
    const activity: Activity = await res.json();
    setTrip((prev) => ({
      ...prev,
      days: prev.days.map((d) =>
        d.id === dayId
          ? { ...d, activities: [...d.activities, activity] }
          : d
      ),
    }));
  };

  const patchActivity = async (id: number, fields: Partial<Activity>) => {
    const res = await fetch(`/api/activities/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
    const updated: Activity = await res.json();
    setTrip((prev) => ({
      ...prev,
      days: prev.days.map((d) => ({
        ...d,
        activities: d.activities.map((a) => (a.id === id ? updated : a)),
      })),
    }));
  };

  const removeActivity = async (id: number) => {
    await fetch(`/api/activities/${id}`, { method: "DELETE" });
    setTrip((prev) => ({
      ...prev,
      days: prev.days.map((d) => ({
        ...d,
        activities: d.activities.filter((a) => a.id !== id),
      })),
    }));
  };

  const reorderActivities = async (
    _dayId: number,
    _sectionId: string,
    orderedIds: number[]
  ) => {
    const updates = await Promise.all(
      orderedIds.map((id, index) =>
        fetch(`/api/activities/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sort_order: index }),
        }).then((r) => r.json() as Promise<Activity>)
      )
    );
    setTrip((prev) => ({
      ...prev,
      days: prev.days.map((d) =>
        d.id === _dayId
          ? {
              ...d,
              activities: d.activities.map((a) => {
                const updated = updates.find((u) => u.id === a.id);
                return updated ?? a;
              }),
            }
          : d
      ),
    }));
  };

  const downloadPdf = async (mode: PlannerExportVariant) => {
    if (pdfLoading) return;
    setPdfError(null);
    setPdfLoading(mode);
    try {
      await downloadPlannerPdf(trip.id, mode);
    } catch (err) {
      setPdfError(
        err instanceof Error ? err.message : "PDF export failed. Please try again."
      );
    } finally {
      setPdfLoading(null);
    }
  };

  const linkClient = (clientId: string) => {
    if (!clientId) {
      const next = { ...trip, client_id: null };
      setTrip(next);
      persist(next);
      return;
    }
    const client = clients.find((c) => c.id === Number(clientId));
    if (client) {
      const next = {
        ...trip,
        client_id: client.id,
        client_name: client.full_name,
      };
      setTrip(next);
      persist(next);
    }
  };

  const statusLabel = pdfLoading
    ? `Generating ${pdfLoading === "concierge" ? "concierge" : "client"} PDF…`
    : saving
      ? "Saving…"
      : saved
        ? "Saved"
        : "";

  return (
    <div className={`lux-studio${viewMode === "client" ? " lux-studio--client" : " lux-studio--concierge"}`}>
      <div className="lux-toolbar">
        <div className="lux-toolbar-left">
          <Link href="/planner" className="lux-toolbar-back">
            ← Planners
          </Link>
          {viewMode === "concierge" ? (
            <PlannerConciergeNav destination={trip.destination} />
          ) : null}
          {statusLabel ? (
            <span className="lux-toolbar-status">{statusLabel}</span>
          ) : null}
        </div>
        <div className="lux-toolbar-center">
          <div className="lux-toolbar-toggle">
            <button
              type="button"
              className={viewMode === "concierge" ? "is-active" : ""}
              onClick={() => setViewMode("concierge")}
            >
              Concierge
            </button>
            <button
              type="button"
              className={viewMode === "client" ? "is-active" : ""}
              onClick={() => {
                setPdfError(null);
                setViewMode("client");
              }}
            >
              Client preview
            </button>
          </div>
        </div>
        <div className="lux-toolbar-right">
          <button
            type="button"
            className="lux-btn lux-btn--ghost"
            disabled={pdfLoading !== null}
            onClick={() => downloadPdf("client")}
          >
            {pdfLoading === "client" ? "Generating…" : "Export Client PDF"}
          </button>
          <button
            type="button"
            className="lux-btn lux-btn--gold"
            disabled={pdfLoading !== null}
            onClick={() => downloadPdf("concierge")}
          >
            {pdfLoading === "concierge" ? "Generating…" : "Export Concierge PDF"}
          </button>
        </div>
      </div>

      {pdfError ? (
        <div className="lux-pdf-error" role="alert">
          {pdfError}
        </div>
      ) : null}

      {viewMode === "concierge" ? (
        <PlannerConciergeDashboard
          trip={trip}
          clients={clients}
          onFieldChange={updateField}
          onFieldBlur={onFieldBlur}
          onDateFieldChange={onDateFieldChange}
          onDatesCommit={onDatesCommit}
          onLinkClient={linkClient}
          onAddActivity={addActivity}
          onPatchActivity={patchActivity}
          onRemoveActivity={removeActivity}
          onUpdateSections={updateSections}
          onReorderActivities={reorderActivities}
        />
      ) : (
        <div className="lux-client-preview">
          <PlannerPreviewErrorBoundary key={`preview-${trip.id}-${trip.updated_at}`}>
            <div className="lux-print-root lux-print-root--client">
              <PlannerLuxuryDocument trip={trip} variant="client" />
            </div>
          </PlannerPreviewErrorBoundary>
        </div>
      )}
    </div>
  );
}
