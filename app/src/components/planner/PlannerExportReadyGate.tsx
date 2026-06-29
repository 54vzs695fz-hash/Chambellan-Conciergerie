"use client";

import { useLayoutEffect } from "react";
import type { TripWithDays } from "@/lib/types";
import {
  getFilledConciergeTeam,
  getClientItineraryContacts,
  type PlannerExportVariant,
} from "@/lib/planner/planner-sheet-model";
import { lockPlannerPrintLayout } from "@/lib/pdf/lock-planner-print-layout";
import {
  formatPlannerExportDebugLog,
  getPlannerExportManifest,
  measurePlannerExportDom,
  plannerExportDomMatchesManifest,
  plannerExportHasRenderableContent,
  type PlannerExportDomCounts,
} from "@/lib/pdf/planner-export-manifest";

const MAX_READY_ATTEMPTS = 80;
const RETRY_MS = 50;

async function waitForPaint(): Promise<void> {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

async function waitForImages(): Promise<void> {
  await Promise.all(
    Array.from(document.images).map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) {
            resolve();
            return;
          }
          img.onload = () => resolve();
          img.onerror = () => resolve();
        })
    )
  );
}

export interface PlannerExportReadyGateProps {
  trip: TripWithDays;
  variant: PlannerExportVariant;
}

export function PlannerExportReadyGate({
  trip,
  variant,
}: PlannerExportReadyGateProps) {
  useLayoutEffect(() => {
    let cancelled = false;
    let attempts = 0;

    let expected = getPlannerExportManifest(
      trip,
      variant,
      getClientItineraryContacts(trip).length,
      variant === "concierge" ? getFilledConciergeTeam(trip).length : 0
    );

    document.documentElement.removeAttribute("data-lux-export-ready");
    document.documentElement.removeAttribute("data-lux-print-ready");
    document.documentElement.setAttribute(
      "data-lux-export-expected",
      JSON.stringify(expected)
    );

    function markReady(actual: PlannerExportDomCounts) {
      document.documentElement.setAttribute(
        "data-lux-export-actual",
        JSON.stringify(actual)
      );
      document.documentElement.setAttribute(
        "data-lux-export-debug",
        formatPlannerExportDebugLog(expected, actual)
      );
      document.documentElement.setAttribute("data-lux-export-ready", "true");
      document.documentElement.setAttribute("data-lux-print-ready", "true");
    }

    async function tryMarkReady(): Promise<void> {
      if (cancelled) return;

      attempts += 1;
      await document.fonts.ready;
      await waitForImages();
      await waitForPaint();

      expected = getPlannerExportManifest(
        trip,
        variant,
        getClientItineraryContacts(trip).length,
        variant === "concierge" ? getFilledConciergeTeam(trip).length : 0
      );
      document.documentElement.setAttribute(
        "data-lux-export-expected",
        JSON.stringify(expected)
      );

      const actual = measurePlannerExportDom(variant);
      const strictMatch = plannerExportDomMatchesManifest(expected, actual);
      const renderable = plannerExportHasRenderableContent(expected, actual);

      if (!strictMatch) {
        if (attempts < MAX_READY_ATTEMPTS) {
          window.setTimeout(() => {
            void tryMarkReady();
          }, RETRY_MS);
          return;
        }

        if (renderable) {
          try {
            lockPlannerPrintLayout();
          } catch (err) {
            console.warn("lockPlannerPrintLayout failed:", err);
          }
          await waitForPaint();
          const afterLock = measurePlannerExportDom(variant);
          markReady(afterLock);
          return;
        }

        if (document.querySelector(".lux-print-root .lux-document")) {
          markReady(measurePlannerExportDom(variant));
        }
        return;
      }

      try {
        lockPlannerPrintLayout();
      } catch (err) {
        console.warn("lockPlannerPrintLayout failed:", err);
      }
      await waitForPaint();

      const afterLock = measurePlannerExportDom(variant);
      if (
        plannerExportDomMatchesManifest(expected, afterLock) ||
        plannerExportHasRenderableContent(expected, afterLock)
      ) {
        markReady(afterLock);
        return;
      }

      if (attempts < MAX_READY_ATTEMPTS) {
        window.setTimeout(() => {
          void tryMarkReady();
        }, RETRY_MS);
        return;
      }

      if (plannerExportHasRenderableContent(expected, afterLock)) {
        markReady(afterLock);
        return;
      }

      if (document.querySelector(".lux-print-root .lux-document")) {
        markReady(afterLock);
      }
    }

    void tryMarkReady();

    return () => {
      cancelled = true;
    };
  }, [trip, variant]);

  return null;
}
