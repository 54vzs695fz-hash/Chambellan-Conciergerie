"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Activity, ChecklistItem, TripWithDays } from "@/lib/types";
import { tripPayloadForApi } from "@/lib/planner/planner-sheet-model";

export const PLANNER_AUTOSAVE_MS = 800;

type SaveStatus = "idle" | "saving" | "saved" | "error";

export function usePlannerSave(tripId: number) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const tripRef = useRef<TripWithDays | null>(null);
  const tripPersistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activityTimers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const pendingActivityPatches = useRef(new Map<number, Partial<Activity>>());
  const checklistTimers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const pendingChecklistPatches = useRef(
    new Map<number, Partial<ChecklistItem>>()
  );
  const inFlight = useRef(0);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const markSaving = useCallback(() => {
    inFlight.current += 1;
    setSaveStatus("saving");
  }, []);

  const markSuccess = useCallback(() => {
    inFlight.current = Math.max(0, inFlight.current - 1);
    if (inFlight.current === 0) {
      setSaveStatus("saved");
      if (savedTimer.current) clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setSaveStatus("idle"), 2000);
    }
  }, []);

  const markError = useCallback(() => {
    inFlight.current = Math.max(0, inFlight.current - 1);
    if (inFlight.current === 0) {
      setSaveStatus("error");
      if (savedTimer.current) clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setSaveStatus("idle"), 4000);
    }
  }, []);

  const persistTrip = useCallback(
    async (next: TripWithDays): Promise<TripWithDays | null> => {
      markSaving();
      try {
        const res = await fetch(`/api/trips/${tripId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(tripPayloadForApi(next)),
        });
        if (!res.ok) {
          markError();
          return null;
        }
        const updated: TripWithDays = await res.json();
        tripRef.current = updated;
        markSuccess();
        return updated;
      } catch {
        markError();
        return null;
      }
    },
    [tripId, markSaving, markSuccess, markError]
  );

  const scheduleTripPersist = useCallback(
    (next: TripWithDays) => {
      tripRef.current = next;
      if (tripPersistTimer.current) clearTimeout(tripPersistTimer.current);
      tripPersistTimer.current = setTimeout(() => {
        tripPersistTimer.current = null;
        void persistTrip(next);
      }, PLANNER_AUTOSAVE_MS);
    },
    [persistTrip]
  );

  const flushTripPersist = useCallback(async (): Promise<TripWithDays | null> => {
    if (tripPersistTimer.current) {
      clearTimeout(tripPersistTimer.current);
      tripPersistTimer.current = null;
    }
    if (!tripRef.current) return null;
    return persistTrip(tripRef.current);
  }, [persistTrip]);

  const flushActivityPatch = useCallback(
    async (activityId: number): Promise<Activity | null> => {
      if (activityId <= 0) return null;
      const fields = pendingActivityPatches.current.get(activityId);
      if (!fields || Object.keys(fields).length === 0) return null;
      pendingActivityPatches.current.delete(activityId);

      markSaving();
      try {
        const res = await fetch(`/api/activities/${activityId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(fields),
        });
        if (!res.ok) {
          markError();
          return null;
        }
        markSuccess();
        return (await res.json()) as Activity;
      } catch {
        markError();
        return null;
      }
    },
    [markSaving, markSuccess, markError]
  );

  const scheduleActivityPatch = useCallback(
    (activityId: number, fields: Partial<Activity>, immediate = false) => {
      if (activityId <= 0) return;
      pendingActivityPatches.current.set(activityId, {
        ...pendingActivityPatches.current.get(activityId),
        ...fields,
      });

      const existing = activityTimers.current.get(activityId);
      if (existing) clearTimeout(existing);

      if (immediate) {
        activityTimers.current.delete(activityId);
        void flushActivityPatch(activityId);
        return;
      }

      activityTimers.current.set(
        activityId,
        setTimeout(() => {
          activityTimers.current.delete(activityId);
          void flushActivityPatch(activityId);
        }, PLANNER_AUTOSAVE_MS)
      );
    },
    [flushActivityPatch]
  );

  const flushAllActivityPatches = useCallback(async () => {
    for (const timer of activityTimers.current.values()) {
      clearTimeout(timer);
    }
    activityTimers.current.clear();
    const ids = [...pendingActivityPatches.current.keys()];
    await Promise.all(ids.map((id) => flushActivityPatch(id)));
  }, [flushActivityPatch]);

  const flushChecklistPatch = useCallback(
    async (itemId: number): Promise<ChecklistItem | null> => {
      if (itemId <= 0) return null;
      const fields = pendingChecklistPatches.current.get(itemId);
      if (!fields || Object.keys(fields).length === 0) return null;
      pendingChecklistPatches.current.delete(itemId);

      markSaving();
      try {
        const res = await fetch(`/api/checklist-items/${itemId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(fields),
        });
        if (!res.ok) {
          markError();
          return null;
        }
        markSuccess();
        return (await res.json()) as ChecklistItem;
      } catch {
        markError();
        return null;
      }
    },
    [markSaving, markSuccess, markError]
  );

  const scheduleChecklistPatch = useCallback(
    (itemId: number, fields: Partial<ChecklistItem>, immediate = false) => {
      if (itemId <= 0) return;
      if (Object.keys(fields).length > 0) {
        pendingChecklistPatches.current.set(itemId, {
          ...pendingChecklistPatches.current.get(itemId),
          ...fields,
        });
      }

      const existing = checklistTimers.current.get(itemId);
      if (existing) clearTimeout(existing);

      if (immediate) {
        checklistTimers.current.delete(itemId);
        void flushChecklistPatch(itemId);
        return;
      }

      checklistTimers.current.set(
        itemId,
        setTimeout(() => {
          checklistTimers.current.delete(itemId);
          void flushChecklistPatch(itemId);
        }, PLANNER_AUTOSAVE_MS)
      );
    },
    [flushChecklistPatch]
  );

  const flushAllChecklistPatches = useCallback(async () => {
    for (const timer of checklistTimers.current.values()) {
      clearTimeout(timer);
    }
    checklistTimers.current.clear();
    const ids = [...pendingChecklistPatches.current.keys()];
    await Promise.all(ids.map((id) => flushChecklistPatch(id)));
  }, [flushChecklistPatch]);

  const flushAll = useCallback(async (): Promise<TripWithDays | null> => {
    await flushAllActivityPatches();
    await flushAllChecklistPatches();
    return flushTripPersist();
  }, [flushAllActivityPatches, flushAllChecklistPatches, flushTripPersist]);

  useEffect(() => {
    return () => {
      if (tripPersistTimer.current) clearTimeout(tripPersistTimer.current);
      if (savedTimer.current) clearTimeout(savedTimer.current);
      for (const timer of activityTimers.current.values()) {
        clearTimeout(timer);
      }
      for (const timer of checklistTimers.current.values()) {
        clearTimeout(timer);
      }
    };
  }, []);

  return {
    saveStatus,
    tripRef,
    persistTrip,
    scheduleTripPersist,
    flushTripPersist,
    scheduleActivityPatch,
    flushActivityPatch,
    scheduleChecklistPatch,
    flushAll,
  };
}
