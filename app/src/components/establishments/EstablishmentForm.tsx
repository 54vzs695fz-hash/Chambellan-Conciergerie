"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Establishment, EstablishmentInput } from "@/lib/types";
import {
  ESTABLISHMENT_CATEGORIES,
  ESTABLISHMENT_CATEGORY_LABELS,
} from "@/lib/establishments/categories";
import { LIBRARY_DESTINATIONS } from "@/lib/establishments/destinations";

type FormVariant = "standard" | "quick";

export function EstablishmentForm({
  initial,
  establishmentId,
  variant = "standard",
  onSaved,
  onCancel,
}: {
  initial: EstablishmentInput;
  establishmentId?: number;
  variant?: FormVariant;
  onSaved?: (establishment: Establishment, options?: { keepOpen?: boolean }) => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const nameRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const isQuick = variant === "quick";

  useEffect(() => {
    if (isQuick) nameRef.current?.focus();
  }, [isQuick]);

  const set = <K extends keyof EstablishmentInput>(
    key: K,
    value: EstablishmentInput[K]
  ) => {
    setStatus("idle");
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const persist = async (): Promise<Establishment | null> => {
    if (!form.name.trim()) {
      setError("Name is required.");
      setStatus("error");
      return null;
    }
    if (!form.city.trim()) {
      setError("City / destination is required.");
      setStatus("error");
      return null;
    }

    setSaving(true);
    setError(null);
    setStatus("idle");

    const url = establishmentId
      ? `/api/establishments/${establishmentId}`
      : "/api/establishments";
    const method = establishmentId ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = (await res.json().catch(() => null)) as
      | Establishment
      | { error?: string }
      | null;
    setSaving(false);

    if (!res.ok) {
      setStatus("error");
      setError(
        typeof data === "object" && data && "error" in data && typeof data.error === "string"
          ? data.error
          : "Could not save establishment. Please try again."
      );
      return null;
    }

    setStatus("saved");
    return data as Establishment;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const saved = await persist();
    if (!saved) return;

    if (onSaved) {
      onSaved(saved);
      return;
    }

    if (establishmentId) {
      router.refresh();
    } else {
      router.push(`/establishments/${saved.id}`);
    }
  };

  const saveAndAddAnother = async () => {
    const saved = await persist();
    if (!saved) return;
    onSaved?.(saved, { keepOpen: true });
    setForm({ ...initial, category: form.category, city: form.city });
    setStatus("idle");
    nameRef.current?.focus();
  };

  const remove = async () => {
    if (!establishmentId) return;
    if (!window.confirm("Delete this establishment from the library?")) return;
    setDeleting(true);
    setError(null);
    const res = await fetch(`/api/establishments/${establishmentId}`, {
      method: "DELETE",
    });
    setDeleting(false);
    if (!res.ok) {
      setError("Could not delete establishment.");
      return;
    }
    router.push("/establishments");
    router.refresh();
  };

  const destinationField = (
    <div>
      <label className="field-label" htmlFor="est-city">
        City / destination <span className="text-gold">*</span>
      </label>
      <select
        id="est-city"
        className="field-input"
        value={form.city}
        onChange={(e) => set("city", e.target.value)}
        required
      >
        <option value="" disabled>
          Select destination…
        </option>
        {LIBRARY_DESTINATIONS.map((dest) => (
          <option key={dest} value={dest}>
            {dest}
          </option>
        ))}
        {!LIBRARY_DESTINATIONS.includes(form.city as (typeof LIBRARY_DESTINATIONS)[number]) &&
        form.city ? (
          <option value={form.city}>{form.city}</option>
        ) : null}
      </select>
    </div>
  );

  const advancedFields = (
    <details className="est-advanced-details">
      <summary className="est-advanced-summary">Advanced details</summary>
      <div className="est-advanced-body space-y-4">
        <div>
          <label className="field-label">Address</label>
          <input
            className="field-input"
            value={form.address}
            onChange={(e) => set("address", e.target.value)}
          />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="field-label">Email</label>
            <input
              className="field-input"
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </div>
          <div>
            <label className="field-label">Website</label>
            <input
              className="field-input"
              value={form.website}
              onChange={(e) => set("website", e.target.value)}
            />
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="field-label">Instagram</label>
            <input
              className="field-input"
              value={form.instagram}
              onChange={(e) => set("instagram", e.target.value)}
            />
          </div>
          <div>
            <label className="field-label">Price level</label>
            <input
              className="field-input"
              value={form.price_level}
              onChange={(e) => set("price_level", e.target.value)}
              placeholder="e.g. €€€"
            />
          </div>
        </div>
        <div>
          <label className="field-label">Tags</label>
          <input
            className="field-input"
            value={form.tags}
            onChange={(e) => set("tags", e.target.value)}
            placeholder="Comma-separated"
          />
        </div>
        <div>
          <label className="field-label">Internal notes</label>
          <textarea
            className="field-input min-h-[72px]"
            rows={2}
            value={form.internal_notes}
            onChange={(e) => set("internal_notes", e.target.value)}
          />
        </div>
        {establishmentId ? (
          <label className="flex items-center gap-2 min-h-[44px] cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_favorite}
              onChange={(e) => set("is_favorite", e.target.checked)}
            />
            <span className="text-sm">Favorite</span>
          </label>
        ) : null}
      </div>
    </details>
  );

  return (
    <form
      onSubmit={submit}
      className={
        isQuick
          ? "est-quick-form"
          : "card p-6 md:p-8 max-w-2xl space-y-4"
      }
    >
      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      {status === "saved" && !error && !isQuick ? (
        <p className="text-sm text-gold" role="status">
          Saved
        </p>
      ) : null}

      <div>
        <label className="field-label" htmlFor="est-name">
          Name <span className="text-gold">*</span>
        </label>
        <input
          id="est-name"
          ref={nameRef}
          className="field-input"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="e.g. Bagatelle, Verde Beach"
          required
          autoComplete="off"
        />
      </div>

      <div className={isQuick ? "est-quick-grid-2" : "grid sm:grid-cols-2 gap-4"}>
        <div>
          <label className="field-label" htmlFor="est-category">
            Category <span className="text-gold">*</span>
          </label>
          <select
            id="est-category"
            className="field-input"
            value={form.category}
            onChange={(e) => set("category", e.target.value)}
            required
          >
            {ESTABLISHMENT_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {ESTABLISHMENT_CATEGORY_LABELS[cat]}
              </option>
            ))}
          </select>
        </div>
        {destinationField}
      </div>

      <div className={isQuick ? "est-quick-grid-2" : "grid sm:grid-cols-2 gap-4"}>
        <div>
          <label className="field-label">Contact name</label>
          <input
            className="field-input"
            value={form.contact_name}
            onChange={(e) => set("contact_name", e.target.value)}
            placeholder="Concierge contact"
            autoComplete="off"
          />
        </div>
        <div>
          <label className="field-label">Phone</label>
          <input
            className="field-input"
            type="tel"
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
            placeholder="+33 …"
            autoComplete="tel"
          />
        </div>
      </div>

      <div>
        <label className="field-label">WhatsApp</label>
        <input
          className="field-input"
          type="tel"
          value={form.whatsapp}
          onChange={(e) => set("whatsapp", e.target.value)}
          placeholder="+33 …"
          autoComplete="tel"
        />
      </div>

      <div>
        <label className="field-label">Notes</label>
        <textarea
          className={`field-input ${isQuick ? "min-h-[64px]" : "min-h-[80px]"}`}
          rows={isQuick ? 2 : 3}
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="Hours, dress code, booking tips…"
        />
      </div>

      {!isQuick ? advancedFields : null}

      <div
        className={
          isQuick
            ? "est-quick-actions"
            : "flex flex-wrap gap-3 pt-2"
        }
      >
        <button type="submit" className="btn-primary min-h-[44px]" disabled={saving}>
          {saving
            ? "Saving…"
            : establishmentId
              ? "Save changes"
              : isQuick
                ? "Save"
                : "Create establishment"}
        </button>
        {isQuick && !establishmentId ? (
          <button
            type="button"
            className="btn-secondary min-h-[44px]"
            disabled={saving}
            onClick={() => void saveAndAddAnother()}
          >
            Save & add another
          </button>
        ) : null}
        {isQuick && onCancel ? (
          <button
            type="button"
            className="btn-ghost min-h-[44px]"
            onClick={onCancel}
            disabled={saving}
          >
            Cancel
          </button>
        ) : null}
        {!isQuick && establishmentId ? (
          <button
            type="button"
            className="btn-secondary min-h-[44px] text-red-800 border-red-200"
            onClick={() => void remove()}
            disabled={deleting}
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        ) : null}
      </div>
    </form>
  );
}
