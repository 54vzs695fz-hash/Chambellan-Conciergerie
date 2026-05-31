"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Establishment } from "@/lib/types";
import {
  ESTABLISHMENT_CATEGORIES,
  ESTABLISHMENT_CATEGORY_LABELS,
  type EstablishmentCategory,
} from "@/lib/establishments/categories";
import { groupEstablishmentsByDestinationAndCategory } from "@/lib/establishments/group-by-destination-category";
import { LibraryNav } from "@/components/library/LibraryNav";

export default function EstablishmentsPage() {
  const [items, setItems] = useState<Establishment[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [nameQuery, setNameQuery] = useState("");
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  useEffect(() => {
    fetch("/api/establishments/cities")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setCities(data); })
      .catch(() => setCities([]));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (nameQuery.trim()) params.set("q", nameQuery.trim());
    if (category) params.set("category", category);
    if (city) params.set("city", city);
    if (favoritesOnly) params.set("favorites", "1");
    params.set("limit", "200");
    fetch(`/api/establishments?${params}`)
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setItems(data); })
      .catch(() => setItems([]));
  }, [nameQuery, category, city, favoritesOnly]);

  const grouped = useMemo(
    () => groupEstablishmentsByDestinationAndCategory(items),
    [items]
  );

  const toggleFavorite = async (id: number) => {
    await fetch(`/api/establishments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle_favorite" }),
    });
    setItems((prev) =>
      prev.map((e) => (e.id === id ? { ...e, is_favorite: !e.is_favorite } : e))
    );
  };

  return (
    <div className="page-shell">
      <LibraryNav />
      <div className="page-header mt-6">
        <div>
          <h1 className="font-serif text-2xl tracking-wide">Establishment Library</h1>
          <p className="text-sm text-muted mt-1">
            Destination → Category → Establishments
          </p>
        </div>
        <div className="page-header-actions">
          <Link href="/establishments/import" className="btn-secondary min-h-[44px]">
            Import from website
          </Link>
          <Link href="/establishments/new" className="btn-primary min-h-[44px]">
            New establishment
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <input
          className="field-input"
          placeholder="Search by name…"
          value={nameQuery}
          onChange={(e) => setNameQuery(e.target.value)}
        />
        <select className="field-input" value={city} onChange={(e) => setCity(e.target.value)}>
          <option value="">All destinations</option>
          {cities.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select className="field-input" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {ESTABLISHMENT_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {ESTABLISHMENT_CATEGORY_LABELS[cat]}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 min-h-[44px] px-1 cursor-pointer">
          <input
            type="checkbox"
            checked={favoritesOnly}
            onChange={(e) => setFavoritesOnly(e.target.checked)}
          />
          <span className="text-sm">Favorites only</span>
        </label>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted">No establishments found.</p>
      ) : (
        <div className="est-library-groups max-w-3xl">
          {grouped.map(({ destination, categories }) => (
            <section key={destination} className="est-city-group">
              <h2 className="est-city-group-title">{destination}</h2>
              {categories.map(({ category: cat, categoryLabel, items: catItems }) => (
                <div key={cat} className="mb-4">
                  <h3 className="est-category-subtitle">{categoryLabel}</h3>
                  <ul className="space-y-2">
                    {catItems.map((est) => (
                      <li key={est.id} className="flex gap-2 items-stretch">
                        <button
                          type="button"
                          className={`est-fav-btn${est.is_favorite ? " is-active" : ""}`}
                          onClick={() => void toggleFavorite(est.id)}
                          aria-label="Toggle favorite"
                        >
                          ★
                        </button>
                        <Link
                          href={`/establishments/${est.id}`}
                          className="card flex-1 block px-5 py-4 hover:border-gold/40 min-h-[44px]"
                        >
                          <p className="font-medium">{est.name}</p>
                          {est.phone ? (
                            <p className="text-xs text-muted mt-1">{est.phone}</p>
                          ) : null}
                        </Link>
                      </li>
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
