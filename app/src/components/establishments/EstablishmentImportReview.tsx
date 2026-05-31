"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ESTABLISHMENT_CATEGORIES,
  ESTABLISHMENT_CATEGORY_LABELS,
  type EstablishmentCategory,
} from "@/lib/establishments/categories";
import {
  EVENT_CATEGORIES,
  EVENT_CATEGORY_LABELS,
  type EventCategory,
} from "@/lib/events/categories";
import {
  LIBRARY_DESTINATIONS,
  type LibraryDestination,
} from "@/lib/establishments/destinations";
import type { WebsiteImportRow } from "@/lib/establishments/website-import";

interface PreviewResponse {
  rows: WebsiteImportRow[];
  summary: {
    total: number;
    new: number;
    exists: number;
    duplicate_batch: number;
  };
}

function statusLabel(status: WebsiteImportRow["status"]): string {
  switch (status) {
    case "new":
      return "New";
    case "exists":
      return "Already in library";
    case "duplicate_batch":
      return "Duplicate on website";
  }
}

export function EstablishmentImportReview() {
  const [rows, setRows] = useState<WebsiteImportRow[]>([]);
  const [summary, setSummary] = useState<PreviewResponse["summary"] | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    created: number;
    skipped: number;
    establishments_created?: number;
    events_created?: number;
    errors: string[];
  } | null>(null);

  const loadPreview = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/establishments/import/preview");
      const data = (await res.json()) as PreviewResponse & { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Could not load preview");
      }
      setRows(data.rows);
      setSummary(data.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load preview");
      setRows([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPreview();
  }, [loadPreview]);

  const selectedCount = useMemo(
    () => rows.filter((r) => r.selected).length,
    [rows]
  );

  const updateRow = (websiteId: number, patch: Partial<WebsiteImportRow>) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.website_id !== websiteId) return row;
        const next = { ...row, ...patch };
        if (patch.city || patch.category || patch.name) {
          next.payload = {
            ...next.payload,
            name: next.name,
            city: next.city,
            category: next.category,
          };
        }
        return next;
      })
    );
  };

  const toggleAllNew = (selected: boolean) => {
    setRows((prev) =>
      prev.map((row) =>
        row.status === "new" ? { ...row, selected } : row
      )
    );
  };

  const runImport = async () => {
    const selected = rows.filter((r) => r.selected);
    if (!selected.length) return;

    setImporting(true);
    setError(null);
    try {
      const res = await fetch("/api/establishments/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: selected.map((row) => ({
            name: row.name,
            city: row.city,
            category: row.category,
            import_target: row.import_target,
            event_category: row.event_category,
            website_url: row.website_url,
            notes: row.notes,
            tags: row.tags,
            internal_notes: row.internal_notes,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Import failed");
      }
      setResult(data);
      await loadPreview();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="page-shell max-w-5xl">
      <div className="page-header">
        <div>
          <Link
            href="/establishments"
            className="btn-ghost mb-4 inline-block min-h-[44px]"
          >
            ← Library
          </Link>
          <h1 className="font-serif text-2xl tracking-wide">
            Import from Website
          </h1>
          <p className="text-sm text-muted mt-1">
            Review establishments from{" "}
            <a
              href="https://www.chambellan-conciergerie.fr"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold hover:underline"
            >
              chambellan-conciergerie.fr
            </a>{" "}
            before saving to your library.
          </p>
        </div>
        <button
          type="button"
          className="btn-secondary min-h-[44px]"
          onClick={() => void loadPreview()}
          disabled={loading || importing}
        >
          Refresh preview
        </button>
      </div>

      {error ? (
        <p className="text-sm text-red-700 mb-4" role="alert">
          {error}
        </p>
      ) : null}

      {result ? (
        <div className="card p-5 mb-6 text-sm" role="status">
          <p className="text-gold font-medium mb-1">Import complete</p>
          <p>
            {result.created} created · {result.skipped} skipped (duplicates)
            {typeof result.events_created === "number" ? (
              <> · {result.events_created} events</>
            ) : null}
            {typeof result.establishments_created === "number" ? (
              <> · {result.establishments_created} establishments</>
            ) : null}
          </p>
          {result.errors.length ? (
            <ul className="mt-2 text-red-700 list-disc pl-5">
              {result.errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {summary ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="card p-4 text-center">
            <p className="text-2xl font-serif text-ink">{summary.total}</p>
            <p className="text-[10px] uppercase tracking-wider text-muted mt-1">
              Found on website
            </p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-serif text-gold">{summary.new}</p>
            <p className="text-[10px] uppercase tracking-wider text-muted mt-1">
              Ready to import
            </p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-serif text-muted">{summary.exists}</p>
            <p className="text-[10px] uppercase tracking-wider text-muted mt-1">
              Already in library
            </p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-serif text-muted">
              {summary.duplicate_batch}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-muted mt-1">
              Website duplicates
            </p>
          </div>
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted">Loading establishments from website…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted">No establishments found on the website.</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-3 mb-4">
            <button
              type="button"
              className="btn-ghost min-h-[44px]"
              onClick={() => toggleAllNew(true)}
            >
              Select all new
            </button>
            <button
              type="button"
              className="btn-ghost min-h-[44px]"
              onClick={() => toggleAllNew(false)}
            >
              Clear selection
            </button>
            <button
              type="button"
              className="btn-primary min-h-[44px] ml-auto"
              disabled={importing || selectedCount === 0}
              onClick={() => void runImport()}
            >
              {importing
                ? "Importing…"
                : `Approve & import (${selectedCount})`}
            </button>
          </div>

          <div className="est-import-table-wrap">
            <table className="est-import-table">
              <thead>
                <tr>
                  <th scope="col" className="est-import-th est-import-th--check">
                    <span className="sr-only">Import</span>
                  </th>
                  <th scope="col" className="est-import-th">
                    Name
                  </th>
                  <th scope="col" className="est-import-th">
                    Destination
                  </th>
                  <th scope="col" className="est-import-th">
                    Type
                  </th>
                  <th scope="col" className="est-import-th">
                    Category
                  </th>
                  <th scope="col" className="est-import-th">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={`${row.website_id}-${row.dedup_key}`}
                    className={`est-import-row est-import-row--${row.status}`}
                  >
                    <td className="est-import-td">
                      <input
                        type="checkbox"
                        className="est-import-check"
                        checked={row.selected}
                        disabled={row.status !== "new"}
                        onChange={(e) =>
                          updateRow(row.website_id, {
                            selected: e.target.checked,
                          })
                        }
                        aria-label={`Import ${row.name}`}
                      />
                    </td>
                    <td className="est-import-td">
                      <span className="font-medium">{row.name}</span>
                    </td>
                    <td className="est-import-td">
                      <select
                        className="field-input est-import-select"
                        value={row.city}
                        onChange={(e) =>
                          updateRow(row.website_id, {
                            city: e.target.value as LibraryDestination,
                          })
                        }
                        disabled={!row.selected}
                      >
                        {LIBRARY_DESTINATIONS.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="est-import-td">
                      <span className="text-xs uppercase tracking-wider text-muted">
                        {row.import_target === "event" ? "Event" : "Establishment"}
                      </span>
                    </td>
                    <td className="est-import-td">
                      {row.import_target === "event" ? (
                        <select
                          className="field-input est-import-select"
                          value={row.event_category ?? "other"}
                          onChange={(e) =>
                            updateRow(row.website_id, {
                              event_category: e.target.value as EventCategory,
                            })
                          }
                          disabled={!row.selected}
                        >
                          {EVENT_CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>
                              {EVENT_CATEGORY_LABELS[cat]}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <select
                          className="field-input est-import-select"
                          value={row.category}
                          onChange={(e) =>
                            updateRow(row.website_id, {
                              category: e.target.value as EstablishmentCategory,
                            })
                          }
                          disabled={!row.selected}
                        >
                          {ESTABLISHMENT_CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>
                              {ESTABLISHMENT_CATEGORY_LABELS[cat]}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="est-import-td">
                      <span
                        className={`est-import-status est-import-status--${row.status}`}
                      >
                        {statusLabel(row.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
