"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import type {
  Activity,
  ActivityType,
  Client,
  DaySection,
  TripWithDays,
} from "@/lib/types";
import {
  CONCIERGE_TEAM_FIELDS,
  OPTIONAL_SERVICE_FIELDS,
  PLANNER_BRAND_LOGO,
} from "@/lib/planner/planner-sheet-model";
import { PlannerActivitiesEditor } from "./PlannerActivitiesEditor";

interface DashboardProps {
  trip: TripWithDays;
  clients: Client[];
  onFieldChange: <K extends keyof TripWithDays>(
    key: K,
    value: TripWithDays[K]
  ) => void;
  onFieldBlur: () => void;
  onDatesBlur: () => void;
  onLinkClient: (clientId: string) => void;
  onAddActivity: (
    dayId: number,
    sectionId: string,
    type: ActivityType
  ) => void;
  onPatchActivity: (id: number, fields: Partial<Activity>) => void;
  onRemoveActivity: (id: number) => void;
  onUpdateSections: (dayId: number, sections: DaySection[]) => void;
  onReorderActivities: (
    dayId: number,
    sectionId: string,
    orderedIds: number[]
  ) => void;
}

const TRAVEL_FIELDS = OPTIONAL_SERVICE_FIELDS.filter((f) =>
  ["hotel", "villa", "yacht", "jet"].includes(f.key)
);

const INTERNAL_FIELDS = OPTIONAL_SERVICE_FIELDS.filter((f) =>
  ["restaurant_reservations", "club_reservations"].includes(f.key)
);

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="adm-field">
      <span className="adm-field-label">{label}</span>
      {children}
    </label>
  );
}

export function PlannerConciergeDashboard({
  trip,
  clients,
  onFieldChange,
  onFieldBlur,
  onDatesBlur,
  onLinkClient,
  onAddActivity,
  onPatchActivity,
  onRemoveActivity,
  onUpdateSections,
  onReorderActivities,
}: DashboardProps) {
  return (
    <div className="adm-root">
      <div className="adm-content">
        <section className="adm-panel">
          <h2 className="adm-panel-title">Client Information</h2>
          <div className="adm-grid adm-grid--2">
            <Field label="Client profile">
              <select
                className="adm-input"
                value={trip.client_id ?? ""}
                onChange={(e) => onLinkClient(e.target.value)}
              >
                <option value="">Unlinked</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Client name">
              <input
                className="adm-input"
                value={trip.client_name}
                onChange={(e) => onFieldChange("client_name", e.target.value)}
                onBlur={onFieldBlur}
                placeholder="Client name"
              />
            </Field>
          </div>
        </section>

        <section className="adm-panel">
          <h2 className="adm-panel-title">Travel Information</h2>
          <div className="adm-grid adm-grid--2">
            <Field label="Destination">
              <input
                className="adm-input"
                value={trip.destination}
                onChange={(e) => onFieldChange("destination", e.target.value)}
                onBlur={onFieldBlur}
                placeholder="Destination"
              />
            </Field>
            <div className="adm-field">
              <span className="adm-field-label">Travel dates</span>
              <div className="adm-dates-row">
                <input
                  type="date"
                  className="adm-input"
                  value={trip.arrival_date}
                  onChange={(e) =>
                    onFieldChange("arrival_date", e.target.value)
                  }
                  onBlur={onDatesBlur}
                />
                <span className="adm-dates-sep">–</span>
                <input
                  type="date"
                  className="adm-input"
                  value={trip.departure_date}
                  onChange={(e) =>
                    onFieldChange("departure_date", e.target.value)
                  }
                  onBlur={onDatesBlur}
                />
              </div>
            </div>
          </div>
          <div className="adm-grid adm-grid--2 adm-grid--spaced">
            {TRAVEL_FIELDS.map((field) => (
              <Field key={field.key} label={field.label}>
                <input
                  className="adm-input"
                  value={String(trip[field.tripField] ?? "")}
                  onChange={(e) =>
                    onFieldChange(field.tripField, e.target.value)
                  }
                  onBlur={onFieldBlur}
                  placeholder={field.label}
                />
              </Field>
            ))}
          </div>
        </section>

        <section className="adm-panel adm-panel--wide">
          <h2 className="adm-panel-title">Activities</h2>
          <PlannerActivitiesEditor
            days={trip.days}
            onAddActivity={onAddActivity}
            onPatchActivity={onPatchActivity}
            onRemoveActivity={onRemoveActivity}
            onUpdateSections={onUpdateSections}
            onReorderActivities={onReorderActivities}
          />
        </section>

        <section className="adm-panel">
          <h2 className="adm-panel-title">Concierge Team</h2>
          <div className="adm-grid adm-grid--2">
            {CONCIERGE_TEAM_FIELDS.map((row) => (
              <div key={row.key} className="adm-team-card">
                <span className="adm-team-role">{row.label}</span>
                <input
                  className="adm-input"
                  value={String(trip[row.nameField] ?? "")}
                  onChange={(e) =>
                    onFieldChange(row.nameField, e.target.value)
                  }
                  onBlur={onFieldBlur}
                  placeholder="Name / Contact"
                />
                {row.phoneField ? (
                  <input
                    className="adm-input adm-input--phone"
                    value={String(trip[row.phoneField] ?? "")}
                    onChange={(e) =>
                      onFieldChange(row.phoneField!, e.target.value)
                    }
                    onBlur={onFieldBlur}
                    placeholder="Phone"
                  />
                ) : null}
              </div>
            ))}
          </div>
        </section>

        <section className="adm-panel">
          <h2 className="adm-panel-title">Internal</h2>
          <div className="adm-grid adm-grid--2">
            {INTERNAL_FIELDS.map((field) => (
              <Field key={field.key} label={field.label}>
                <input
                  className="adm-input"
                  value={String(trip[field.tripField] ?? "")}
                  onChange={(e) =>
                    onFieldChange(field.tripField, e.target.value)
                  }
                  onBlur={onFieldBlur}
                  placeholder={field.label}
                />
              </Field>
            ))}
          </div>
          <Field label="Notes">
            <textarea
              className="adm-textarea"
              value={trip.notes}
              onChange={(e) => onFieldChange("notes", e.target.value)}
              onBlur={onFieldBlur}
              placeholder="Internal notes for this itinerary…"
              rows={4}
            />
          </Field>
        </section>
      </div>
    </div>
  );
}

export function PlannerConciergeNav({
  destination,
}: {
  destination: string;
}) {
  return (
    <div className="adm-nav-brand">
      <Image
        src={PLANNER_BRAND_LOGO}
        alt="Chambellan"
        width={48}
        height={64}
        className="adm-nav-logo"
        unoptimized
      />
      <span className="adm-nav-destination">
        {destination?.trim() || "Weekly planner"}
      </span>
    </div>
  );
}
