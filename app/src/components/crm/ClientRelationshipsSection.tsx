"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  CLIENT_RELATIONSHIP_TYPE_LABELS,
  CLIENT_RELATIONSHIP_TYPE_OPTIONS,
} from "@/lib/crm/client-relationships";
import type {
  Client,
  ClientRelationshipType,
  ClientRelationshipWithClient,
} from "@/lib/types";

interface Props {
  clientId: number;
  initialRelationships: ClientRelationshipWithClient[];
  allClients: Pick<Client, "id" | "full_name">[];
  variant?: "default" | "sheet";
}

export function ClientRelationshipsSection({
  clientId,
  initialRelationships,
  allClients,
  variant = "default",
}: Props) {
  const [relationships, setRelationships] =
    useState<ClientRelationshipWithClient[]>(initialRelationships);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [relatedClientId, setRelatedClientId] = useState("");
  const [relationshipType, setRelationshipType] =
    useState<ClientRelationshipType>("friend");
  const [notes, setNotes] = useState("");
  const [editingNotesId, setEditingNotesId] = useState<number | null>(null);
  const [notesDraft, setNotesDraft] = useState("");

  const availableClients = useMemo(
    () =>
      allClients.filter(
        (client) =>
          client.id !== clientId &&
          !relationships.some((rel) => rel.related_client_id === client.id)
      ),
    [allClients, clientId, relationships]
  );

  const resetForm = () => {
    setAdding(false);
    setRelatedClientId("");
    setRelationshipType("friend");
    setNotes("");
    setError(null);
  };

  const handleAdd = async () => {
    const selectedId = Number(relatedClientId);
    if (!Number.isFinite(selectedId) || selectedId <= 0) {
      setError("Please select a client to link.");
      return;
    }

    setSaving(true);
    setError(null);

    const res = await fetch(`/api/clients/${clientId}/relationships`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        related_client_id: selectedId,
        relationship_type: relationshipType,
        notes,
      }),
    });
    const data = await res.json().catch(() => null);

    setSaving(false);

    if (!res.ok) {
      const message =
        data &&
        typeof data === "object" &&
        "error" in data &&
        typeof data.error === "string"
          ? data.error
          : "Could not add relationship.";
      setError(message);
      return;
    }

    if (!data || typeof data !== "object" || !("id" in data)) return;

    setRelationships((current) =>
      [...current, data as ClientRelationshipWithClient].sort((a, b) =>
        a.related_client.full_name.localeCompare(b.related_client.full_name)
      )
    );
    resetForm();
  };

  const handleRemove = async (relationshipId: number) => {
    setSaving(true);
    setError(null);

    const res = await fetch(
      `/api/clients/${clientId}/relationships/${relationshipId}`,
      { method: "DELETE" }
    );

    setSaving(false);

    if (!res.ok) {
      setError("Could not remove relationship.");
      return;
    }

    setRelationships((current) =>
      current.filter((rel) => rel.id !== relationshipId)
    );
  };

  const startEditNotes = (relationship: ClientRelationshipWithClient) => {
    setEditingNotesId(relationship.id);
    setNotesDraft(relationship.notes);
    setError(null);
  };

  const saveNotes = async (relationshipId: number) => {
    setSaving(true);
    setError(null);

    const res = await fetch(
      `/api/clients/${clientId}/relationships/${relationshipId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: notesDraft }),
      }
    );
    const data = (await res.json().catch(() => null)) as
      | ClientRelationshipWithClient
      | null;

    setSaving(false);

    if (!res.ok || !data) {
      setError("Could not save relationship notes.");
      return;
    }

    setRelationships((current) =>
      current.map((rel) => (rel.id === relationshipId ? data : rel))
    );
    setEditingNotesId(null);
    setNotesDraft("");
  };

  return (
    <section className={`crm-relationships${variant === "sheet" ? " crm-relationships--sheet" : ""}`}>
      <div className="crm-relationships-head">
        {variant === "default" ? (
          <h2 className="section-title">Relationship tags</h2>
        ) : null}
        {!adding && availableClients.length > 0 ? (
          <button
            type="button"
            className="btn-secondary min-h-[44px]"
            onClick={() => {
              setAdding(true);
              setError(null);
            }}
          >
            Add relationship
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="text-sm text-red-700 mb-3" role="alert">
          {error}
        </p>
      ) : null}

      {relationships.length === 0 && !adding ? (
        <p className="text-sm text-muted">No related clients yet.</p>
      ) : (
        <ul className="crm-relationship-list">
          {relationships.map((relationship) => (
            <li key={relationship.id} className="crm-relationship-item card">
              <div className="crm-relationship-item-main">
                <div>
                  <Link
                    href={`/clients/${relationship.related_client.id}`}
                    className="crm-relationship-name"
                  >
                    {relationship.related_client.full_name}
                  </Link>
                  <p className="crm-relationship-type">
                    {CLIENT_RELATIONSHIP_TYPE_LABELS[relationship.relationship_type]}
                  </p>
                </div>
                <button
                  type="button"
                  className="crm-relationship-remove min-h-[44px] min-w-[44px]"
                  onClick={() => void handleRemove(relationship.id)}
                  disabled={saving}
                  aria-label={`Remove relationship with ${relationship.related_client.full_name}`}
                >
                  ×
                </button>
              </div>

              {editingNotesId === relationship.id ? (
                <div className="crm-relationship-notes-edit">
                  <label className="field-label">Relationship notes</label>
                  <textarea
                    className="field-input min-h-[72px]"
                    rows={2}
                    value={notesDraft}
                    onChange={(event) => setNotesDraft(event.target.value)}
                    placeholder='e.g. "Came together for Monaco GP 2026"'
                    disabled={saving}
                  />
                  <div className="crm-relationship-notes-actions">
                    <button
                      type="button"
                      className="btn-secondary min-h-[44px]"
                      onClick={() => {
                        setEditingNotesId(null);
                        setNotesDraft("");
                      }}
                      disabled={saving}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn-primary min-h-[44px]"
                      onClick={() => void saveNotes(relationship.id)}
                      disabled={saving}
                    >
                      Save notes
                    </button>
                  </div>
                </div>
              ) : relationship.notes ? (
                <p className="crm-relationship-notes">{relationship.notes}</p>
              ) : null}

              {editingNotesId !== relationship.id ? (
                <button
                  type="button"
                  className="crm-relationship-notes-btn min-h-[44px]"
                  onClick={() => startEditNotes(relationship)}
                  disabled={saving}
                >
                  {relationship.notes ? "Edit notes" : "Add notes"}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {adding ? (
        <div className="crm-relationship-form card">
          <h3 className="font-serif text-lg tracking-wide mb-4">
            Link a client
          </h3>
          <div className="space-y-4">
            <label>
              <span className="field-label">Related client</span>
              <select
                className="field-input min-h-[44px]"
                value={relatedClientId}
                onChange={(event) => setRelatedClientId(event.target.value)}
                disabled={saving}
              >
                <option value="">Select a client…</option>
                {availableClients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.full_name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="field-label">Relationship type</span>
              <select
                className="field-input min-h-[44px]"
                value={relationshipType}
                onChange={(event) =>
                  setRelationshipType(
                    event.target.value as ClientRelationshipType
                  )
                }
                disabled={saving}
              >
                {CLIENT_RELATIONSHIP_TYPE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {CLIENT_RELATIONSHIP_TYPE_LABELS[option]}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="field-label">Notes (optional)</span>
              <textarea
                className="field-input min-h-[72px]"
                rows={2}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder='e.g. "Came together for Monaco GP 2026"'
                disabled={saving}
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-3 mt-5">
            <button
              type="button"
              className="btn-primary min-h-[44px]"
              onClick={() => void handleAdd()}
              disabled={saving}
            >
              {saving ? "Saving…" : "Save relationship"}
            </button>
            <button
              type="button"
              className="btn-secondary min-h-[44px]"
              onClick={resetForm}
              disabled={saving}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
