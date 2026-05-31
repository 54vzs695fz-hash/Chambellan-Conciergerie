"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ConciergeEventRecord, EventVenueInput } from "@/lib/types";
import { LIBRARY_DESTINATIONS } from "@/lib/establishments/destinations";

export function EventVenueForm({
  initial,
  venueId,
}: {
  initial: EventVenueInput;
  venueId?: number;
}) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [events, setEvents] = useState<ConciergeEventRecord[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/events?limit=200")
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setEvents(d); })
      .catch(() => {});
  }, []);

  const set = <K extends keyof EventVenueInput>(key: K, value: EventVenueInput[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const url = venueId ? `/api/event-venues/${venueId}` : "/api/event-venues";
    const res = await fetch(url, {
      method: venueId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json().catch(() => null);
    setSaving(false);
    if (!res.ok) {
      setError(data?.error ?? "Could not save venue.");
      return;
    }
    router.push(venueId ? `/event-venues/${venueId}` : `/event-venues/${data.id}`);
    router.refresh();
  };

  const remove = async () => {
    if (!venueId || !window.confirm("Delete this event venue?")) return;
    setDeleting(true);
    const res = await fetch(`/api/event-venues/${venueId}`, { method: "DELETE" });
    setDeleting(false);
    if (!res.ok) {
      setError("Could not delete venue.");
      return;
    }
    router.push("/event-venues");
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="card p-6 md:p-8 max-w-2xl space-y-5">
      {error ? <p className="text-sm text-red-700" role="alert">{error}</p> : null}
      <div>
        <label className="field-label">Venue name</label>
        <input className="field-input" value={form.name} onChange={(e) => set("name", e.target.value)} required />
      </div>
      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <label className="field-label">Destination</label>
          <select className="field-input" value={form.destination} onChange={(e) => set("destination", e.target.value)} required>
            <option value="">Select…</option>
            {LIBRARY_DESTINATIONS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label">Linked event</label>
          <select
            className="field-input"
            value={form.event_id ?? ""}
            onChange={(e) => set("event_id", e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">None</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>{ev.name} · {ev.destination}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <label className="field-label">Contact person</label>
          <input className="field-input" value={form.contact_name} onChange={(e) => set("contact_name", e.target.value)} />
        </div>
        <div>
          <label className="field-label">Phone</label>
          <input className="field-input" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <label className="field-label">WhatsApp</label>
          <input className="field-input" value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} />
        </div>
        <div>
          <label className="field-label">Email</label>
          <input className="field-input" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
        </div>
      </div>
      <div>
        <label className="field-label">Website</label>
        <input className="field-input" value={form.website} onChange={(e) => set("website", e.target.value)} />
      </div>
      <div>
        <label className="field-label">Notes</label>
        <textarea className="field-input min-h-[80px]" rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
      </div>
      <div>
        <label className="field-label">Internal notes</label>
        <textarea className="field-input min-h-[80px]" rows={3} value={form.internal_notes} onChange={(e) => set("internal_notes", e.target.value)} />
      </div>
      <label className="flex items-center gap-2 min-h-[44px] cursor-pointer">
        <input type="checkbox" checked={form.is_favorite} onChange={(e) => set("is_favorite", e.target.checked)} />
        <span className="text-sm">Favorite</span>
      </label>
      <div className="flex flex-wrap gap-3 pt-2">
        <button type="submit" className="btn-primary min-h-[44px]" disabled={saving}>
          {saving ? "Saving…" : venueId ? "Save changes" : "Create venue"}
        </button>
        {venueId ? (
          <button type="button" className="btn-secondary min-h-[44px] text-red-800 border-red-200" onClick={() => void remove()} disabled={deleting}>
            {deleting ? "Deleting…" : "Delete"}
          </button>
        ) : null}
      </div>
    </form>
  );
}
