"use client";

import type { CSSProperties } from "react";
import Image from "next/image";
import type {
  Activity,
  ActivityType,
  DaySection,
  Trip,
  TripDay,
  TripWithDays,
} from "@/lib/types";
import { ACTIVITY_TYPE_LABELS } from "@/lib/types";
import {
  createSection,
  getEditableSections,
  getVisibleSections,
} from "@/lib/planner/day-sections";
import {
  getFilledConciergeTeam,
  getFilledOptionalServices,
  OPTIONAL_SERVICE_FIELDS,
  PLANNER_ACTIVITY_TYPES,
  PLANNER_FOOTER,
  type PlannerExportVariant,
} from "@/lib/planner/planner-sheet-model";
import {
  formatDateRange,
  formatGridDayDate,
  formatGridDayName,
  formatTimeDisplay,
} from "@/lib/planner-utils";

const PLANNER_LOGO = "/brand/chambellan-logo-horizontal.png";

export interface PlannerLuxuryDocumentProps {
  trip: TripWithDays;
  editable?: boolean;
  variant?: PlannerExportVariant;
  onFieldChange?: <K extends keyof TripWithDays>(
    key: K,
    value: TripWithDays[K]
  ) => void;
  onFieldBlur?: () => void;
  onDatesBlur?: () => void;
  onAddActivity?: (
    dayId: number,
    sectionId: string,
    type: ActivityType
  ) => void;
  onPatchActivity?: (id: number, fields: Partial<Activity>) => void;
  onRemoveActivity?: (id: number) => void;
  onUpdateSections?: (dayId: number, sections: DaySection[]) => void;
}

function DocInput({
  value,
  onChange,
  onBlur,
  className = "",
  placeholder = "",
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  className?: string;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      className={`lux-doc-input ${className}`}
    />
  );
}

