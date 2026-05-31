"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { EventVenueRecord } from "@/lib/types";
import { LibraryNav } from "@/components/library/LibraryNav";

export default function EventVenuesPage() {
  const [items, setItems] = useState<EventVenueRecord[]>([]);
  const [q, setQ] = useState("");
  const [destination, setDestination] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);

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
              <ul className="space-y-2">
                {destItems.map((v) => (
                  <li key={v.id} className="flex gap-2 items-stretch">
                    <button
                      type="button"
                      className={`est-fav-btn${v.is_favorite ? " is-active" : ""}`}
                      onClick={() => void toggleFavorite(v.id)}
                      aria-label="Toggle favorite"
                    >
                      ★
                    </button>
                    <Link href={`/event-venues/${v.id}`} className="card flex-1 block px-5 py-4 hover:border-gold/40 min-h-[44px]">
                      <p className="font-medium">{v.name}</p>
                      <p className="text-xs text-muted mt-1">
                        {v.event_name ? `Linked: ${v.event_name}` : "Standalone venue"}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
