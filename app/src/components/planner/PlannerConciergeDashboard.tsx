"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import type {
  Activity,
  ActivityType,
  Client,
  DaySection,
  Establishment,
  TripFollowUpStatus,
  TripPaymentMethod,
  TripPaymentStatus,
  TripWithDays,
} from "@/lib/types";
import {
  CONCIERGE_TEAM_FIELDS,
  HOST_STAY_FIELDS,
  OPTIONAL_SERVICE_FIELDS,
  PLANNER_BRAND_LOGO,
  PLANNER_HOST_OPTIONS,
  resolvePlannerHostName,
  resolvePlannerHostPhone,
} from "@/lib/planner/planner-sheet-model";
import type { PlannerHostOption } from "@/lib/planner/planner-sheet-model";
import {
  PROGRAMME_STATUS_LABELS,
  PROGRAMME_STATUS_OPTIONS,
} from "@/lib/planner/programme-status";
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHOD_OPTIONS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_OPTIONS,
} from "@/lib/planner/payment-status";
import {
  TRIP_FIELD_ESTABLISHMENT_CATEGORY,
  TEAM_ROW_ESTABLISHMENT_CATEGORY,
  type EstablishmentCategory,
} from "@/lib/establishments/categories";
import { teamAutofillFromEstablishment } from "@/lib/establishments/autofill";
import { resolveLibraryDestinationPrioritize } from "@/lib/planner/trip-destinations";
import type { TripDestinationFields as TripDestinationState } from "@/lib/planner/trip-destinations";
import { LibraryAutocomplete } from "@/components/library/LibraryAutocomplete";
import { PlannerActivitiesEditor } from "./PlannerActivitiesEditor";
import { PlannerCollapsibleSection } from "./PlannerCollapsibleSection";
import { TripDestinationFields } from "./TripDestinationFields";
import { ReservationsStatusPanel } from "@/components/reservations/ReservationsStatusPanel";

