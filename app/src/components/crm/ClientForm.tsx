"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Client } from "@/lib/types";

type ClientInput = Omit<Client, "id" | "created_at" | "updated_at">;

export function ClientForm({
  initial,
  clientId,
}: {
  initial: ClientInput;
  clientId?: number;
}) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const url = clientId ? `/api/clients/${clientId}` : "/api/clients";
    const method = clientId ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json().catch(() => null);
    setSaving(false);

    if (!res.ok) {
      setError(
        typeof data?.error === "string"
          ? data.error
          : "Could not save client. Please try again."
      );
      return;
    }

    if (clientId) {
      if (!data?.id) {
        setError("Could not save client. Please try again.");
        return;
      }
      router.push(`/clients/${data.id}`);
    } else {
      router.push("/clients");
    }
    router.refresh();
  };

  const fields: { key: keyof ClientInput; label: string; rows?: number }[] = [
    { key: "full_name", label: "Full name" },
    { key: "phone", label: "Phone" },
    { key: "whatsapp", label: "WhatsApp" },
    { key: "email", label: "Email" },
    { key: "nationality", label: "Nationality" },
    { key: "preferences", label: "Preferences", rows: 3 },
    { key: "notes", label: "Internal notes", rows: 4 },
  ];

  return (
    <form onSubmit={submit} className="card p-8 max-w-xl space-y-5">
      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      {fields.map(({ key, label, rows }) => (
        <div key={key}>
          <label className="field-label">{label}</label>
          {rows ? (
            <textarea
              className="field-input min-h-[80px]"
              rows={rows}
              value={form[key]}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              required={key === "full_name"}
            />
          ) : (
            <input
              className="field-input"
              value={form[key]}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              required={key === "full_name"}
            />
          )}
        </div>
      ))}
      <div className="flex gap-3 pt-2">
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? "Saving…" : clientId ? "Update client" : "Create client"}
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => router.back()}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
