"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatDateRange } from "@/lib/planner-utils";
import {
  CHECKLIST_CATEGORY_LABELS,
  CHECKLIST_STATUS_LABELS,
  CHECKLIST_STATUS_OPTIONS,
} from "@/lib/planner/checklist-defaults";
import {
  getAddableChecklistCategories,
  getVisibleChecklistCategories,
  groupVisibleChecklistItems,
} from "@/lib/planner/checklist-display";
import type { TripProgrammeContext } from "@/lib/dashboard/checklist-follow-up-eligibility";
import {
  categoryCounts,
  sectionStatus,
  todayIsoDate,
  type SectionStatus,
} from "@/lib/planner/checklist-utils";
import { ProgrammeStatusBadge } from "@/components/status/ProgrammeStatusBadge";
import { PaymentStatusPicker } from "@/components/status/PaymentStatusPicker";
import type { CalendarProgramme } from "@/lib/calendar/programmes";
import type {
  ActivityType,
  ChecklistCategory,
  ChecklistItem,
  ChecklistItemStatus,
  Trip,
  TripPaymentStatus,
} from "@/lib/types";

interface ChecklistPanelData {
  items: ChecklistItem[];
  trip: Trip;
  context: {
    activityTypes: ActivityType[];
    transferCount: number;
  };
}

interface Props {
  programme: CalendarProgramme;
  today: Date;
  updatingId: number | null;
  updatingPaymentId: number | null;
  paymentError: string | null;
  onClose: () => void;
  onMarkDone: (id: number) => Promise<void>;
  onPatchItem: (id: number, fields: Partial<ChecklistItem>) => Promise<void>;
  onPaymentStatusChange: (status: TripPaymentStatus) => void;
  variant?: "full" | "embedded";
}

function sortSectionItems(items: ChecklistItem[]): ChecklistItem[] {
  const open = items
    .filter((item) => item.status !== "done")
    .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
  const done = items
    .filter((item) => item.status === "done")
    .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
  return [...open, ...done];
}

function toProgrammeContext(
  context: ChecklistPanelData["context"]
): TripProgrammeContext {
  return {
    activityTypes: new Set(context.activityTypes),
    transferCount: context.transferCount,
  };
}

function statusDotClass(status: SectionStatus): string {
  if (status === "complete") return "cal-fu-dot cal-fu-dot--complete";
  if (status === "urgent") return "cal-fu-dot cal-fu-dot--urgent";
  return "cal-fu-dot cal-fu-dot--pending";
}

function FollowUpItemRow({
  item,
  updating,
  onMarkDone,
  onPatchItem,
}: {
  item: ChecklistItem;
  updating: boolean;
  onMarkDone: (id: number) => void;
  onPatchItem: (id: number, fields: Partial<ChecklistItem>) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isDone = item.status === "done";

  return (
    <li className={`cal-fu-item cal-fu-item--${item.status}`}>
      <div className="cal-fu-item-main">
        <select
          className="cal-fu-status"
          value={item.status}
          onChange={(e) =>
            onPatchItem(item.id, {
              status: e.target.value as ChecklistItemStatus,
            })
          }
          aria-label={`Status for ${item.title}`}
        >
          {CHECKLIST_STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {CHECKLIST_STATUS_LABELS[status]}
            </option>
          ))}
        </select>
        <span className="cal-fu-item-title">{item.title}</span>
        <button
          type="button"
          className="cal-fu-details min-h-[44px] min-w-[44px]"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-label={expanded ? "Hide details" : "Edit details"}
        >
          {expanded ? "−" : "+"}
        </button>
        {!isDone ? (
          <button
            type="button"
            className="cal-fu-done min-h-[44px]"
            disabled={updating}
            onClick={() => onMarkDone(item.id)}
          >
            {updating ? "…" : "Done"}
          </button>
        ) : null}
      </div>
      {expanded ? (
        <div className="cal-fu-item-edit">
          <label className="cal-fu-field">
            <span>Title</span>
            <input
              className="cal-fu-input"
              value={item.title}
              onChange={(e) => onPatchItem(item.id, { title: e.target.value })}
            />
          </label>
          <label className="cal-fu-field">
            <span>Notes</span>
            <textarea
              className="cal-fu-textarea"
              value={item.notes}
              rows={2}
              onChange={(e) => onPatchItem(item.id, { notes: e.target.value })}
            />
          </label>
          <div className="cal-fu-dates">
            <label className="cal-fu-field">
              <span>Due</span>
              <input
                type="date"
                className="cal-fu-input"
                value={item.due_date}
                onChange={(e) =>
                  onPatchItem(item.id, { due_date: e.target.value })
                }
              />
            </label>
            <label className="cal-fu-field">
              <span>Reminder</span>
              <input
                type="date"
                className="cal-fu-input"
                value={item.reminder_date}
                onChange={(e) =>
                  onPatchItem(item.id, { reminder_date: e.target.value })
                }
              />
            </label>
          </div>
        </div>
      ) : null}
    </li>
  );
}

