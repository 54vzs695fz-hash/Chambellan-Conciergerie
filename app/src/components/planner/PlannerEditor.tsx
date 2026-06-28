"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
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
  TripFollowUpStatus,
  TripWithDays,
} from "@/lib/types";
import type { PlannerHostOption } from "@/lib/planner/planner-sheet-model";
import { PLANNER_HOST_PROFILES } from "@/lib/planner/planner-sheet-model";
import type { PlannerExportVariant } from "@/lib/planner/planner-sheet-model";
import {
  datesMatchRange,
  syncTripDaysInState,
} from "@/lib/planner/trip-days-sync";
import { resolveDashboardDestinationDisplay } from "@/lib/planner/trip-destinations";
import type { TripDestinationFields as TripDestinationState } from "@/lib/planner/trip-destinations";
import { downloadPlannerPdf } from "./planner-pdf-download";
import { PlannerPdfExportModal } from "./PlannerPdfExportModal";
import { PlannerPreviewErrorBoundary } from "./PlannerPreviewErrorBoundary";
import { PlannerExportReadyGate } from "./PlannerExportReadyGate";
import { usePlannerSave } from "./use-planner-save";
import {
  buildDefaultPlannerPdfFilename,
  sanitizePdfFilename,
} from "@/lib/planner/planner-pdf-filename";

type ViewMode = "concierge" | "client";
type PreviewDisplay = "fit" | "full";

interface Props {
  initialTrip: TripWithDays;
}

function patchActivityInTrip(
  prev: TripWithDays,
  activityId: number,
  fields: Partial<Activity>
): TripWithDays {
  return {
    ...prev,
    days: prev.days.map((day) => {
      const index = day.activities.findIndex((a) => a.id === activityId);
      if (index < 0) return day;
      const activities = [...day.activities];
      activities[index] = { ...activities[index], ...fields };
      return { ...day, activities };
    }),
  };
}

