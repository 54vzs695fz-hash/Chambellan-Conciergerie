"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Establishment } from "@/lib/types";
import {
  ESTABLISHMENT_CATEGORIES,
  ESTABLISHMENT_CATEGORY_LABELS,
  type EstablishmentCategory,
} from "@/lib/establishments/categories";
import { groupEstablishmentsByCity } from "@/lib/establishments/group-by-city";

export default function EstablishmentsPage() {
  const [items, setItems] = useState<Establishment[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [nameQuery, setNameQuery] = useState("");
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");

  useEffect(() => {
    fetch("/api/establishments/cities")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setCities(data);
      })
      .catch(() => setCities([]));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (nameQuery.trim()) params.set("q", nameQuery.trim());
    if (category) params.set("category", category);
    if (city) params.set("city", city);
    params.set("limit", "200");
    const url = `/api/establishments?${params}`;
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setItems(data);
      })
      .catch(() => setItems([]));
  }, [nameQuery, category, city]);

  const grouped = useMemo(() => groupEstablishmentsByCity(items), [items]);

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <h1 className="font-serif text-2xl tracking-wide">Establishment Library</h1>
          <p className="text-sm text-muted mt-1">
            Organized by destination · Restaurants, hotels, drivers &amp; partners
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

      <div className="grid gap-3 sm:grid-cols-3 mb-6">
        <input
          className="field-input"
          placeholder="Search by name…"
          value={nameQuery}
          onChange={(e) => setNameQuery(e.target.value)}
          aria-label="Search by name"
        />
        <select
          className="field-input"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          aria-label="Filter by city"
        >
          <option value="">All destinations</option>
          {cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          className="field-input"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label="Filter by category"
        >
          <option value="">All categories</option>
          {ESTABLISHMENT_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {ESTABLISHMENT_CATEGORY_LABELS[cat]}
            </option>
          ))}
        </select>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted">No establishments found.</p>
      ) : (
        <div className="est-library-groups max-w-3xl">
          {grouped.map(({ city: groupCity, items: groupItems }) => (
            <section key={groupCity} className="est-city-group">
              <h2 className="est-city-group-title">{groupCity}</h2>
              <ul className="space-y-2">
                {groupItems.map((est) => (
                  <li key={est.id}>
                    <Link
                      href={`/establishments/${est.id}`}
                      className="card block px-5 py-4 hover:border-gold/40 min-h-[44px]"
                    >
                      <p className="font-medium">{est.name}</p>
                      <p className="text-xs text-muted mt-1">
                        {[
                          ESTABLISHMENT_CATEGORY_LABELS[
                            est.category as EstablishmentCategory
                          ] ?? est.category,
                          est.phone,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
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