function ActivityCard({
  activity,
  editable,
  onPatch,
  onRemove,
}: {
  activity: Activity;
  editable?: boolean;
  onPatch?: (id: number, fields: Partial<Activity>) => void;
  onRemove?: (id: number) => void;
}) {
  if (!editable) {
    return (
      <div className="lux-activity-card">
        {activity.time ? (
          <span className="lux-activity-time">
            {formatTimeDisplay(activity.time)}
          </span>
        ) : null}
        <p className="lux-activity-title">{activity.title || "—"}</p>
        <p className="lux-activity-type">
          {ACTIVITY_TYPE_LABELS[activity.activity_type]}
        </p>
        {activity.details ? (
          <p className="lux-activity-detail">{activity.details}</p>
        ) : null}
        {activity.status === "awaiting" ? (
          <p className="lux-activity-awaiting">Awaiting confirmation</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="lux-activity-card lux-activity-card--edit">
      <div className="lux-activity-edit-row">
        <input
          type="time"
          value={activity.time}
          onChange={(e) => onPatch?.(activity.id, { time: e.target.value })}
          className="lux-doc-input lux-doc-input--time"
        />
        <select
          value={activity.activity_type}
          onChange={(e) =>
            onPatch?.(activity.id, {
              activity_type: e.target.value as ActivityType,
            })
          }
          className="lux-doc-input lux-doc-input--type"
        >
          {PLANNER_ACTIVITY_TYPES.map((t) => (
            <option key={t} value={t}>
              {ACTIVITY_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="lux-activity-remove"
          onClick={() => onRemove?.(activity.id)}
          aria-label="Remove"
        >
          ×
        </button>
      </div>
      <input
        value={activity.title}
        placeholder="Title"
        onChange={(e) => onPatch?.(activity.id, { title: e.target.value })}
        className="lux-doc-input lux-doc-input--title"
      />
      <input
        value={activity.details}
        placeholder="Description / Notes"
        onChange={(e) => onPatch?.(activity.id, { details: e.target.value })}
        className="lux-doc-input lux-doc-input--detail"
      />
    </div>
  );
}

function DayColumn({
  day,
  editable,
  onAddActivity,
  onPatchActivity,
  onRemoveActivity,
  onUpdateSections,
}: {
  day: TripDay;
  editable?: boolean;
} & Pick<
  PlannerLuxuryDocumentProps,
  | "onAddActivity"
  | "onPatchActivity"
  | "onRemoveActivity"
  | "onUpdateSections"
>) {
  const sections = editable
    ? getEditableSections(day)
    : getVisibleSections(day);

  const saveSections = (next: DaySection[]) => {
    onUpdateSections?.(day.id, next);
  };

  const renameSection = (sectionId: string, label: string) => {
    saveSections(
      sections.map((s) => (s.id === sectionId ? { ...s, label } : s))
    );
  };

  const removeSection = (sectionId: string) => {
    saveSections(sections.filter((s) => s.id !== sectionId));
  };

  const moveSection = (sectionId: string, dir: -1 | 1) => {
    const idx = sections.findIndex((s) => s.id === sectionId);
    if (idx < 0) return;
    const target = idx + dir;
    if (target < 0 || target >= sections.length) return;
    const next = [...sections];
    [next[idx], next[target]] = [next[target], next[idx]];
    saveSections(next.map((s, i) => ({ ...s, sort_order: i })));
  };

  const addSection = () => {
    saveSections([...sections, createSection("New Section", sections.length)]);
  };

  return (
    <div className="lux-day-column">
      <div className="lux-day-column-head">
        <span className="lux-day-name">{formatGridDayName(day.date)}</span>
        <span className="lux-day-date">{formatGridDayDate(day.date)}</span>
      </div>

      {sections.map((section) => {
        const acts = day.activities.filter((a) => a.period === section.id);
        if (!editable && acts.length === 0) return null;

        return (
          <div key={section.id} className="lux-day-section">
            <div className="lux-section-head">
              {editable ? (
                <>
                  <input
                    value={section.label}
                    onChange={(e) => renameSection(section.id, e.target.value)}
                    className="lux-doc-input lux-doc-input--section"
                  />
                  <div className="lux-section-actions">
                    <button
                      type="button"
                      className="lux-section-action"
                      onClick={() => moveSection(section.id, -1)}
                      aria-label="Move up"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="lux-section-action"
                      onClick={() => moveSection(section.id, 1)}
                      aria-label="Move down"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="lux-section-action lux-section-action--remove"
                      onClick={() => removeSection(section.id)}
                      aria-label="Remove section"
                    >
                      ×
                    </button>
                  </div>
                </>
              ) : (
                <h3 className="lux-section-name">{section.label}</h3>
              )}
            </div>

            <div className="lux-section-body">
              {acts.map((a) => (
                <ActivityCard
                  key={a.id}
                  activity={a}
                  editable={editable}
                  onPatch={onPatchActivity}
                  onRemove={onRemoveActivity}
                />
              ))}
              {editable ? (
                <div className="lux-add-row">
                  {PLANNER_ACTIVITY_TYPES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      className="lux-add-btn"
                      onClick={() => onAddActivity?.(day.id, section.id, t)}
                    >
                      + {ACTIVITY_TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        );
      })}

      {editable ? (
        <button type="button" className="lux-add-section" onClick={addSection}>
          + Add section
        </button>
      ) : null}
    </div>
  );
}

export function PlannerLuxuryDocument({
  trip,
  editable = false,
  variant = "client",
  onFieldChange,
  onFieldBlur,
  onDatesBlur,
  onAddActivity,
  onPatchActivity,
  onRemoveActivity,
  onUpdateSections,
}: PlannerLuxuryDocumentProps) {
  const filledTeam = getFilledConciergeTeam(trip);
  const showTeam = editable
    ? variant === "concierge" || filledTeam.length > 0
    : filledTeam.length > 0;
  const filledServices = getFilledOptionalServices(trip);
  const showServices = editable || filledServices.length > 0;
  const showNotes = editable || Boolean(trip.notes?.trim());
  const notesExpanded = !showTeam && !showServices;
  const dayCount = trip.days.length;
  const gridExpanded =
    dayCount > 0 && !showTeam && !showServices && !showNotes;

  return (
    <div
      className={`lux-document${gridExpanded ? " lux-document--grid-expanded" : ""}`}
    >
      <header className="lux-header">
        <div className="lux-logo-wrap">
          <Image
            src={PLANNER_LOGO}
            alt="Chambellan Conciergerie"
            width={320}
            height={88}
            className="lux-logo-horizontal"
            priority
          />
        </div>
        <h1 className="lux-title">Weekly Planner</h1>

        <div className="lux-meta">
          <div className="lux-meta-left" aria-hidden />
          <div className="lux-meta-center">
            {editable ? (
              <>
                <DocInput
                  value={trip.destination}
                  onChange={(v) => onFieldChange?.("destination", v)}
                  onBlur={onFieldBlur}
                  placeholder="Destination"
                  className="lux-doc-input--destination"
                />
                <div className="lux-dates-row">
                  <DocInput
                    type="date"
                    value={trip.arrival_date}
                    onChange={(v) => onFieldChange?.("arrival_date", v)}
                    onBlur={onDatesBlur}
                    className="lux-doc-input--date"
                  />
                  <span className="lux-dates-sep">–</span>
                  <DocInput
                    type="date"
                    value={trip.departure_date}
                    onChange={(v) => onFieldChange?.("departure_date", v)}
                    onBlur={onDatesBlur}
                    className="lux-doc-input--date"
                  />
                </div>
              </>
            ) : (
              <>
                <p className="lux-destination">
                  {trip.destination || "Destination"}
                </p>
                <p className="lux-dates">
                  {formatDateRange(trip.arrival_date, trip.departure_date)}
                </p>
              </>
            )}
          </div>
          <div className="lux-meta-right">
            {editable ? (
              <DocInput
                value={trip.client_name}
                onChange={(v) => onFieldChange?.("client_name", v)}
                onBlur={onFieldBlur}
                placeholder="Client name"
                className="lux-doc-input--client"
              />
            ) : (
              <p className="lux-client">{trip.client_name || "Client"}</p>
            )}
          </div>
        </div>
      </header>

      <div className="lux-main">
        {showServices ? (
          <section className="lux-services">
            <h2 className="lux-section-label">Arrangements</h2>
            <div className="lux-services-grid">
              {OPTIONAL_SERVICE_FIELDS.map((field) => {
                const value = String(trip[field.tripField] ?? "").trim();
                if (!editable && !value) return null;
                return (
                  <div key={field.key} className="lux-service-item">
                    <span className="lux-service-label">{field.label}</span>
                    {editable ? (
                      <DocInput
                        value={String(trip[field.tripField] ?? "")}
                        onChange={(v) => onFieldChange?.(field.tripField, v)}
                        onBlur={onFieldBlur}
                        placeholder={field.label}
                        className="lux-doc-input--service"
                      />
                    ) : (
                      <span className="lux-service-value">{value}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        {dayCount === 0 ? (
          <p className="lux-grid-empty">
            {editable
              ? "Select arrival and departure dates to begin your itinerary."
              : "No programme scheduled."}
          </p>
        ) : (
          <div
            className="lux-days-row"
            style={{ "--lux-days": dayCount } as CSSProperties}
          >
            {trip.days.map((day) => (
              <DayColumn
                key={day.id}
                day={day}
                editable={editable}
                onAddActivity={onAddActivity}
                onPatchActivity={onPatchActivity}
                onRemoveActivity={onRemoveActivity}
                onUpdateSections={onUpdateSections}
              />
            ))}
          </div>
        )}
      </div>

      {showTeam ? (
        <section className="lux-team">
          <h2 className="lux-section-label">Concierge Team</h2>
          <div
            className="lux-team-grid"
            style={
              {
                "--team-count": editable ? 4 : filledTeam.length,
              } as CSSProperties
            }
          >
            {(editable
              ? [
                  {
                    key: "driver",
                    label: "Driver",
                    nameField: "driver_name" as const,
                    phoneField: "driver_phone" as const,
                  },
                  {
                    key: "butler",
                    label: "Butler",
                    nameField: "butler_name" as const,
                    phoneField: "butler_phone" as const,
                  },
                  {
                    key: "security",
                    label: "Security",
                    nameField: "security_contact" as const,
                  },
                  {
                    key: "emergency",
                    label: "Emergency Contact",
                    nameField: "emergency_contact" as const,
                  },
                ]
              : filledTeam
            ).map((row) => {
              if (!editable) {
                const r = row as (typeof filledTeam)[0];
                return (
                  <div key={r.key} className="lux-team-card">
                    <span className="lux-team-role">{r.label}</span>
                    <span className="lux-team-name">{r.name}</span>
                    {r.phone ? (
                      <span className="lux-team-phone">{r.phone}</span>
                    ) : null}
                  </div>
                );
              }
              const r = row as {
                key: string;
                label: string;
                nameField: keyof Trip;
                phoneField?: keyof Trip;
              };
              return (
                <div key={r.key} className="lux-team-card lux-team-card--edit">
                  <span className="lux-team-role">{r.label}</span>
                  <DocInput
                    value={String(trip[r.nameField] ?? "")}
                    onChange={(v) => onFieldChange?.(r.nameField, v)}
                    onBlur={onFieldBlur}
                    placeholder="Name / Contact"
                    className="lux-doc-input--team"
                  />
                  {r.phoneField ? (
                    <DocInput
                      value={String(trip[r.phoneField] ?? "")}
                      onChange={(v) => onFieldChange?.(r.phoneField!, v)}
                      onBlur={onFieldBlur}
                      placeholder="Phone"
                      className="lux-doc-input--team-phone"
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {showNotes ? (
        <section
          className={`lux-notes ${notesExpanded ? "lux-notes--expanded" : ""}`}
        >
          <h2 className="lux-section-label">Notes</h2>
          {editable ? (
            <textarea
              value={trip.notes}
              onChange={(e) => onFieldChange?.("notes", e.target.value)}
              onBlur={onFieldBlur}
              placeholder="Additional notes for this itinerary…"
              className="lux-doc-textarea"
              rows={notesExpanded ? 5 : 3}
            />
          ) : (
            <p className="lux-notes-text">{trip.notes}</p>
          )}
        </section>
      ) : null}

      <footer className="lux-footer">{PLANNER_FOOTER}</footer>
    </div>
  );
}
