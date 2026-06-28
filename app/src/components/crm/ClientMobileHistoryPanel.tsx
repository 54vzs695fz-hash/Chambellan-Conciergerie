"use client";

import { useState } from "react";
import { ClientStayHistorySection } from "@/components/crm/ClientStayHistorySection";
import type { Client, ClientStayHistoryItem } from "@/lib/types";

interface Props {
  client: Client;
  stayHistory: ClientStayHistoryItem[];
}

export function ClientMobileHistoryPanel({ client, stayHistory }: Props) {
  const [preferences, setPreferences] = useState(client.preferences);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const savePreferences = async (nextPreferences: string) => {
    setSaving(true);
    setSaved(false);
    const res = await fetch(`/api/clients/${client.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: client.full_name,
        phone: client.phone,
        whatsapp: client.whatsapp,
        email: client.email,
        nationality: client.nationality,
        notes: client.notes,
        preferences: nextPreferences,
      }),
    });
    setSaving(false);
    if (res.ok) setSaved(true);
  };

  return (
    <div className="client-mobile-history-panel">
      <section className="client-mobile-history-section">
        <h3 className="client-mobile-history-heading">Preferences</h3>
        <label className="client-mobile-history-field">
          <textarea
            className="field-input client-mobile-history-textarea"
            value={preferences}
            onChange={(event) => {
              setPreferences(event.target.value);
              setSaved(false);
            }}
            onBlur={(event) => {
              if (event.target.value !== client.preferences) {
                void savePreferences(event.target.value);
              }
            }}
            placeholder="Dietary requirements, room preferences, favourite venues…"
            rows={4}
            disabled={saving}
          />
        </label>
        {saving ? (
          <p className="client-mobile-history-hint">Saving…</p>
        ) : saved ? (
          <p className="client-mobile-history-hint">Saved</p>
        ) : null}
      </section>

      <section className="client-mobile-history-section">
        <h3 className="client-mobile-history-heading">Previous stays & spending</h3>
        <ClientStayHistorySection initialHistory={stayHistory} variant="sheet" />
      </section>
    </div>
  );
}
