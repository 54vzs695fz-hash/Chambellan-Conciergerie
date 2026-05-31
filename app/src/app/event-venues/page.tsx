"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { EventVenueRecord } from "@/lib/types";
import { LibraryNav } from "@/components/library/LibraryNav";
import { LibraryItemRow } from "@/components/library/LibraryItemRow";
import { LibraryDeleteDialog } from "@/components/library/LibraryDeleteDialog";

export default function EventVenuesPage() {
  const [items, setItems] = useState<EventVenueRecord[]>([]);
  const [q, setQ] = useState("");
  const [destination, setDestination] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (destination) params.set("destination", destination);
    if (favoritesOnly) params.set("favorites", "1");
    params.set("limit", "200");
    fetch(`/api/event-venues?${params}`)
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setItems(d); })
      .catch(() => setItems([]));
  }, [q, destination, favoritesOnly]);

  const grouped = useMemo(() => {
    const map = new Map<string, EventVenueRecord[]>();
    for (const item of items) {
      const dest = item.destination || "Other";
      if (!map.has(dest)) map.set(dest, []);
      map.get(dest)!.push(item);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [items]);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2500);
  };

  const toggleFavorite = async (id: number) => {
    await fetch(`/api/event-venues/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle_favorite" }),
    });
    setItems((prev) =>
      prev.map((v) => (v.id === id ? { ...v, is_favorite: !v.is_favorite } : v))
    );
  };

  const performDelete = async () => {
    if (deleteId === null) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/event-venues/${deleteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setItems((prev) => prev.filter((v) => v.id !== deleteId));
      setDeleteId(null);
      showToast("Event venue deleted successfully.");
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
          <h1 className="font-serif text-2xl tracking-wide">Event Venues</h1>
          <p className="text-sm text-muted mt-1">House 44, Amber Lounge, Paddock Club…</p>
        </div>
        <div className="page-header-actions">
          <Link href="/event-venues/new" className="btn-primary min-h-[44px]">New venue</Link>
        </div>
      </div>

      {toast ? (
        <p className="est-save-toast" role="status">{toast}</p>
      ) : null}

      <LibraryDeleteDialog
        open={deleteId !== null}
        itemLabel="event venue"
        count={1}
        deleting={deleting}
        onCancel={() => { if (!deleting) setDeleteId(null); }}
        onConfirm={() => void performDelete()}
      />

      <div className="grid gap-3 sm:grid-cols-3 mb-6">
        <input className="field-input" placeholder="Search venues…" value={q} onChange={(e) => setQ(e.target.value)} />
        <input className="field-input" placeholder="Filter destination" value={destination} onChange={(e) => setDestination(e.target.value)} />
        <label className="flex items-center gap-2 min-h-[44px] px-1 cursor-pointer">
          <input type="checkbox" checked={favoritesOnly} onChange={(e) => setFavoritesOnly(e.target.checked)} />
          <span className="text-sm">Favorites only</span>
        </label>
      </div>

      {grouped.length === 0 ? (
        <p className="text-sm text-muted">No event venues found.</p>
      ) : (
        <div className="est-library-groups max-w-3xl">
          {grouped.map(([dest, destItems]) => (
            <section key={dest} className="est-city-group">
              <h2 className="est-city-group-title">{dest}</h2>
              <ul className="est-row-list">
                {destItems.map((v) => (
                  <LibraryItemRow
                    key={v.id}
                    name={v.name}
                    meta={v.event_name ? `Linked: ${v.event_name}` : "Standalone venue"}
                    editHref={`/event-venues/${v.id}`}
                    isFavorite={v.is_favorite}
                    onToggleFavorite={() => void toggleFavorite(v.id)}
                    onRequestDelete={() => setDeleteId(v.id)}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
