"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ConciergeEventRecord } from "@/lib/types";
import { EVENT_CATEGORY_LABELS, type EventCategory } from "@/lib/events/categories";
import { LibraryNav } from "@/components/library/LibraryNav";
import { LibraryItemRow } from "@/components/library/LibraryItemRow";
import { LibraryDeleteDialog } from "@/components/library/LibraryDeleteDialog";

export default function EventsPage() {
  const [items, setItems] = useState<ConciergeEventRecord[]>([]);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [destination, setDestination] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (category) params.set("category", category);
    if (destination) params.set("destination", destination);
    if (favoritesOnly) params.set("favorites", "1");
    params.set("limit", "200");
    fetch(`/api/events?${params}`)
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setItems(d); })
      .catch(() => setItems([]));
  }, [q, category, destination, favoritesOnly]);

  const grouped = useMemo(() => {
    const map = new Map<string, Map<string, ConciergeEventRecord[]>>();
    for (const item of items) {
      const dest = item.destination || "Other";
      if (!map.has(dest)) map.set(dest, new Map());
      const catMap = map.get(dest)!;
      const cat = item.category || "other";
      if (!catMap.has(cat)) catMap.set(cat, []);
      catMap.get(cat)!.push(item);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [items]);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2500);
  };

  const toggleFavorite = async (id: number) => {
    await fetch(`/api/events/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle_favorite" }),
    });
    setItems((prev) =>
      prev.map((e) => (e.id === id ? { ...e, is_favorite: !e.is_favorite } : e))
    );
  };

  const performDelete = async () => {
    if (deleteId === null) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/events/${deleteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setItems((prev) => prev.filter((e) => e.id !== deleteId));
      setDeleteId(null);
      showToast("Event deleted successfully.");
    } catch {
      showToast("Could not delete. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="page-shell">
      <LibraryNav />
      <div className="page-header mt-6">
        <div>
          <h1 className="font-serif text-2xl tracking-wide">Events Library</h1>
          <p className="text-sm text-muted mt-1">Grand Prix, festivals, VIP experiences</p>
        </div>
        <div className="page-header-actions">
          <Link href="/events/new" className="btn-primary min-h-[44px]">New event</Link>
        </div>
      </div>

      {toast ? (
        <p className="est-save-toast" role="status">{toast}</p>
      ) : null}

      <LibraryDeleteDialog
        open={deleteId !== null}
        itemLabel="event"
        count={1}
        deleting={deleting}
        onCancel={() => { if (!deleting) setDeleteId(null); }}
        onConfirm={() => void performDelete()}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <input className="field-input" placeholder="Search events…" value={q} onChange={(e) => setQ(e.target.value)} />
        <input className="field-input" placeholder="Filter destination" value={destination} onChange={(e) => setDestination(e.target.value)} />
        <select className="field-input" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {Object.entries(EVENT_CATEGORY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 min-h-[44px] px-1 cursor-pointer">
          <input type="checkbox" checked={favoritesOnly} onChange={(e) => setFavoritesOnly(e.target.checked)} />
          <span className="text-sm">Favorites only</span>
        </label>
      </div>

      {grouped.length === 0 ? (
        <p className="text-sm text-muted">No events found.</p>
      ) : (
        <div className="est-library-groups max-w-3xl">
          {grouped.map(([dest, catMap]) => (
            <section key={dest} className="est-city-group">
              <h2 className="est-city-group-title">{dest}</h2>
              {[...catMap.entries()].map(([cat, catItems]) => (
                <div key={cat} className="mb-4">
                  <h3 className="est-category-subtitle">
                    {EVENT_CATEGORY_LABELS[cat as EventCategory] ?? cat}
                  </h3>
                  <ul className="est-row-list">
                    {catItems.map((ev) => (
                      <LibraryItemRow
                        key={ev.id}
                        name={ev.name}
                        meta={[ev.start_date, ev.end_date].filter(Boolean).join(" – ") || "Dates TBC"}
                        editHref={`/events/${ev.id}`}
                        isFavorite={ev.is_favorite}
                        onToggleFavorite={() => void toggleFavorite(ev.id)}
                        onRequestDelete={() => setDeleteId(ev.id)}
                      />
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