export function PlannerEditor({ initialTrip }: Props) {
  const [trip, setTrip] = useState(initialTrip);
  const [clientPreviewTrip, setClientPreviewTrip] =
    useState<TripWithDays | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("concierge");
  const [pdfLoading, setPdfLoading] = useState<PlannerExportVariant | null>(
    null
  );
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [previewDisplay, setPreviewDisplay] = useState<PreviewDisplay>("fit");
  const [isMobile, setIsMobile] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 767px)").matches
  );
  const [pdfExportModal, setPdfExportModal] =
    useState<PlannerExportVariant | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const {
    saveStatus,
    tripRef,
    persistTrip,
    scheduleTripPersist,
    flushTripPersist,
    scheduleActivityPatch,
    flushAll,
  } = usePlannerSave(initialTrip.id);

  tripRef.current = trip;

  useEffect(() => {
    fetch("/api/clients")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setClients(data);
      })
      .catch(() => {});
  }, []);

  const applyTripUpdate = useCallback(
    (updater: (prev: TripWithDays) => TripWithDays, persistNow = false) => {
      setTrip((prev) => {
        const next = updater(prev);
        tripRef.current = next;
        if (persistNow) {
          void persistTrip(next).then((updated) => {
            if (updated) setTrip(updated);
          });
        } else {
          scheduleTripPersist(next);
        }
        return next;
      });
    },
    [persistTrip, scheduleTripPersist, tripRef]
  );

  const persist = useCallback(
    async (next: TripWithDays): Promise<TripWithDays | null> => {
      const updated = await persistTrip(next);
      if (updated) {
        setTrip(updated);
        if (viewMode === "client") setClientPreviewTrip(updated);
      }
      return updated;
    },
    [persistTrip, viewMode]
  );

  const resolveDayId = useCallback(
    async (dayId: number, currentTrip: TripWithDays): Promise<number | null> => {
      if (dayId > 0) return dayId;
      const optimisticDay = currentTrip.days.find((d) => d.id === dayId);
      if (!optimisticDay) return null;
      const updated = await persist(currentTrip);
      if (!updated) return null;
      return updated.days.find((d) => d.date === optimisticDay.date)?.id ?? null;
    },
    [persist]
  );

  const updateField = <K extends keyof TripWithDays>(
    key: K,
    value: TripWithDays[K]
  ) => {
    applyTripUpdate((prev) => ({ ...prev, [key]: value }));
  };

  const updateDestinationFields = (fields: TripDestinationState) => {
    applyTripUpdate((prev) => ({ ...prev, ...fields }));
  };

  const updateHost = (hostName: PlannerHostOption) => {
    applyTripUpdate((prev) => ({
      ...prev,
      host_name: hostName,
      host_phone: PLANNER_HOST_PROFILES[hostName].phone,
    }));
  };

  const updateStatus = (status: TripFollowUpStatus) => {
    applyTripUpdate((prev) => ({ ...prev, follow_up_status: status }), true);
  };

  const onFieldBlur = () => {
    void flushTripPersist().then((updated) => {
      if (updated) setTrip(updated);
    });
  };

  const onDateFieldChange = (
    key: "arrival_date" | "departure_date",
    value: string
  ) => {
    setTrip((prev) => {
      const synced = syncTripDaysInState({ ...prev, [key]: value });
      tripRef.current = synced;
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
      tripRef.current = synced;
      if (synced.arrival_date && synced.departure_date) {
        void persist(synced);
      }
      return synced;
    });
  };

  const updateSections = async (dayId: number, sections: DaySection[]) => {
    const resolvedId = await resolveDayId(dayId, trip);
    if (!resolvedId) return;
    const res = await fetch(`/api/trip-days/${resolvedId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sections }),
    });
    if (!res.ok) return;
    const updated = await res.json();
    setTrip((prev) => ({
      ...prev,
      days: prev.days.map((d) =>
        d.id === dayId || d.id === resolvedId
          ? { ...d, id: resolvedId, sections: updated.sections ?? sections }
          : d
      ),
    }));
  };

  const addActivity = async (
    dayId: number,
    period: string,
    activity_type: ActivityType
  ) => {
    const resolvedId = await resolveDayId(dayId, trip);
    if (!resolvedId) return;
    const res = await fetch(`/api/trips/${trip.id}/activities`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trip_day_id: resolvedId, period, activity_type }),
    });
    if (!res.ok) return;
    const activity: Activity = await res.json();
    setTrip((prev) => ({
      ...prev,
      days: prev.days.map((d) =>
        d.id === dayId || d.id === resolvedId
          ? {
              ...d,
              id: resolvedId,
              activities: [...d.activities, activity],
            }
          : d
      ),
    }));
  };

  const patchActivity = useCallback(
    (
      id: number,
      fields: Partial<Activity>,
      options?: { immediate?: boolean }
    ) => {
      setTrip((prev) => patchActivityInTrip(prev, id, fields));
      scheduleActivityPatch(id, fields, options?.immediate ?? false);
    },
    [scheduleActivityPatch]
  );

  const removeActivity = async (id: number) => {
    if (id <= 0) return;
    const res = await fetch(`/api/activities/${id}`, { method: "DELETE" });
    if (!res.ok) return;
    setTrip((prev) => ({
      ...prev,
      days: prev.days.map((d) => ({
        ...d,
        activities: d.activities.filter((a) => a.id !== id),
      })),
    }));
  };

  const reorderActivities = async (
    dayId: number,
    _sectionId: string,
    orderedIds: number[]
  ) => {
    const validIds = orderedIds.filter((id) => id > 0);
    if (!validIds.length) return;
    const updates = await Promise.all(
      validIds.map((id, index) =>
        fetch(`/api/activities/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sort_order: index }),
        }).then((r) => (r.ok ? (r.json() as Promise<Activity>) : null))
      )
    );
    const saved = updates.filter(Boolean) as Activity[];
    if (!saved.length) return;
    setTrip((prev) => ({
      ...prev,
      days: prev.days.map((d) =>
        d.id === dayId
          ? {
              ...d,
              activities: d.activities.map((a) => {
                const updated = saved.find((u) => u.id === a.id);
                return updated ?? a;
              }),
            }
          : d
      ),
    }));
  };

  const downloadPdf = async (
    mode: PlannerExportVariant,
    filename?: string
  ) => {
    if (pdfLoading) return;
    setPdfError(null);
    setPdfLoading(mode);
    try {
      await flushAll();
      await downloadPlannerPdf(
        trip.id,
        mode,
        sanitizePdfFilename(
          filename ?? buildDefaultPlannerPdfFilename(mode, trip)
        ),
        { preferShare: isMobile, trip }
      );
      setPdfExportModal(null);
    } catch (err) {
      setPdfError(
        err instanceof Error ? err.message : "PDF export failed. Please try again."
      );
    } finally {
      setPdfLoading(null);
    }
  };

  const requestPdfExport = (mode: PlannerExportVariant) => {
    if (pdfLoading) return;
    setPdfError(null);
    if (isMobile) {
      setPdfExportModal(mode);
      return;
    }
    void downloadPdf(mode);
  };

  const confirmPdfExport = (filename: string) => {
    if (!pdfExportModal || pdfLoading) return;
    void downloadPdf(pdfExportModal, filename);
  };

  const linkClient = (clientId: string) => {
    if (!clientId) {
      const next = { ...trip, client_id: null };
      setTrip(next);
      void persist(next);
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
      void persist(next);
    }
  };

  const switchToClientPreview = async () => {
    setPdfError(null);
    await flushAll();
    setClientPreviewTrip(tripRef.current ?? trip);
    setPreviewDisplay("fit");
    setViewMode("client");
  };

  const statusLabel = pdfLoading
    ? "Generating PDF…"
    : saveStatus === "saving"
      ? "Saving…"
      : saveStatus === "saved"
        ? "Saved"
        : saveStatus === "error"
          ? "Error saving"
          : "";

  const previewTrip = clientPreviewTrip ?? trip;
  const navDestination = resolveDashboardDestinationDisplay(trip, "Weekly planner");

  return (
    <div className={`lux-studio has-mobile-nav${viewMode === "client" ? " lux-studio--client" : " lux-studio--concierge"}`}>
      <div className="lux-toolbar">
        <div className="lux-toolbar-left">
          <Link href="/planner" className="lux-toolbar-back">
            ← Planners
          </Link>
          {viewMode === "concierge" ? (
            <PlannerConciergeNav
              destination={navDestination.primary}
              destinationSubtitle={navDestination.secondary}
            />
          ) : null}
          {statusLabel ? (
            <span
              className={`lux-toolbar-status${saveStatus === "error" ? " lux-toolbar-status--error" : ""}`}
            >
              {statusLabel}
            </span>
          ) : null}
        </div>
        <div className="lux-toolbar-center lux-toolbar-desktop-only">
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
              onClick={() => void switchToClientPreview()}
            >
              Client preview
            </button>
          </div>
        </div>
        <div className="lux-toolbar-right lux-toolbar-desktop-only">
          <button
            type="button"
            className="lux-btn lux-btn--ghost"
            disabled={pdfLoading !== null}
            onClick={() => requestPdfExport("client")}
          >
            {pdfLoading === "client" ? (
              "Generating PDF…"
            ) : (
              <>
                <span className="lux-export-label lux-export-label--long">
                  Export Client PDF
                </span>
                <span className="lux-export-label lux-export-label--short">
                  Client PDF
                </span>
              </>
            )}
          </button>
          <button
            type="button"
            className="lux-btn lux-btn--gold"
            disabled={pdfLoading !== null}
            onClick={() => requestPdfExport("concierge")}
          >
            {pdfLoading === "concierge" ? (
              "Generating PDF…"
            ) : (
              <>
                <span className="lux-export-label lux-export-label--long">
                  Export Concierge PDF
                </span>
                <span className="lux-export-label lux-export-label--short">
                  Concierge PDF
                </span>
              </>
            )}
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
          onDestinationFieldsChange={updateDestinationFields}
          onHostChange={updateHost}
          onFieldBlur={onFieldBlur}
          onDateFieldChange={onDateFieldChange}
          onDatesCommit={onDatesCommit}
          onLinkClient={linkClient}
          onStatusChange={updateStatus}
          onAddActivity={addActivity}
          onPatchActivity={patchActivity}
          onRemoveActivity={removeActivity}
          onUpdateSections={updateSections}
          onReorderActivities={reorderActivities}
        />
      ) : (
        <div
          className={`lux-client-preview lux-client-preview--${previewDisplay}`}
        >
          <div className="lux-client-preview-controls md:hidden">
            <button
              type="button"
              className={previewDisplay === "fit" ? "is-active" : ""}
              onClick={() => setPreviewDisplay("fit")}
            >
              Fit to screen
            </button>
            <button
              type="button"
              className={previewDisplay === "full" ? "is-active" : ""}
              onClick={() => setPreviewDisplay("full")}
            >
              Full size
            </button>
          </div>
          <div className="lux-client-preview-scroller">
            <div className="lux-client-preview-scaler">
              <div className="lux-client-preview-stage">
                <PlannerPreviewErrorBoundary
                  key={`preview-${trip.id}-${previewTrip.updated_at}`}
                >
                  <div className="lux-print-root lux-print-root--client">
                    <PlannerLuxuryDocument trip={previewTrip} variant="client" />
                    <PlannerExportReadyGate trip={previewTrip} variant="client" />
                  </div>
                </PlannerPreviewErrorBoundary>
              </div>
            </div>
          </div>
        </div>
      )}

      <div
        className="lux-mobile-action-bar md:hidden"
        role="toolbar"
        aria-label="Planner actions"
      >
        <div className="lux-toolbar-toggle lux-mobile-action-toggle">
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
            onClick={() => void switchToClientPreview()}
          >
            Client preview
          </button>
        </div>
        <div className="lux-mobile-action-exports">
          <button
            type="button"
            className="lux-btn lux-btn--ghost"
            disabled={pdfLoading !== null}
            onClick={() => requestPdfExport("client")}
          >
            {pdfLoading === "client" ? "Generating PDF…" : "Export Client PDF"}
          </button>
          <button
            type="button"
            className="lux-btn lux-btn--gold"
            disabled={pdfLoading !== null}
            onClick={() => requestPdfExport("concierge")}
          >
            {pdfLoading === "concierge" ? "Generating PDF…" : "Export Concierge PDF"}
          </button>
        </div>
      </div>

      <PlannerPdfExportModal
        open={pdfExportModal !== null}
        mode={pdfExportModal ?? "client"}
        defaultFilename={
          pdfExportModal
            ? buildDefaultPlannerPdfFilename(pdfExportModal, trip)
            : ""
        }
        loading={pdfLoading !== null && pdfExportModal !== null}
        onConfirm={confirmPdfExport}
        onCancel={() => {
          if (!pdfLoading) setPdfExportModal(null);
        }}
      />
    </div>
  );
}
