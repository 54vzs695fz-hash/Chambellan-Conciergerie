"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarChecklistPanel } from "@/components/calendar/CalendarChecklistPanel";
import type { PendingChecklistItem } from "@/lib/types";

interface Props {
  initialItems: PendingChecklistItem[];
}

export function DashboardChecklistWidget({ initialItems }: Props) {
  const [items, setItems] = useState(initialItems);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  useEffect(() => {
    const refresh = async () => {
      const res = await fetch("/api/checklist/pending");
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) setItems(data as PendingChecklistItem[]);
    };
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const handleMarkDone = async (id: number) => {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/checklist-items/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "done" }),
      });
      if (!res.ok) throw new Error("Update failed");
      setItems((prev) => prev.filter((item) => item.id !== id));
    } finally {
      setUpdatingId(null);
    }
  };

  if (items.length === 0) return null;

  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title">Pending checklist</h2>
        <Link href="/calendar" className="btn-ghost">
          Open calendar
        </Link>
      </div>
      <CalendarChecklistPanel
        items={items}
        updatingId={updatingId}
        onMarkDone={handleMarkDone}
      />
    </section>
  );
}
