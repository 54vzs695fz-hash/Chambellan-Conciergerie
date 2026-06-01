import type { ChecklistItem } from "@/lib/types";
import {
  categoryCounts,
  isImportantChecklistItem,
  todayIsoDate,
} from "@/lib/planner/checklist-utils";

export interface ProgrammeChecklistSummary {
  done: number;
  total: number;
  urgent: number;
  open: number;
  label: string;
}

export function buildProgrammeChecklistSummary(
  items: ChecklistItem[],
  arrivalDate: string,
  departureDate: string,
  today = new Date()
): ProgrammeChecklistSummary {
  const todayStr = todayIsoDate(today);
  const { done, total } = categoryCounts(items);
  const open = total - done;
  const urgent = items.filter(
    (item) =>
      item.status !== "done" &&
      isImportantChecklistItem(item, todayStr, arrivalDate, departureDate)
  ).length;

  let label = "No open tasks";
  if (open > 0) {
    label =
      urgent > 0
        ? `${urgent} urgent · ${done}/${total} done`
        : `${open} open · ${done}/${total} done`;
  } else if (total > 0) {
    label = "All tasks complete";
  }

  return { done, total, urgent, open, label };
}

export function buildPendingCountMap(
  items: { trip_id: number }[]
): Map<number, number> {
  const map = new Map<number, number>();
  for (const item of items) {
    map.set(item.trip_id, (map.get(item.trip_id) ?? 0) + 1);
  }
  return map;
}
