"use client";

import Link from "next/link";
import {
  CHECKLIST_CATEGORY_LABELS,
  CHECKLIST_STATUS_LABELS,
} from "@/lib/planner/checklist-defaults";
import type { PendingChecklistItem } from "@/lib/types";

interface Props {
  items: PendingChecklistItem[];
  updatingId: number | null;
  onMarkDone: (id: number) => void;
}

function formatDueHint(item: PendingChecklistItem): string {
  if (item.reminder_date) return `Reminder ${item.reminder_date}`;
  if (item.due_date) return `Due ${item.due_date}`;
  return CHECKLIST_STATUS_LABELS[item.status];
}

export function CalendarChecklistPanel({
  items,
  updatingId,
  onMarkDone,
}: Props) {
  if (items.length === 0) return null;

  return (
    <section className="cal-reminder-panel cal-checklist-panel">
      <h2 className="cal-reminder-title">Pending checklist</h2>
      <ul className="cal-reminder-list">
        {items.map((item) => (
          <li key={item.id} className="cal-reminder-item cal-checklist-item">
            <div className="cal-checklist-row">
              <div className="cal-checklist-copy">
                <Link
                  href={item.planner_href}
                  className="font-serif text-gold tracking-wide"
                >
                  {item.client_name || "Client"} · {item.destination || "Programme"}
                </Link>
                <p className="cal-checklist-task">
                  {CHECKLIST_CATEGORY_LABELS[item.category]} — {item.title}
                </p>
                <p className="cal-reminder-meta">{formatDueHint(item)}</p>
              </div>
              <button
                type="button"
                className="cal-checklist-done min-h-[44px]"
                disabled={updatingId === item.id}
                onClick={() => onMarkDone(item.id)}
              >
                {updatingId === item.id ? "…" : "Done"}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
