"use client";

import { memo, useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import type { CSSProperties } from "react";
import type { Activity, ActivityType, BookingStatus, DaySection, Establishment, TripDay } from "@/lib/types";
import { ACTIVITY_TYPE_LABELS } from "@/lib/types";
import {
  ACTIVITY_TYPE_ESTABLISHMENT_CATEGORY,
} from "@/lib/establishments/categories";
import { formatEstablishmentDetails } from "@/lib/establishments/autofill";
import { LibraryAutocomplete } from "@/components/library/LibraryAutocomplete";
import {
  createSection,
  getEditableSections,
} from "@/lib/planner/day-sections";
import { PLANNER_ACTIVITY_TYPES } from "@/lib/planner/planner-sheet-model";
import { PLANNER_AUTOSAVE_MS } from "./use-planner-save";
import {
  formatGridDayDate,
  formatGridDayName,
  sortActivitiesForSection,
} from "@/lib/planner-utils";
import { resolveDayEffectiveDestination } from "@/lib/planner/itinerary-destinations";
import {
  BOOKING_STATUS_LABELS,
  BOOKING_STATUS_OPTIONS,
  isReservationActivityType,
  normalizeBookingStatus,
} from "@/lib/reservations/reservation-status";
import {
  normalizeBeachClubActivity,
  syncBeachClubPersistedFields,
} from "@/lib/planner/beach-club";

function reorderItems<T>(items: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= items.length) return items;
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

interface Props {
  days: TripDay[];
  destination?: string;
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
  onDayDestinationOverrideChange: (
    dayId: number,
    destinationOverride: string
  ) => void;
  onDayDestinationOverrideBlur: () => void;
}

const ActivityEditRow = memo(function ActivityEditRow({
  activity,
  destination,
  onPatch,
  onRemove,
  onMoveUp,
  onMoveDown,
  draggable,
  onDragStart,
  onDragOver,
  onDrop,
}: {
  activity: Activity;
  destination?: string;
  onPatch: Props["onPatchActivity"];
  onRemove: (id: number) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  draggable?: boolean;
  onDragStart?: (e: DragEvent) => void;
  onDragOver?: (e: DragEvent) => void;
  onDrop?: (e: DragEvent) => void;
}) {
  const initialBeach = normalizeBeachClubActivity(activity);
  const [time, setTime] = useState(activity.time);
  const [title, setTitle] = useState(activity.title);
  const [details, setDetails] = useState(activity.details);
  const [activityType, setActivityType] = useState(activity.activity_type);
  const [bookingStatus, setBookingStatus] = useState(
    normalizeBookingStatus(activity.booking_status)
  );
  const [beachSunbeds, setBeachSunbeds] = useState(initialBeach.sunbedsEnabled);
  const [beachSunbedsTime, setBeachSunbedsTime] = useState(initialBeach.sunbedsTime);
  const [beachLunch, setBeachLunch] = useState(initialBeach.lunchEnabled);
  const [beachLunchTime, setBeachLunchTime] = useState(initialBeach.lunchTime);
  const [beachSunbedsStatus, setBeachSunbedsStatus] = useState(
    initialBeach.sunbedsStatus
  );
  const [beachLunchStatus, setBeachLunchStatus] = useState(initialBeach.lunchStatus);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftRef = useRef({
    time,
    title,
    details,
    activity_type: activityType,
    booking_status: bookingStatus,
    establishment_city: activity.establishment_city ?? "",
    beach_sunbeds: beachSunbeds,
    beach_sunbeds_time: beachSunbedsTime,
    beach_lunch: beachLunch,
    beach_lunch_time: beachLunchTime,
    beach_sunbeds_status: beachSunbedsStatus,
    beach_lunch_status: beachLunchStatus,
  });

  useEffect(() => {
    const nextBeach = normalizeBeachClubActivity(activity);
    setTime(activity.time);
    setTitle(activity.title);
    setDetails(activity.details);
    setActivityType(activity.activity_type);
    setBookingStatus(normalizeBookingStatus(activity.booking_status));
    setBeachSunbeds(nextBeach.sunbedsEnabled);
    setBeachSunbedsTime(nextBeach.sunbedsTime);
    setBeachLunch(nextBeach.lunchEnabled);
    setBeachLunchTime(nextBeach.lunchTime);
    setBeachSunbedsStatus(nextBeach.sunbedsStatus);
    setBeachLunchStatus(nextBeach.lunchStatus);
    draftRef.current = {
      time: activity.time,
      title: activity.title,
      details: activity.details,
      activity_type: activity.activity_type,
      booking_status: normalizeBookingStatus(activity.booking_status),
      establishment_city: activity.establishment_city ?? "",
      beach_sunbeds: nextBeach.sunbedsEnabled,
      beach_sunbeds_time: nextBeach.sunbedsTime,
      beach_lunch: nextBeach.lunchEnabled,
      beach_lunch_time: nextBeach.lunchTime,
      beach_sunbeds_status: nextBeach.sunbedsStatus,
      beach_lunch_status: nextBeach.lunchStatus,
    };
  }, [
    activity.id,
    activity.time,
    activity.title,
    activity.details,
    activity.activity_type,
    activity.booking_status,
    activity.establishment_city,
    activity.beach_sunbeds,
    activity.beach_sunbeds_time,
    activity.beach_lunch,
    activity.beach_lunch_time,
    activity.beach_sunbeds_status,
    activity.beach_lunch_status,
  ]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const flush = useCallback(
    (immediate = false) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      const payload = syncBeachClubPersistedFields({
        ...draftRef.current,
        activity_type: draftRef.current.activity_type,
      });
      onPatch(
        activity.id,
        {
          time: payload.time ?? draftRef.current.time,
          title: payload.title ?? draftRef.current.title,
          details: payload.details ?? draftRef.current.details,
          activity_type: payload.activity_type ?? draftRef.current.activity_type,
          booking_status: payload.booking_status ?? draftRef.current.booking_status,
          establishment_city: payload.establishment_city ?? draftRef.current.establishment_city,
          beach_sunbeds: payload.beach_sunbeds ?? draftRef.current.beach_sunbeds,
          beach_sunbeds_time: payload.beach_sunbeds_time ?? draftRef.current.beach_sunbeds_time,
          beach_lunch: payload.beach_lunch ?? draftRef.current.beach_lunch,
          beach_lunch_time: payload.beach_lunch_time ?? draftRef.current.beach_lunch_time,
          beach_sunbeds_status:
            payload.beach_sunbeds_status ?? draftRef.current.beach_sunbeds_status,
          beach_lunch_status:
            payload.beach_lunch_status ?? draftRef.current.beach_lunch_status,
        },
        { immediate }
      );
    },
    [activity.id, onPatch]
  );

  const schedule = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => flush(false), PLANNER_AUTOSAVE_MS);
  }, [flush]);

  const updateDraft = (
    patch: Partial<
      Pick<
        Activity,
        | "time"
        | "title"
        | "details"
        | "activity_type"
        | "booking_status"
        | "establishment_city"
        | "beach_sunbeds"
        | "beach_sunbeds_time"
        | "beach_lunch"
        | "beach_lunch_time"
        | "beach_sunbeds_status"
        | "beach_lunch_status"
      >
    >,
    immediate = false
  ) => {
    if (patch.beach_sunbeds !== undefined) setBeachSunbeds(patch.beach_sunbeds);
    if (patch.beach_sunbeds_time !== undefined) {
      setBeachSunbedsTime(patch.beach_sunbeds_time);
    }
    if (patch.beach_lunch !== undefined) setBeachLunch(patch.beach_lunch);
    if (patch.beach_lunch_time !== undefined) setBeachLunchTime(patch.beach_lunch_time);
    if (patch.beach_sunbeds_status !== undefined) {
      setBeachSunbedsStatus(patch.beach_sunbeds_status);
    }
    if (patch.beach_lunch_status !== undefined) {
      setBeachLunchStatus(patch.beach_lunch_status);
    }
    draftRef.current = { ...draftRef.current, ...patch };
    if (immediate) flush(true);
    else schedule();
  };

  const category = ACTIVITY_TYPE_ESTABLISHMENT_CATEGORY[activityType];
  const isBeachClub = activityType === "beach_club";

  const bookingStatusSelect = (
    value: BookingStatus,
    onChange: (next: BookingStatus) => void,
    label: string
  ) => (
    <label className="adm-booking-status adm-booking-status--inline">
      <span className="adm-booking-status-label">{label}</span>
      <select
        className="adm-input adm-input--booking-status"
        value={value}
        onChange={(e) => onChange(normalizeBookingStatus(e.target.value))}
        aria-label={`${label} for ${title || "activity"}`}
      >
        {BOOKING_STATUS_OPTIONS.map((status) => (
          <option key={status} value={status}>
            {BOOKING_STATUS_LABELS[status]}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <div
      className="adm-activity"
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className="adm-activity-toolbar">
        <span className="adm-drag-handle" aria-hidden title="Drag to reorder">
          ⠿
        </span>
        {!isBeachClub ? (
          <input
            type="time"
            value={time}
            onChange={(e) => {
              setTime(e.target.value);
              updateDraft({ time: e.target.value });
            }}
            onBlur={() => flush(true)}
            className="adm-input adm-input--time"
          />
        ) : null}
        <select
          value={activityType}
          onChange={(e) => {
            const activity_type = e.target.value as ActivityType;
            setActivityType(activity_type);
            if (activity_type === "beach_club" && time.trim()) {
              updateDraft(
                {
                  activity_type,
                  beach_lunch: true,
                  beach_lunch_time: time,
                  beach_lunch_status: bookingStatus,
                },
                true
              );
              setBeachLunch(true);
              setBeachLunchTime(time);
              return;
            }
            updateDraft({ activity_type }, true);
          }}
          className="adm-input adm-input--type"
        >
          {PLANNER_ACTIVITY_TYPES.map((t) => (
            <option key={t} value={t}>
              {ACTIVITY_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
        <div className="adm-activity-actions">
          <button
            type="button"
            className="adm-icon-btn"
            onClick={onMoveUp}
            aria-label="Move up"
          >
            ↑
          </button>
          <button
            type="button"
            className="adm-icon-btn"
            onClick={onMoveDown}
            aria-label="Move down"
          >
            ↓
          </button>
          <button
            type="button"
            className="adm-icon-btn adm-icon-btn--danger"
            onClick={() => onRemove(activity.id)}
            aria-label="Remove"
          >
            ×
          </button>
        </div>
      </div>
      {activityType === "event" ? (
        <LibraryAutocomplete
          source="event"
          value={title}
          destination={destination}
          placeholder="Event — search library or type freely"
          className="adm-input adm-input--venue"
          onChange={(next) => {
            setTitle(next);
            updateDraft({ title: next });
          }}
          onBlur={() => flush(true)}
          onSelect={({ name, city }) => {
            setTitle(name);
            updateDraft(
              {
                title: name,
                establishment_city: city?.trim() ?? "",
              },
              true
            );
          }}
        />
      ) : category ? (
        <LibraryAutocomplete
          source="establishment"
          value={title}
          establishmentCategory={category}
          destination={destination}
          placeholder="Venue — search library or type freely"
          className="adm-input adm-input--venue"
          onChange={(next) => {
            setTitle(next);
            updateDraft({ title: next });
          }}
          onBlur={() => flush(true)}
          onSelect={({ name, city }) => {
            void (async () => {
              const params = new URLSearchParams({
                q: name,
                category,
                limit: "5",
              });
              const res = await fetch(`/api/establishments?${params}`);
              const data = (await res.json()) as Establishment[];
              const est = Array.isArray(data)
                ? data.find((row) => row.name === name) ?? data[0]
                : undefined;
              const autofillDetails = est
                ? formatEstablishmentDetails(est)
                : "";
              const nextDetails = details.trim() ? details : autofillDetails;
              const nextCity = city?.trim() || est?.city?.trim() || "";
              setTitle(name);
              if (!details.trim() && autofillDetails) {
                setDetails(autofillDetails);
              }
              draftRef.current = {
                ...draftRef.current,
                title: name,
                details: nextDetails,
                establishment_city: nextCity,
              };
              flush(true);
            })();
          }}
        />
      ) : (
        <input
          value={title}
          placeholder="Venue"
          onChange={(e) => {
            setTitle(e.target.value);
            updateDraft({ title: e.target.value });
          }}
          onBlur={() => flush(true)}
          className="adm-input adm-input--venue"
        />
      )}
      {isBeachClub ? (
        <div className="adm-beach-club-options">
          <div className="adm-beach-club-option">
            <label className="adm-checkbox adm-checkbox--inline">
              <input
                type="checkbox"
                checked={beachSunbeds}
                onChange={(event) => {
                  const checked = event.target.checked;
                  setBeachSunbeds(checked);
                  updateDraft({ beach_sunbeds: checked }, true);
                }}
              />
              <span>Sunbeds</span>
            </label>
            {beachSunbeds ? (
              <input
                type="time"
                className="adm-input adm-input--time"
                value={beachSunbedsTime}
                onChange={(event) => {
                  setBeachSunbedsTime(event.target.value);
                  updateDraft({ beach_sunbeds_time: event.target.value });
                }}
                onBlur={() => flush(true)}
                aria-label="Sunbeds time"
              />
            ) : null}
            {beachSunbeds
              ? bookingStatusSelect(beachSunbedsStatus, (next) => {
                  setBeachSunbedsStatus(next);
                  updateDraft({ beach_sunbeds_status: next }, true);
                }, "Sunbeds status")
              : null}
          </div>
          <div className="adm-beach-club-option">
            <label className="adm-checkbox adm-checkbox--inline">
              <input
                type="checkbox"
                checked={beachLunch}
                onChange={(event) => {
                  const checked = event.target.checked;
                  setBeachLunch(checked);
                  updateDraft({ beach_lunch: checked }, true);
                }}
              />
              <span>Lunch</span>
            </label>
            {beachLunch ? (
              <input
                type="time"
                className="adm-input adm-input--time"
                value={beachLunchTime}
                onChange={(event) => {
                  setBeachLunchTime(event.target.value);
                  updateDraft({ beach_lunch_time: event.target.value });
                }}
                onBlur={() => flush(true)}
                aria-label="Lunch time"
              />
            ) : null}
            {beachLunch
              ? bookingStatusSelect(beachLunchStatus, (next) => {
                  setBeachLunchStatus(next);
                  updateDraft({ beach_lunch_status: next }, true);
                }, "Lunch status")
              : null}
          </div>
        </div>
      ) : null}
      <input
        value={details}
        placeholder="Notes (optional)"
        onChange={(e) => {
          setDetails(e.target.value);
          updateDraft({ details: e.target.value });
        }}
        onBlur={() => flush(true)}
        className="adm-input adm-input--detail"
      />
      {isReservationActivityType(activityType) && !isBeachClub ? (
        <label className="adm-booking-status">
          <span className="adm-booking-status-label">Booking status</span>
          <select
            className="adm-input adm-input--booking-status"
            value={bookingStatus}
            onChange={(e) => {
              const next = normalizeBookingStatus(e.target.value);
              setBookingStatus(next);
              updateDraft({ booking_status: next }, true);
            }}
            aria-label={`Booking status for ${title || "activity"}`}
          >
            {BOOKING_STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {BOOKING_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </div>
  );
});

const DayEditor = memo(function DayEditor({
  day,
  destination,
  onAddActivity,
  onPatchActivity,
  onRemoveActivity,
  onUpdateSections,
  onReorderActivities,
  onDayDestinationOverrideChange,
  onDayDestinationOverrideBlur,
}: {
  day: TripDay;
  destination?: string;
  onAddActivity: Props["onAddActivity"];
  onPatchActivity: Props["onPatchActivity"];
  onRemoveActivity: Props["onRemoveActivity"];
  onUpdateSections: Props["onUpdateSections"];
  onReorderActivities: Props["onReorderActivities"];
  onDayDestinationOverrideChange: Props["onDayDestinationOverrideChange"];
  onDayDestinationOverrideBlur: Props["onDayDestinationOverrideBlur"];
}) {
  const [sections, setSections] = useState(() => getEditableSections(day));
  const labelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sectionsRef = useRef(sections);

  useEffect(() => {
    const next = getEditableSections(day);
    setSections(next);
    sectionsRef.current = next;
  }, [day.id, day.sections]);

  useEffect(() => {
    sectionsRef.current = sections;
  }, [sections]);

  useEffect(() => {
    return () => {
      if (labelTimerRef.current) clearTimeout(labelTimerRef.current);
    };
  }, []);

  const commitSections = useCallback(
    (next: DaySection[], immediate = false) => {
      const normalized = next.map((s, i) => ({ ...s, sort_order: i }));
      setSections(normalized);
      sectionsRef.current = normalized;

      if (labelTimerRef.current) {
        clearTimeout(labelTimerRef.current);
        labelTimerRef.current = null;
      }

      if (immediate) {
        onUpdateSections(day.id, normalized);
        return;
      }

      labelTimerRef.current = setTimeout(() => {
        labelTimerRef.current = null;
        onUpdateSections(day.id, sectionsRef.current);
      }, PLANNER_AUTOSAVE_MS);
    },
    [day.id, onUpdateSections]
  );

  const renameSection = (sectionId: string, label: string) => {
    commitSections(
      sectionsRef.current.map((s) =>
        s.id === sectionId ? { ...s, label } : s
      )
    );
  };

  const removeSection = (sectionId: string) => {
    commitSections(
      sectionsRef.current.filter((s) => s.id !== sectionId),
      true
    );
  };

  const moveSection = (sectionId: string, dir: -1 | 1) => {
    const idx = sectionsRef.current.findIndex((s) => s.id === sectionId);
    if (idx < 0) return;
    const target = idx + dir;
    if (target < 0 || target >= sectionsRef.current.length) return;
    commitSections(reorderItems(sectionsRef.current, idx, target), true);
  };

  const addSection = () => {
    commitSections(
      [
        ...sectionsRef.current,
        createSection("New Section", sectionsRef.current.length),
      ],
      true
    );
  };

  const handleSectionDrop = (targetId: string, e: DragEvent) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData("application/x-adm-section");
    if (!raw) return;
    const sourceId = raw;
    if (sourceId === targetId) return;
    const from = sectionsRef.current.findIndex((s) => s.id === sourceId);
    const to = sectionsRef.current.findIndex((s) => s.id === targetId);
    if (from < 0 || to < 0) return;
    commitSections(reorderItems(sectionsRef.current, from, to), true);
  };

  const reorderActs = (sectionId: string, ordered: Activity[]) => {
    onReorderActivities(
      day.id,
      sectionId,
      ordered.map((a) => a.id)
    );
  };

  const detectedDestination = resolveDayEffectiveDestination(day);

  return (
    <div className="adm-day">
      <div className="adm-day-head">
        <span className="adm-day-name">{formatGridDayName(day.date)}</span>
        <span className="adm-day-date">{formatGridDayDate(day.date)}</span>
      </div>

      <label className="adm-day-override">
        <span className="adm-field-label">Override destination (optional)</span>
        <input
          className="adm-input"
          value={day.destination_override ?? ""}
          onChange={(event) =>
            onDayDestinationOverrideChange(day.id, event.target.value)
          }
          onBlur={onDayDestinationOverrideBlur}
          placeholder={
            detectedDestination
              ? `Auto: ${detectedDestination}`
              : "Transfer, yacht, helicopter, villa…"
          }
        />
      </label>

      <div className="adm-day-sections">
        {sections.map((section) => {
          const acts = sortActivitiesForSection(
            day.activities.filter((a) => a.period === section.id),
            section.id,
            section.label
          );

          const moveActivity = (activityId: number, dir: -1 | 1) => {
            const idx = acts.findIndex((a) => a.id === activityId);
            if (idx < 0) return;
            const target = idx + dir;
            if (target < 0 || target >= acts.length) return;
            reorderActs(section.id, reorderItems(acts, idx, target));
          };

          const handleActivityDrop = (targetId: number, e: DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            const raw = e.dataTransfer.getData("application/x-adm-activity");
            if (!raw) return;
            const sourceId = Number(raw);
            if (sourceId === targetId) return;
            const from = acts.findIndex((a) => a.id === sourceId);
            const to = acts.findIndex((a) => a.id === targetId);
            if (from < 0 || to < 0) return;
            reorderActs(section.id, reorderItems(acts, from, to));
          };

          return (
            <div
              key={section.id}
              className="adm-section"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData(
                  "application/x-adm-section",
                  section.id
                );
                e.dataTransfer.effectAllowed = "move";
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleSectionDrop(section.id, e)}
            >
              <div className="adm-section-head">
                <span className="adm-drag-handle" aria-hidden>
                  ⠿
                </span>
                <input
                  value={section.label}
                  onChange={(e) => renameSection(section.id, e.target.value)}
                  onBlur={() =>
                    commitSections(sectionsRef.current, true)
                  }
                  className="adm-input adm-input--section"
                />
                <div className="adm-section-actions">
                  <button
                    type="button"
                    className="adm-icon-btn"
                    onClick={() => moveSection(section.id, -1)}
                    aria-label="Move section up"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="adm-icon-btn"
                    onClick={() => moveSection(section.id, 1)}
                    aria-label="Move section down"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="adm-icon-btn adm-icon-btn--danger"
                    onClick={() => removeSection(section.id)}
                    aria-label="Remove section"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="adm-section-body">
                {acts.map((a) => (
                  <ActivityEditRow
                    key={a.id}
                    activity={a}
                    destination={destination}
                    onPatch={onPatchActivity}
                    onRemove={onRemoveActivity}
                    onMoveUp={() => moveActivity(a.id, -1)}
                    onMoveDown={() => moveActivity(a.id, 1)}
                    draggable
                    onDragStart={(e) => {
                      e.stopPropagation();
                      e.dataTransfer.setData(
                        "application/x-adm-activity",
                        String(a.id)
                      );
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDrop={(e) => handleActivityDrop(a.id, e)}
                  />
                ))}

                <div className="adm-add-row">
                  {PLANNER_ACTIVITY_TYPES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      className="adm-add-btn"
                      onClick={() => onAddActivity(day.id, section.id, t)}
                    >
                      + {ACTIVITY_TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );
        })}

        <button type="button" className="adm-add-section" onClick={addSection}>
          + Add section
        </button>
      </div>
    </div>
  );
});

export const PlannerActivitiesEditor = memo(function PlannerActivitiesEditor({
  days,
  destination,
  onAddActivity,
  onPatchActivity,
  onRemoveActivity,
  onUpdateSections,
  onReorderActivities,
  onDayDestinationOverrideChange,
  onDayDestinationOverrideBlur,
}: Props) {
  if (days.length === 0) {
    return (
      <p className="adm-empty">
        Set arrival and departure dates to build the itinerary.
      </p>
    );
  }

  const dayCount = days.length;
  const wideDays = dayCount >= 3 && dayCount <= 5;

  return (
    <div
      className={`adm-days${wideDays ? " adm-days--wide" : ""}`}
      style={{ "--adm-days": dayCount } as CSSProperties}
    >
      {days.map((day) => (
        <DayEditor
          key={day.id}
          day={day}
          destination={destination}
          onAddActivity={onAddActivity}
          onPatchActivity={onPatchActivity}
          onRemoveActivity={onRemoveActivity}
          onUpdateSections={onUpdateSections}
          onReorderActivities={onReorderActivities}
          onDayDestinationOverrideChange={onDayDestinationOverrideChange}
          onDayDestinationOverrideBlur={onDayDestinationOverrideBlur}
        />
      ))}
    </div>
  );
});
