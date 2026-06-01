"use client";

import { memo, useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import type { CSSProperties } from "react";
import type { Activity, ActivityType, DaySection, Establishment, TripDay } from "@/lib/types";
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
  const [time, setTime] = useState(activity.time);
  const [title, setTitle] = useState(activity.title);
  const [details, setDetails] = useState(activity.details);
  const [activityType, setActivityType] = useState(activity.activity_type);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftRef = useRef({ time, title, details, activity_type: activityType });

  useEffect(() => {
    setTime(activity.time);
    setTitle(activity.title);
    setDetails(activity.details);
    setActivityType(activity.activity_type);
    draftRef.current = {
      time: activity.time,
      title: activity.title,
      details: activity.details,
      activity_type: activity.activity_type,
    };
  }, [activity.id]);

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
      const payload = draftRef.current;
      onPatch(
        activity.id,
        {
          time: payload.time,
          title: payload.title,
          details: payload.details,
          activity_type: payload.activity_type,
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
    patch: Partial<Pick<Activity, "time" | "title" | "details" | "activity_type">>,
    immediate = false
  ) => {
    draftRef.current = { ...draftRef.current, ...patch };
    if (immediate) flush(true);
    else schedule();
  };

  const category = ACTIVITY_TYPE_ESTABLISHMENT_CATEGORY[activityType];

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
        <select
          value={activityType}
          onChange={(e) => {
            const activity_type = e.target.value as ActivityType;
            setActivityType(activity_type);
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
              const autofillDetails = formatEstablishmentDetails(est);
              const nextDetails = details.trim() ? details : autofillDetails;
              setTitle(est.name);
              if (!details.trim() && autofillDetails) {
                setDetails(autofillDetails);
              }
              draftRef.current = {
                ...draftRef.current,
                title: est.name,
                details: nextDetails,
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
}: {
  day: TripDay;
  destination?: string;
  onAddActivity: Props["onAddActivity"];
  onPatchActivity: Props["onPatchActivity"];
  onRemoveActivity: Props["onRemoveActivity"];
  onUpdateSections: Props["onUpdateSections"];
  onReorderActivities: Props["onReorderActivities"];
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

  return (
    <div className="adm-day">
      <div className="adm-day-head">
        <span className="adm-day-name">{formatGridDayName(day.date)}</span>
        <span className="adm-day-date">{formatGridDayDate(day.date)}</span>
      </div>

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
        />
      ))}
    </div>
  );
});