export function CalendarProgrammeFollowUpPanel({
  programme,
  today,
  updatingId,
  updatingPaymentId,
  paymentError,
  onClose,
  onMarkDone,
  onPatchItem,
  onPaymentStatusChange,
  variant = "full",
}: Props) {
  const [panelData, setPanelData] = useState<ChecklistPanelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSection, setExpandedSection] = useState<ChecklistCategory | null>(
    null
  );
  const [addingCategory, setAddingCategory] = useState(false);
  const [addingTaskCategory, setAddingTaskCategory] =
    useState<ChecklistCategory | null>(null);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  const todayStr = useMemo(() => todayIsoDate(today), [today]);

  const loadChecklist = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/trips/${programme.id}/checklist?format=panel`);
      if (!res.ok) return;
      const data = (await res.json()) as ChecklistPanelData;
      if (data?.items && data.trip) {
        setPanelData(data);
      }
    } finally {
      setLoading(false);
    }
  }, [programme.id]);

  useEffect(() => {
    setExpandedSection(null);
    setShowCategoryPicker(false);
    void loadChecklist();
  }, [loadChecklist, programme.id]);

  const programmeContext = useMemo(
    () => (panelData ? toProgrammeContext(panelData.context) : null),
    [panelData]
  );

  const visibleCategories = useMemo(() => {
    if (!panelData || !programmeContext) return [];
    return getVisibleChecklistCategories(
      panelData.items,
      panelData.trip,
      programmeContext,
      today
    );
  }, [panelData, programmeContext, today]);

  const addableCategories = useMemo(() => {
    if (!panelData || !programmeContext) return [];
    return getAddableChecklistCategories(
      panelData.items,
      panelData.trip,
      programmeContext,
      today
    );
  }, [panelData, programmeContext, today]);

  const grouped = useMemo(() => {
    if (!panelData || !programmeContext) {
      return new Map<ChecklistCategory, ChecklistItem[]>();
    }
    const map = groupVisibleChecklistItems(
      panelData.items,
      panelData.trip,
      programmeContext,
      today
    );
    for (const [category, list] of map) {
      map.set(category, sortSectionItems(list));
    }
    return map;
  }, [panelData, programmeContext, today]);

  const handlePatch = async (id: number, fields: Partial<ChecklistItem>) => {
    setPanelData((current) => {
      if (!current) return current;
      const items = current.items.map((item) =>
        item.id === id ? { ...item, ...fields } : item
      );
      return { ...current, items };
    });
    await onPatchItem(id, fields);
  };

  const handleDone = async (id: number) => {
    setPanelData((current) => {
      if (!current) return current;
      const items = current.items.map((item) =>
        item.id === id ? { ...item, status: "done" as const } : item
      );
      return { ...current, items };
    });
    await onMarkDone(id);
  };

  const handleAddCategory = async (category: ChecklistCategory) => {
    setAddingCategory(true);
    setShowCategoryPicker(false);
    try {
      const res = await fetch(`/api/trips/${programme.id}/checklist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "activate_category", category }),
      });
      if (!res.ok) return;
      const items = (await res.json()) as ChecklistItem[];
      setPanelData((current) => (current ? { ...current, items } : current));
      setExpandedSection(category);
    } finally {
      setAddingCategory(false);
    }
  };

  const handleAddTask = async (category: ChecklistCategory) => {
    setAddingTaskCategory(category);
    try {
      const res = await fetch(`/api/trips/${programme.id}/checklist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, title: "New item" }),
      });
      if (!res.ok) return;
      const item = (await res.json()) as ChecklistItem;
      setPanelData((current) =>
        current ? { ...current, items: [...current.items, item] } : current
      );
      setExpandedSection(category);
    } finally {
      setAddingTaskCategory(null);
    }
  };

  const toggleSection = (category: ChecklistCategory) => {
    setExpandedSection((current) => (current === category ? null : category));
  };

  return (
    <section
      className={`cal-fu-panel${variant === "embedded" ? " cal-fu-panel--embedded" : ""}`}
      aria-label="Follow-up and operations"
    >
      {variant === "full" ? (
        <div className="cal-fu-header">
          <div className="cal-fu-header-copy">
            <h2 className="cal-fu-title">Follow-up & Operations</h2>
            <p className="cal-fu-programme font-serif text-gold tracking-wide">
              {programme.destination}
            </p>
            <p className="cal-fu-meta">
              {programme.clientName}
              {programme.guestCount ? ` · ${programme.guestCount}` : ""}
              {" · "}
              {formatDateRange(programme.arrivalDate, programme.departureDate)}
            </p>
            <span className="cal-programme-badges cal-fu-badges">
              <ProgrammeStatusBadge
                status={programme.followUpStatus}
                showDot
                arrivalDate={programme.arrivalDate}
              />
              <PaymentStatusPicker
                status={programme.paymentStatus}
                arrivalDate={programme.arrivalDate}
                saving={updatingPaymentId === programme.id}
                error={paymentError}
                onSelect={onPaymentStatusChange}
              />
            </span>
          </div>
          <div className="cal-fu-header-actions">
            <Link href={programme.plannerHref} className="cal-fu-planner-link">
              Open planner
            </Link>
            <button
              type="button"
              className="cal-fu-close min-h-[44px] min-w-[44px]"
              onClick={onClose}
              aria-label="Close follow-up panel"
            >
              ×
            </button>
          </div>
        </div>
      ) : (
        <h3 className="cal-fu-embedded-title">Follow-up checklist</h3>
      )}

      {loading ? (
        <p className="cal-fu-loading">Loading checklist…</p>
      ) : (
        <>
          <div className="cal-fu-sections">
            {visibleCategories.length === 0 ? (
              <p className="cal-fu-empty">
                No checklist sections yet. Add a category to start tracking
                tasks for this programme.
              </p>
            ) : null}

            {visibleCategories.map((category) => {
              const sectionItems = grouped.get(category) ?? [];
              const { done, total } = categoryCounts(sectionItems);
              const status = sectionStatus(
                sectionItems,
                todayStr,
                programme.arrivalDate,
                programme.departureDate
              );
              const isOpen = expandedSection === category;

              return (
                <div
                  key={category}
                  className={`cal-fu-section${isOpen ? " is-open" : ""}`}
                >
                  <button
                    type="button"
                    className="cal-fu-section-header min-h-[44px]"
                    onClick={() => toggleSection(category)}
                    aria-expanded={isOpen}
                  >
                    <span className={statusDotClass(status)} aria-hidden />
                    <span className="cal-fu-section-title">
                      {CHECKLIST_CATEGORY_LABELS[category]}
                    </span>
                    <span className="cal-fu-section-progress">
                      {done}/{total}
                    </span>
                    <span className="cal-fu-section-chevron" aria-hidden>
                      {isOpen ? "▾" : "▸"}
                    </span>
                  </button>
                  {isOpen ? (
                    <>
                      <ul className="cal-fu-items">
                        {sectionItems.map((item) => (
                          <FollowUpItemRow
                            key={item.id}
                            item={item}
                            updating={updatingId === item.id}
                            onMarkDone={(id) => void handleDone(id)}
                            onPatchItem={(id, fields) =>
                              void handlePatch(id, fields)
                            }
                          />
                        ))}
                      </ul>
                      <button
                        type="button"
                        className="cal-fu-add-task min-h-[44px]"
                        disabled={addingTaskCategory === category}
                        onClick={() => void handleAddTask(category)}
                      >
                        {addingTaskCategory === category
                          ? "Adding…"
                          : "+ Add task"}
                      </button>
                    </>
                  ) : null}
                </div>
              );
            })}
          </div>

          {addableCategories.length > 0 ? (
            <div className="cal-fu-add-category">
              {showCategoryPicker ? (
                <div className="cal-fu-add-category-picker">
                  <p className="cal-fu-add-category-label">Choose a category</p>
                  <div className="cal-fu-add-category-options">
                    {addableCategories.map((category) => (
                      <button
                        key={category}
                        type="button"
                        className="cal-fu-add-category-option min-h-[44px]"
                        disabled={addingCategory}
                        onClick={() => void handleAddCategory(category)}
                      >
                        {CHECKLIST_CATEGORY_LABELS[category]}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="cal-fu-add-category-cancel min-h-[44px]"
                    onClick={() => setShowCategoryPicker(false)}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="cal-fu-add-category-btn min-h-[44px]"
                  disabled={addingCategory}
                  onClick={() => setShowCategoryPicker(true)}
                >
                  {addingCategory ? "Adding…" : "+ Add category"}
                </button>
              )}
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
