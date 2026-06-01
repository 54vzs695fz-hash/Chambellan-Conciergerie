import type { ChecklistCategory, ChecklistItem } from "@/lib/types";

function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function isActiveProgramme(
  arrivalDate: string,
  departureDate: string,
  todayStr: string
): boolean {
  if (departureDate && departureDate < todayStr) return false;
  return true;
}

export function isImportantChecklistItem(
  item: ChecklistItem,
  todayStr: string,
  arrivalDate: string,
  departureDate: string
): boolean {
  if (item.status === "done") return false;
  if (!isActiveProgramme(arrivalDate, departureDate, todayStr)) return false;

  if (item.reminder_date && item.reminder_date <= todayStr) return true;
  if (item.due_date && item.due_date <= addDaysIso(todayStr, 7)) return true;
  if (item.status === "in_progress") return true;
  if (
    item.status === "todo" &&
    arrivalDate &&
    arrivalDate <= addDaysIso(todayStr, 14)
  ) {
    return true;
  }
  return false;
}

export type SectionStatus = "complete" | "pending" | "urgent";

export function sectionStatus(
  items: ChecklistItem[],
  todayStr: string,
  arrivalDate: string,
  departureDate: string
): SectionStatus {
  if (items.length === 0) return "complete";
  const pending = items.filter((i) => i.status !== "done");
  if (pending.length === 0) return "complete";
  const urgent = pending.some((i) =>
    isImportantChecklistItem(i, todayStr, arrivalDate, departureDate)
  );
  return urgent ? "urgent" : "pending";
}

export function categoryCounts(items: ChecklistItem[]) {
  const done = items.filter((i) => i.status === "done").length;
  const pending = items.length - done;
  return { done, pending, total: items.length };
}

export function todayIsoDate(today = new Date()): string {
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
