"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { EstablishmentInput } from "@/lib/types";
import {
  ESTABLISHMENT_CATEGORIES,
  ESTABLISHMENT_CATEGORY_LABELS,
} from "@/lib/establishments/categories";

export function EstablishmentForm({
  initial,
  establishmentId,
}: {
  initial: EstablishmentInput;
  establishmentId?: number;
}) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.city.trim()) {
      setError("City / destination is required.");
      setStatus("error");
      return;
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
    const data = await res.json().catch(() => null);
    setSaving(false);

    if (!res.ok) {
      setStatus("error");
      setError(
        typeof data?.error === "string"
          ? data.error
          : "Could not save establishment. Please try again."
      );
      return;
    }

    setStatus("saved");
    if (establishmentId) {
      router.refresh();
    } else {
      router.push(`/establishments/${data.id}`);
    }
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

  const set = <K extends keyof EstablishmentInput>(
    key: K,
    value: EstablishmentInput[K]
  ) => {
    setStatus("idle");
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <form onSubmit={submit} className="card p-6 md:p-8 max-w-2xl space-y-5">
      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      {status === "saved" && !error ? (
        <p className="text-sm text-gold" role="status">
          Saved
        </p>
      ) : null}

      <div>
        <label className="field-label">Name</label>
        <input
          className="field-input"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          required
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <label className="field-label">Category</label>
          <select
            className="field-input"
            value={form.category}
            onChange={(e) => set("category", e.target.value)}
          >
            {ESTABLISHMENT_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {ESTABLISHMENT_CATEGORY_LABELS[cat]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label">City / destination</label>
          <input
            className="field-input"
            value={form.city}
            onChange={(e) => set("city", e.target.value)}
            placeholder="e.g. Saint-Tropez, Monaco, Dubai"
            required
          />
        </div>
      </div>

      <div>
        <label className="field-label">Address</label>
        <input
          className="field-input"
          value={form.address}
          onChange={(e) => set("address", e.target.value)}
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <label className="field-label">Contact name</label>
          <input
            className="field-input"
            value={form.contact_name}
            onChange={(e) => set("contact_name", e.target.value)}
          />
        </div>
        <div>
          <label className="field-label">Phone</label>
          <input
            className="field-input"
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <label className="field-label">WhatsApp</label>
          <input
            className="field-input"
            value={form.whatsapp}
            onChange={(e) => set("whatsapp", e.target.value)}
          />
        </div>
        <div>
          <label className="field-label">Email</label>
          <input
            className="field-input"
            type="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <label className="field-label">Website</label>
          <input
            className="field-input"
            value={form.website}
            onChange={(e) => set("website", e.target.value)}
          />
        </div>
        <div>
          <label className="field-label">Instagram</label>
          <input
            className="field-input"
            value={form.instagram}
            onChange={(e) => set("instagram", e.target.value)}
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <label className="field-label">Price level</label>
          <input
            className="field-input"
            value={form.price_level}
            onChange={(e) => set("price_level", e.target.value)}
            placeholder="e.g. €€€"
          />
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
      </div>

      <div>
        <label className="field-label">Notes</label>
        <textarea
          className="field-input min-h-[80px]"
          rows={3}
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
        />
      </div>

      <div>
        <label className="field-label">Internal notes</label>
        <textarea
          className="field-input min-h-[80px]"
          rows={3}
          value={form.internal_notes}
          onChange={(e) => set("internal_notes", e.target.value)}
        />
      </div>

      <div className="flex flex-wrap gap-3 pt-2">
        <button type="submit" className="btn-primary min-h-[44px]" disabled={saving}>
          {saving ? "Saving…" : establishmentId ? "Save changes" : "Create establishment"}
        </button>
        {establishmentId ? (
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
