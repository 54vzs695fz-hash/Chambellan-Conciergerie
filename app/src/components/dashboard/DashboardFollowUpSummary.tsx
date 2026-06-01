"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { KIND_LABELS } from "@/lib/dashboard/follow-up-summary";
import type { DashboardFollowUpItem } from "@/lib/types";

interface Props {
  initialItems: DashboardFollowUpItem[];
}

export function DashboardFollowUpSummary({ initialItems }: Props) {
  const [items, setItems] = useState(initialItems);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  useEffect(() => {
    const refresh = async () => {
      const res = await fetch("/api/dashboard/follow-up");
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) setItems(data as DashboardFollowUpItem[]);
    };
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const handleMarkDone = async (checklistItemId: number) => {
    setUpdatingId(checklistItemId);
    try {
      const res = await fetch(`/api/checklist-items/${checklistItemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "done" }),
      });
      if (!res.ok) throw new Error("Update failed");
      setItems((prev) =>
        prev.filter((item) => item.checklistItemId !== checklistItemId)
      );
    } finally {
      setUpdatingId(null);
    }
  };

  if (items.length === 0) return null;

  return (
    <section className="dash-follow-up mb-10" data-section="planner">
      <div className="dash-follow-up-head">
        <h2 className="section-title">Follow-up</h2>
        <Link href="/calendar" className="btn-ghost">
          Calendar
        </Link>
      </div>
      <ul className="dash-follow-up-list">
        {items.map((item) => (
          <li
            key={item.key}
            className={`dash-follow-up-item dash-card ${
              item.kind === "urgent" ? "dash-card--urgent" : "dash-card--follow-up"
            }`}
          >
            <div className="dash-follow-up-copy">
              <span className={`dash-follow-up-kind dash-follow-up-kind--${item.kind}`}>
                {KIND_LABELS[item.kind]}
              </span>
              <p className="dash-follow-up-client">
                {item.client_name}
                <span className="dash-follow-up-sep">·</span>
                {item.destination}
              </p>
              <p className="dash-follow-up-task">{item.task}</p>
              {item.timing ? (
                <p className="dash-follow-up-timing">{item.timing}</p>
              ) : null}
            </div>
            {item.checklistItemId ? (
              <button
                type="button"
                className="dash-follow-up-done min-h-[44px]"
                disabled={updatingId === item.checklistItemId}
                onClick={() => void handleMarkDone(item.checklistItemId!)}
              >
                {updatingId === item.checklistItemId ? "…" : "Done"}
              </button>
            ) : (
              <Link
                href="/calendar"
                className="dash-follow-up-view min-h-[44px]"
              >
                View
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
