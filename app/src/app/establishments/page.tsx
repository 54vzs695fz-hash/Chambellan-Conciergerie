"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Establishment } from "@/lib/types";
import {
  ESTABLISHMENT_CATEGORIES,
  ESTABLISHMENT_CATEGORY_LABELS,
} from "@/lib/establishments/categories";
import { groupEstablishmentsByDestinationAndCategory } from "@/lib/establishments/group-by-destination-category";
import { LibraryNav } from "@/components/library/LibraryNav";
import { LibraryItemRow } from "@/components/library/LibraryItemRow";
import { LibraryDeleteDialog } from "@/components/library/LibraryDeleteDialog";
import { EstablishmentQuickAdd } from "@/components/establishments/EstablishmentQuickAdd";

export default function EstablishmentsPage() {
  const [items, setItems] = useState<Establishment[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [nameQuery, setNameQuery] = useState("");
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<number[] | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch("/api/establishments/cities")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setCities(data); })
      .catch(() => setCities([]));
  }, []);

  const refreshList = useCallback(() => {
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

  useEffect(() => {
    refreshList();
  }, [refreshList]);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2500);
  };

  const grouped = useMemo(
    () => groupEstablishmentsByDestinationAndCategory(items),
    [items]
  );

  const visibleIds = useMemo(() => items.map((e) => e.id), [items]);
  const selectedCount = selectedIds.size;
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));

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

  const performDelete = async (ids: number[]) => {
    setDeleting(true);
    try {
      if (ids.length === 1) {
        const res = await fetch(`/api/establishments/${ids[0]}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Delete failed");
      } else {
        const res = await fetch("/api/establishments/bulk-delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids }),
        });
        if (!res.ok) throw new Error("Bulk delete failed");
      }

      setItems((prev) => prev.filter((e) => !ids.includes(e.id)));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
      setDeleteTarget(null);
      showToast(
        ids.length === 1
          ? "Establishment deleted successfully."
          : `${ids.length} establishments deleted successfully.`
      );
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
          <h1 className="font-serif text-2xl tracking-wide">Establishment Library</h1>
          <p className="text-sm text-muted mt-1">
            Destination → Category → Establishments
          </p>
        </div>
        <div className="page-header-actions">
          <Link href="/establishments/import" className="btn-secondary min-h-[44px]">
            Import
          </Link>
          <button
            type="button"
            className="btn-primary min-h-[44px]"
            onClick={() => setQuickAddOpen(true)}
          >
            Quick add
          </button>
        </div>
      </div>

      {toast ? (
        <p className="est-save-toast" role="status">
          {toast}
        </p>
      ) : null}

      <EstablishmentQuickAdd
        open={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        onSaved={(est) => {
          refreshList();
          showToast(`${est.name} saved`);
        }}
        defaultCity={city}
        defaultCategory={category || "restaurant"}
      />

      <LibraryDeleteDialog
        open={deleteTarget !== null}
        itemLabel="establishment"
        count={deleteTarget?.length ?? 0}
        deleting={deleting}
        onCancel={() => {
          if (!deleting) setDeleteTarget(null);
        }}
        onConfirm={() => {
          if (deleteTarget?.length) void performDelete(deleteTarget);
        }}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-4">
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

      {items.length > 0 ? (
        <div className="est-bulk-bar">
          <label className="est-bulk-select-all">
            <input
              type="checkbox"
              checked={allVisibleSelected}
              onChange={() => {
                setSelectedIds(allVisibleSelected ? new Set() : new Set(visibleIds));
              }}
              aria-label="Select all visible establishments"
            />
            <span className="text-sm text-muted">Select all</span>
          </label>
          {selectedCount > 0 ? (
            <div className="est-bulk-actions">
              <span className="est-bulk-count">{selectedCount} selected</span>
              <button
                type="button"
                className="btn-ghost min-h-[44px]"
                onClick={() => setSelectedIds(new Set())}
              >
                Clear
              </button>
              <button
                type="button"
                className="est-bulk-delete-btn min-h-[44px]"
                onClick={() => setDeleteTarget([...selectedIds])}
              >
                Delete selected
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

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
                  <ul className="est-row-list">
                    {catItems.map((est) => (
                      <LibraryItemRow
                        key={est.id}
                        name={est.name}
                        meta={[est.contact_name, est.phone].filter(Boolean).join(" · ") || undefined}
                        editHref={`/establishments/${est.id}`}
                        isFavorite={est.is_favorite}
                        selected={selectedIds.has(est.id)}
                        showSelect
                        onSelect={(checked) => {
                          setSelectedIds((prev) => {
                            const next = new Set(prev);
                            if (checked) next.add(est.id);
                            else next.delete(est.id);
                            return next;
                          });
                        }}
                        onToggleFavorite={() => void toggleFavorite(est.id)}
                        onRequestDelete={() => setDeleteTarget([est.id])}
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
