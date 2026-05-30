"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PlannerLuxuryDocument } from "./PlannerLuxuryDocument";
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

interface Props {
  initialTrip: TripWithDays;
  clients: Client[];
}

export function PlannerEditor({ initialTrip, clients }: Props) {
  const router = useRouter();
  const [trip, setTrip] = useState(initialTrip);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [exportMode, setExportMode] = useState<PlannerExportVariant>("client");

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

  const onFieldBlur = () => persist(trip);

  const onDatesBlur = async () => {
    if (!trip.arrival_date || !trip.departure_date) return;
    const a = new Date(trip.arrival_date + "T12:00:00");
    const b = new Date(trip.departure_date + "T12:00:00");
    if (b < a) return;
    await persist(trip);
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

  const downloadPdf = (mode: PlannerExportVariant) => {
    window.open(`/api/trips/${trip.id}/pdf?mode=${mode}`, "_blank");
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

  return (
    <div className="lux-studio">
      <div className="lux-toolbar">
        <div className="lux-toolbar-left">
          <Link href="/planner" className="lux-toolbar-back">
            ← Planners
          </Link>
          <span className="lux-toolbar-status">
            {saving ? "Saving…" : saved ? "Saved" : ""}
          </span>
        </div>
        <div className="lux-toolbar-center">
          <select
            className="lux-toolbar-select"
            value={trip.client_id ?? ""}
            onChange={(e) => linkClient(e.target.value)}
            aria-label="Link client"
          >
            <option value="">Client profile</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.full_name}
              </option>
            ))}
          </select>
          <div className="lux-toolbar-toggle">
            <button
              type="button"
              className={exportMode === "client" ? "is-active" : ""}
              onClick={() => setExportMode("client")}
            >
              Client view
            </button>
            <button
              type="button"
              className={exportMode === "concierge" ? "is-active" : ""}
              onClick={() => setExportMode("concierge")}
            >
              Concierge view
            </button>
          </div>
        </div>
        <div className="lux-toolbar-right">
          <button
            type="button"
            className="lux-btn lux-btn--ghost"
            onClick={() => downloadPdf("client")}
          >
            Export Client PDF
          </button>
          <button
            type="button"
            className="lux-btn lux-btn--gold"
            onClick={() => downloadPdf("concierge")}
          >
            Export Concierge PDF
          </button>
        </div>
      </div>

      <div className="lux-canvas">
        <div className="lux-canvas-inner">
          <PlannerLuxuryDocument
            trip={trip}
            editable
            variant={exportMode}
            onFieldChange={updateField}
            onFieldBlur={onFieldBlur}
            onDatesBlur={onDatesBlur}
            onAddActivity={addActivity}
            onPatchActivity={patchActivity}
            onRemoveActivity={removeActivity}
            onUpdateSections={updateSections}
          />
        </div>
      </div>
    </div>
  );
}
