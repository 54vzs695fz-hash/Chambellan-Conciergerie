"use client";

import { type DragEvent } from "react";
import type { CSSProperties } from "react";
import type { Activity, ActivityType, DaySection, TripDay } from "@/lib/types";
import { ACTIVITY_TYPE_LABELS } from "@/lib/types";
import {
  createSection,
  getEditableSections,
} from "@/lib/planner/day-sections";
import { PLANNER_ACTIVITY_TYPES } from "@/lib/planner/planner-sheet-model";
import {
  formatGridDayDate,
  formatGridDayName,
} from "@/lib/planner-utils";

function reorderItems<T>(items: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= items.length) return items;
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

function sortActivities(activities: Activity[]): Activity[] {
  return [...activities].sort(
    (a, b) => a.sort_order - b.sort_order || a.id - b.id
  );
}

interface Props {
  days: TripDay[];
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

function ActivityEditRow({
  activity,
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
  onPatch: (id: number, fields: Partial<Activity>) => void;
  onRemove: (id: number) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  draggable?: boolean;
  onDragStart?: (e: DragEvent) => void;
  onDragOver?: (e: DragEvent) => void;
  onDrop?: (e: DragEvent) => void;
}) {
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
          value={activity.time}
          onChange={(e) => onPatch(activity.id, { time: e.target.value })}
          className="adm-input adm-input--time"
        />
        <select
          value={activity.activity_type}
          onChange={(e) =>
            onPatch(activity.id, {
              activity_type: e.target.value as ActivityType,
            })
          }
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
      <input
        value={activity.title}
        placeholder="Venue"
        onChange={(e) => onPatch(activity.id, { title: e.target.value })}
        className="adm-input adm-input--venue"
      />
      <input
        value={activity.details}
        placeholder="Notes (optional)"
        onChange={(e) => onPatch(activity.id, { details: e.target.value })}
        className="adm-input adm-input--detail"
      />
    </div>
  );
}

function DayEditor({
  day,
  onAddActivity,
  onPatchActivity,
  onRemoveActivity,
  onUpdateSections,
  onReorderActivities,
}: {
  day: TripDay;
} & Props) {
  const sections = getEditableSections(day);

  const saveSections = (next: DaySection[]) => {
    onUpdateSections(
      day.id,
      next.map((s, i) => ({ ...s, sort_order: i }))
    );
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
    saveSections(reorderItems(sections, idx, target));
  };

  const addSection = () => {
    saveSections([...sections, createSection("New Section", sections.length)]);
  };

  const handleSectionDrop = (targetId: string, e: DragEvent) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData("application/x-adm-section");
    if (!raw) return;
    const sourceId = raw;
    if (sourceId === targetId) return;
    const from = sections.findIndex((s) => s.id === sourceId);
    const to = sections.findIndex((s) => s.id === targetId);
    if (from < 0 || to < 0) return;
    saveSections(reorderItems(sections, from, to));
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
          const acts = sortActivities(
            day.activities.filter((a) => a.period === section.id)
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
}

export function PlannerActivitiesEditor({
  days,
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
          days={days}
          onAddActivity={onAddActivity}
          onPatchActivity={onPatchActivity}
          onRemoveActivity={onRemoveActivity}
          onUpdateSections={onUpdateSections}
          onReorderActivities={onReorderActivities}
        />
      ))}
    </div>
  );
}
