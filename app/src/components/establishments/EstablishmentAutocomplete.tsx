"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { Establishment } from "@/lib/types";
import type { EstablishmentCategory } from "@/lib/establishments/categories";
import { ESTABLISHMENT_CATEGORY_LABELS } from "@/lib/establishments/categories";

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
  category?: EstablishmentCategory;
  city?: string;
  placeholder?: string;
  className?: string;
  onEstablishmentSelect?: (establishment: Establishment) => void;
  allowSaveToLibrary?: boolean;
}

export function EstablishmentAutocomplete({
  value,
  onChange,
  onBlur,
  category,
  city,
  placeholder = "Search or type freely…",
  className = "adm-input",
  onEstablishmentSelect,
  allowSaveToLibrary = true,
}: Props) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<Establishment[]>([]);
  const [loading, setLoading] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">(
    "idle"
  );
  const debouncedQuery = useDebouncedValue(value.trim(), 250);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const params = new URLSearchParams();
    if (debouncedQuery) params.set("q", debouncedQuery);
    if (category) params.set("category", category);
    if (city?.trim()) params.set("city", city.trim());
    params.set("limit", "12");

    setLoading(true);
    fetch(`/api/establishments?${params}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!cancelled && Array.isArray(data)) setResults(data);
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
  }, [debouncedQuery, category, city, open]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const exactMatch = results.some(
    (r) => r.name.trim().toLowerCase() === value.trim().toLowerCase()
  );

  const showSave =
    allowSaveToLibrary &&
    category &&
    value.trim().length > 0 &&
    !exactMatch &&
    saveState !== "saved";

  const selectEstablishment = useCallback(
    (est: Establishment) => {
      onChange(est.name);
      onEstablishmentSelect?.(est);
      setOpen(false);
    },
    [onChange, onEstablishmentSelect]
  );

  const saveToLibrary = async () => {
    if (!category || !value.trim()) return;
    setSaveState("saving");
    try {
      const res = await fetch("/api/establishments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: value.trim(),
          category,
          city: city?.trim() ?? "",
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
        }),
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
        onBlur={() => {
          window.setTimeout(() => onBlur?.(), 150);
        }}
        aria-autocomplete="list"
        aria-controls={listId}
        autoComplete="off"
      />
      {open && (results.length > 0 || loading) ? (
        <ul className="est-suggestions" id={listId} role="listbox">
          {loading ? (
            <li className="est-suggestion est-suggestion--muted">Searching…</li>
          ) : null}
          {results.map((est) => (
            <li key={est.id}>
              <button
                type="button"
                className="est-suggestion"
                role="option"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectEstablishment(est)}
              >
                <span className="est-suggestion-name">{est.name}</span>
                <span className="est-suggestion-meta">
                  {[
                    ESTABLISHMENT_CATEGORY_LABELS[
                      est.category as EstablishmentCategory
                    ] ?? est.category,
                    est.city,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {showSave ? (
        <button
          type="button"
          className="est-save-btn"
          onClick={() => void saveToLibrary()}
          disabled={saveState === "saving"}
        >
          {saveState === "saving"
            ? "Saving…"
            : saveState === "error"
              ? "Error saving — retry"
              : "Save to library"}
        </button>
      ) : null}
      {saveState === "saved" ? (
        <span className="est-save-status">Saved to library</span>
      ) : null}
    </div>
  );
}