interface DashboardProps {
  trip: TripWithDays;
  clients: Client[];
  onFieldChange: <K extends keyof TripWithDays>(
    key: K,
    value: TripWithDays[K]
  ) => void;
  onDestinationFieldsChange: (fields: TripDestinationState) => void;
  onHostChange: (hostName: PlannerHostOption) => void;
  onFieldBlur: () => void;
  onDateFieldChange: (
    key: "arrival_date" | "departure_date",
    value: string
  ) => void;
  onDatesCommit: () => void;
  onLinkClient: (clientId: string) => void;
  onStatusChange: (status: TripFollowUpStatus) => void;
  onAddActivity: (
    dayId: number,
    sectionId: string,
    type: ActivityType
  ) => void;
  onPatchActivity: (
    id: number,
    fields: Partial<Activity>,
    options?: { immediate?: boolean }
  ) => void;
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

function TripEstablishmentField({
  label,
  tripField,
  value,
  category,
  destination,
  onChange,
  onBlur,
}: {
  label: string;
  tripField: keyof TripWithDays;
  value: string;
  category: EstablishmentCategory;
  destination?: string;
  onChange: (key: keyof TripWithDays, value: string) => void;
  onBlur: () => void;
}) {
  return (
    <Field label={label}>
      <LibraryAutocomplete
        source="establishment"
        value={value}
        establishmentCategory={category}
        destination={destination}
        placeholder={`${label} — search or type freely`}
        onChange={(next) => onChange(tripField, next)}
        onBlur={onBlur}
      />
    </Field>
  );
}

export function PlannerConciergeDashboard({
  trip,
  clients,
  onFieldChange,
  onDestinationFieldsChange,
  onHostChange,
  onFieldBlur,
  onDateFieldChange,
  onDatesCommit,
  onLinkClient,
  onStatusChange,
  onAddActivity,
  onPatchActivity,
  onRemoveActivity,
  onUpdateSections,
  onReorderActivities,
}: DashboardProps) {
  const libraryDestination = resolveLibraryDestinationPrioritize(trip);

  return (
    <div className="adm-root">
      <div className="adm-content">
        <PlannerCollapsibleSection title="Client Information" defaultOpen>
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
            <Field label="Programme status">
              <select
                className="adm-input adm-status-select"
                value={trip.follow_up_status ?? "follow_up"}
                onChange={(e) =>
                  onStatusChange(e.target.value as TripFollowUpStatus)
                }
                aria-label="Programme status"
              >
                {PROGRAMME_STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {PROGRAMME_STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="adm-subsection">
            <h3 className="adm-subsection-title">Payment</h3>
            <div className="adm-grid adm-grid--2">
              <Field label="Payment status">
                <select
                  className="adm-input adm-status-select"
                  value={trip.payment_status ?? "pending"}
                  onChange={(e) => {
                    onFieldChange(
                      "payment_status",
                      e.target.value as TripPaymentStatus
                    );
                    onFieldBlur();
                  }}
                  aria-label="Payment status"
                >
                  {PAYMENT_STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {PAYMENT_STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Payment method">
                <select
                  className="adm-input"
                  value={trip.payment_method ?? ""}
                  onChange={(e) => {
                    onFieldChange(
                      "payment_method",
                      e.target.value as TripPaymentMethod | ""
                    );
                    onFieldBlur();
                  }}
                  aria-label="Payment method"
                >
                  <option value="">Not set</option>
                  {PAYMENT_METHOD_OPTIONS.map((method) => (
                    <option key={method} value={method}>
                      {PAYMENT_METHOD_LABELS[method]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Total amount">
                <input
                  className="adm-input"
                  value={trip.total_amount ?? ""}
                  onChange={(e) =>
                    onFieldChange("total_amount", e.target.value)
                  }
                  onBlur={onFieldBlur}
                  placeholder="e.g. 15000"
                  inputMode="decimal"
                />
              </Field>
              <Field label="Amount received">
                <input
                  className="adm-input"
                  value={trip.amount_received ?? ""}
                  onChange={(e) =>
                    onFieldChange("amount_received", e.target.value)
                  }
                  onBlur={onFieldBlur}
                  placeholder="e.g. 5000"
                  inputMode="decimal"
                />
              </Field>
            </div>
            <Field label="Payment notes">
              <textarea
                className="adm-textarea"
                value={trip.payment_notes ?? ""}
                onChange={(e) =>
                  onFieldChange("payment_notes", e.target.value)
                }
                onBlur={onFieldBlur}
                placeholder="Internal payment notes…"
                rows={3}
              />
            </Field>
          </div>
        </PlannerCollapsibleSection>

        <PlannerCollapsibleSection title="Travel Information">
          <div className="adm-grid adm-grid--2">
            <TripDestinationFields
              trip={trip}
              onDestinationFieldsChange={onDestinationFieldsChange}
              onBlur={onFieldBlur}
            />
            <div className="adm-field">
              <span className="adm-field-label">Travel dates</span>
              <div className="adm-dates-row">
                <input
                  type="date"
                  className="adm-input"
                  value={trip.arrival_date}
                  onChange={(e) =>
                    onDateFieldChange("arrival_date", e.target.value)
                  }
                  onBlur={onDatesCommit}
                />
                <span className="adm-dates-sep">–</span>
                <input
                  type="date"
                  className="adm-input"
                  value={trip.departure_date}
                  onChange={(e) =>
                    onDateFieldChange("departure_date", e.target.value)
                  }
                  onBlur={onDatesCommit}
                />
              </div>
            </div>
          </div>
          <div className="adm-grid adm-grid--2 adm-grid--spaced">
            {TRAVEL_FIELDS.map((field) => {
              const category = TRIP_FIELD_ESTABLISHMENT_CATEGORY[field.key];
              if (category) {
                return (
                  <TripEstablishmentField
                    key={field.key}
                    label={field.label}
                    tripField={field.tripField}
                    value={String(trip[field.tripField] ?? "")}
                    category={category}
                    destination={libraryDestination}
                    onChange={onFieldChange}
                    onBlur={onFieldBlur}
                  />
                );
              }
              return (
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
              );
            })}
          </div>
        </PlannerCollapsibleSection>

        <PlannerCollapsibleSection title="Events">
          <div className="adm-grid adm-grid--2">
            <Field label="Event">
              <LibraryAutocomplete
                source="event"
                value={String(trip.event_booking ?? "")}
                destination={libraryDestination}
                placeholder="Event — search or type freely"
                onChange={(next) => onFieldChange("event_booking", next)}
                onBlur={onFieldBlur}
              />
            </Field>
            <Field label="Event Venue">
              <LibraryAutocomplete
                source="event_venue"
                value={String(trip.event_venue ?? "")}
                destination={libraryDestination}
                placeholder="Event venue — search or type freely"
                onChange={(next) => onFieldChange("event_venue", next)}
                onBlur={onFieldBlur}
              />
            </Field>
          </div>
        </PlannerCollapsibleSection>

        <PlannerCollapsibleSection title="Activities" wide defaultOpen>
          <PlannerActivitiesEditor
            days={trip.days}
            destination={libraryDestination}
            onAddActivity={onAddActivity}
            onPatchActivity={onPatchActivity}
            onRemoveActivity={onRemoveActivity}
            onUpdateSections={onUpdateSections}
            onReorderActivities={onReorderActivities}
          />
        </PlannerCollapsibleSection>

        <PlannerCollapsibleSection title="Reservations Status" defaultOpen>
          <ReservationsStatusPanel
            days={trip.days}
            onPatchBookingStatus={(activityId, booking_status) =>
              onPatchActivity(activityId, { booking_status }, { immediate: true })
            }
            variant="planner"
          />
        </PlannerCollapsibleSection>

        <PlannerCollapsibleSection title="Your Stay">
          <div className="adm-grid adm-grid--2">
            {HOST_STAY_FIELDS.map((field) => (
              <Field key={field.key} label={field.label}>
                <input
                  className="adm-input"
                  value={String(trip[field.tripField] ?? "")}
                  onChange={(e) =>
                    onFieldChange(field.tripField, e.target.value)
                  }
                  onBlur={onFieldBlur}
                  placeholder={
                    field.key === "tailored"
                      ? "e.g. 4 guests, 2 persons, Family of 4"
                      : field.label
                  }
                />
              </Field>
            ))}
            <Field label="Host">
              <select
                className="adm-input adm-status-select adm-host-select"
                value={resolvePlannerHostName(trip.host_name)}
                onChange={(e) =>
                  onHostChange(e.target.value as PlannerHostOption)
                }
                onBlur={onFieldBlur}
                aria-label="Host"
              >
                {PLANNER_HOST_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <p className="adm-host-phone" aria-live="polite">
                {resolvePlannerHostPhone(trip.host_name, trip.host_phone)}
              </p>
            </Field>
          </div>
        </PlannerCollapsibleSection>

        <PlannerCollapsibleSection title="Concierge Team">
          <div className="adm-grid adm-grid--2">
            {CONCIERGE_TEAM_FIELDS.map((row) => {
              const category = TEAM_ROW_ESTABLISHMENT_CATEGORY[row.key];
              return (
                <div key={row.key} className="adm-team-card">
                  <span className="adm-team-role">{row.label}</span>
                  {category ? (
                    <LibraryAutocomplete
                      source="establishment"
                      value={String(trip[row.nameField] ?? "")}
                      establishmentCategory={category}
                      destination={libraryDestination}
                      placeholder="Name / Contact — search or type freely"
                      onChange={(next) => onFieldChange(row.nameField, next)}
                      onBlur={onFieldBlur}
                      onSelect={({ name }) => {
                        void (async () => {
                          const params = new URLSearchParams({
                            q: name,
                            category,
                            limit: "5",
                          });
                          const res = await fetch(`/api/establishments?${params}`);
                          const data = (await res.json()) as Establishment[];
                          const est =
                            Array.isArray(data) &&
                            (data.find((row) => row.name === name) ?? data[0]);
                          if (!est) return;
                          const autofill = teamAutofillFromEstablishment(est);
                          onFieldChange(row.nameField, autofill.name);
                          if (row.phoneField && autofill.phone) {
                            onFieldChange(row.phoneField, autofill.phone);
                          }
                          onFieldBlur();
                        })();
                      }}
                    />
                  ) : (
                    <input
                      className="adm-input"
                      value={String(trip[row.nameField] ?? "")}
                      onChange={(e) =>
                        onFieldChange(row.nameField, e.target.value)
                      }
                      onBlur={onFieldBlur}
                      placeholder="Name / Contact"
                    />
                  )}
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
              );
            })}
          </div>
        </PlannerCollapsibleSection>

        <PlannerCollapsibleSection title="Internal Notes" desktopTitle="Internal">
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
        </PlannerCollapsibleSection>
      </div>
    </div>
  );
}

export function PlannerConciergeNav({
  destination,
  destinationSubtitle,
}: {
  destination: string;
  destinationSubtitle?: string | null;
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
      <span className="adm-nav-destination-wrap">
        <span className="adm-nav-destination">
          {destination?.trim() || "Weekly planner"}
        </span>
        {destinationSubtitle ? (
          <span className="adm-nav-destination-sub">{destinationSubtitle}</span>
        ) : null}
      </span>
    </div>
  );
}
