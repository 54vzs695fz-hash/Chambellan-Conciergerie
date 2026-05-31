"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Establishment } from "@/lib/types";
import {
  ESTABLISHMENT_CATEGORIES,
  ESTABLISHMENT_CATEGORY_LABELS,
  type EstablishmentCategory,
} from "@/lib/establishments/categories";

export default function EstablishmentsPage() {
  const [items, setItems] = useState<Establishment[]>([]);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");

  useEffect(() => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (category) params.set("category", category);
    if (city.trim()) params.set("city", city.trim());
    const url = params.size
      ? `/api/establishments?${params}`
      : "/api/establishments";
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setItems(data);
      })
      .catch(() => setItems([]));
  }, [q, category, city]);

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <h1 className="font-serif text-2xl tracking-wide">Establishment Library</h1>
          <p className="text-sm text-muted mt-1">
            Restaurants, hotels, drivers &amp; partners
          </p>
        </div>
        <Link href="/establishments/new" className="btn-primary min-h-[44px]">
          New establishment
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 mb-6">
        <input
          className="field-input sm:col-span-1"
          placeholder="Search name, city, tags…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className="field-input"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">All categories</option>
          {ESTABLISHMENT_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {ESTABLISHMENT_CATEGORY_LABELS[cat]}
            </option>
          ))}
        </select>
        <input
          className="field-input"
          placeholder="Filter by destination"
          value={city}
          onChange={(e) => setCity(e.target.value)}
        />
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted">No establishments found.</p>
      ) : (
        <ul className="space-y-2 max-w-3xl">
          {items.map((est) => (
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
                    est.city,
                    est.phone,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
