"use client";

import { useLayoutEffect } from "react";
import { lockPlannerPrintLayout } from "@/lib/pdf/lock-planner-print-layout";

export function PlannerPrintLayoutLock() {
  useLayoutEffect(() => {
    lockPlannerPrintLayout();
    const retry = window.setTimeout(lockPlannerPrintLayout, 50);
    return () => window.clearTimeout(retry);
  }, []);

  return null;
}
