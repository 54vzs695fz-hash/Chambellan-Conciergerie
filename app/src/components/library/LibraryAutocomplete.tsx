"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type { EstablishmentCategory } from "@/lib/establishments/categories";
import { ESTABLISHMENT_CATEGORY_LABELS } from "@/lib/establishments/categories";
import { EVENT_CATEGORY_LABELS, type EventCategory } from "@/lib/events/categories";
import { citiesMatch } from "@/lib/establishments/group-by-city";
import { LIBRARY_DESTINATIONS } from "@/lib/establishments/destinations";

export type LibrarySource = "establishment" | "event" | "event_venue";

interface SearchResult {
  id: number;
  name: string;
  meta: string;
  isPriority: boolean;
}

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  source: LibrarySource;
  establishmentCategory?: EstablishmentCategory;
  eventCategory?: EventCategory;
  eventId?: number;
  destination?: string;
  placeholder?: string;
  className?: string;
  onSelect?: (item: { name: string; meta?: string }) => void;
  allowSaveToLibrary?: boolean;
}

export function LibraryAutocomplete({
  value,
  onChange,
  onBlur,
  source,
  establishmentCategory,
  eventCategory,
  eventId,
  destination,
  placeholder = "Search or type freely…",
  className = "adm-input",
  onSelect,
  allowSaveToLibrary = true,
}: Props) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const debouncedQuery = useDebouncedValue(value.trim(), 200);
  const destinationTrimmed = destination?.trim() ?? "";

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const params = new URLSearchParams();
    if (debouncedQuery) params.set("q", debouncedQuery);
    if (destinationTrimmed) params.set("prioritize_city", destinationTrimmed);
    params.set("limit", "20");

    let url = "/api/establishments";
    if (source === "establishment") {
      if (establishmentCategory) params.set("category", establishmentCategory);
      if (destinationTrimmed) params.set("prioritize_city", destinationTrimmed);
    } else if (source === "event") {
      url = "/api/events";
      if (eventCategory) params.set("category", eventCategory);
      if (destinationTrimmed) params.set("prioritize_destination", destinationTrimmed);
      params.delete("prioritize_city");
    } else {
      url = "/api/event-venues";
      if (eventId) params.set("event_id", String(eventId));
      if (destinationTrimmed) params.set("prioritize_destination", destinationTrimmed);
      params.delete("prioritize_city");
    }

    setLoading(true);
    fetch(`${url}?${params}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (cancelled || !Array.isArray(data)) return;
        const mapped: SearchResult[] = data.map(
          (row: {
            id: number;
            name: string;
            city?: string;
            destination?: string;
            category?: string;
            event_name?: string;
          }) => {
            const loc = row.city ?? row.destination ?? "";
            const isPriority =
              destinationTrimmed.length > 0 && citiesMatch(loc, destinationTrimmed);
            const catLabel =
              source === "event"
                ? EVENT_CATEGORY_LABELS[row.category as EventCategory] ?? row.category
                : source === "establishment"
                  ? ESTABLISHMENT_CATEGORY_LABELS[
                      row.category as EstablishmentCategory
                    ] ?? row.category
                  : row.event_name ?? "Event Venue";
            return {
              id: row.id,
              name: row.name,
              meta: [catLabel, loc].filter(Boolean).join(" · "),
              isPriority,
            };
          }
        );
        setResults(mapped);
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    debouncedQuery,
    source,
    establishmentCategory,
    eventCategory,
    eventId,
    destinationTrimmed,
    open,
  ]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const canSave =
    allowSaveToLibrary &&
    value.trim().length > 0 &&
    destinationTrimmed.length > 0 &&
    saveState !== "saved";

  const saveLabel = useMemo(() => {
    if (saveState === "saving") return "Saving…";
    if (saveState === "error") return "Error saving — retry";
    return destinationTrimmed
      ? `Save to library (${destinationTrimmed})`
      : "Save to library";
  }, [saveState, destinationTrimmed]);

  const saveToLibrary = async () => {
    if (!value.trim() || !destinationTrimmed) return;
    setSaveState("saving");
    try {
      let url = "/api/establishments";
      let body: Record<string, unknown> = {
        name: value.trim(),
        city: destinationTrimmed,
        category: establishmentCategory ?? "other",
        address: "",
        contact_name: "",
        phone: "",
        whatsapp: "",
        email: "",
        website: "",
        instagram: "",
        notes: "",
        price_level: "",
        tags: "",
        internal_notes: "",
        is_favorite: false,
      };

      if (source === "event") {
        url = "/api/events";
        body = {
          name: value.trim(),
          destination: destinationTrimmed,
          category: eventCategory ?? "other",
          start_date: "",
          end_date: "",
          contact_name: "",
          phone: "",
          whatsapp: "",
          email: "",
          website: "",
          notes: "",
          internal_notes: "",
          is_favorite: false,
        };
      } else if (source === "event_venue") {
        url = "/api/event-venues";
        body = {
          name: value.trim(),
          destination: destinationTrimmed,
          event_id: eventId ?? null,
          contact_name: "",
          phone: "",
          whatsapp: "",
          email: "",
          website: "",
          notes: "",
          internal_notes: "",
          is_favorite: false,
        };
      }

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        setSaveState("error");
        return;
      }
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  };

  return (
    <div className="est-field" ref={rootRef}>
      <input
        className={className}
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          setSaveState("idle");
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => onBlur?.(), 150)}
        aria-autocomplete="list"
        aria-controls={listId}
        autoComplete="off"
      />
      {open && (results.length > 0 || loading) ? (
        <ul className="est-suggestions" id={listId} role="listbox">
          {loading ? (
            <li className="est-suggestion est-suggestion--muted">Searching…</li>
          ) : null}
          {results.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className={`est-suggestion${item.isPriority ? " est-suggestion--priority" : ""}`}
                role="option"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(item.name);
                  onSelect?.({ name: item.name, meta: item.meta });
                  setOpen(false);
                }}
              >
                <span className="est-suggestion-name">{item.name}</span>
                <span className="est-suggestion-meta">
                  {item.meta}
                  {item.isPriority ? " · current destination" : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {canSave ? (
        <button
          type="button"
          className="est-save-btn"
          onClick={() => void saveToLibrary()}
          disabled={saveState === "saving"}
        >
          {saveLabel}
        </button>
      ) : null}
      {allowSaveToLibrary &&
      value.trim() &&
      !destinationTrimmed &&
      saveState !== "saved" ? (
        <span className="est-save-hint">
          Set planner destination to save this to the library.
        </span>
      ) : null}
      {saveState === "saved" ? (
        <span className="est-save-status">Saved to library</span>
      ) : null}
    </div>
  );
}

// Export destination list for forms
export { LIBRARY_DESTINATIONS };
