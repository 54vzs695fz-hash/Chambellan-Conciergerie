"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatDateRange } from "@/lib/planner-utils";
import {
  CHECKLIST_CATEGORY_LABELS,
  CHECKLIST_CATEGORY_ORDER,
  CHECKLIST_STATUS_LABELS,
  CHECKLIST_STATUS_OPTIONS,
} from "@/lib/planner/checklist-defaults";
import {
  categoryCounts,
  isImportantChecklistItem,
  sectionStatus,
  todayIsoDate,
  type SectionStatus,
} from "@/lib/planner/checklist-utils";
import { ProgrammeStatusBadge } from "@/components/status/ProgrammeStatusBadge";
import type { CalendarProgramme } from "@/lib/calendar/programmes";
import type {
  ChecklistCategory,
  ChecklistItem,
  ChecklistItemStatus,
} from "@/lib/types";

interface Props {
  programme: CalendarProgramme;
  today: Date;
  updatingId: number | null;
  onClose: () => void;
  onMarkDone: (id: number) => Promise<void>;
  onPatchItem: (id: number, fields: Partial<ChecklistItem>) => Promise<void>;
}

function groupItems(items: ChecklistItem[]) {
  const map = new Map<ChecklistCategory, ChecklistItem[]>();
  for (const category of CHECKLIST_CATEGORY_ORDER) {
    map.set(category, []);
  }
  for (const item of items) {
    const list = map.get(item.category);
    if (list) list.push(item);
  }
  for (const [category, list] of map) {
    list.sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
    map.set(category, list);
  }
  return map;
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
        {item.status !== "done" ? (
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
  onClose,
  onMarkDone,
  onPatchItem,
}: Props) {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllSections, setShowAllSections] = useState(false);
  const [expandedSections, setExpandedSections] = useState<
    Set<ChecklistCategory>
  >(new Set());

  const todayStr = useMemo(() => todayIsoDate(today), [today]);

  const loadChecklist = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/trips/${programme.id}/checklist`);
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) {
        setItems(data as ChecklistItem[]);
      }
    } finally {
      setLoading(false);
    }
  }, [programme.id]);

  useEffect(() => {
    void loadChecklist();
  }, [loadChecklist]);

  const grouped = useMemo(() => groupItems(items), [items]);

  const importantItems = useMemo(
    () =>
      items.filter((item) =>
        isImportantChecklistItem(
          item,
          todayStr,
          programme.arrivalDate,
          programme.departureDate
        )
      ),
    [items, todayStr, programme.arrivalDate, programme.departureDate]
  );

  useEffect(() => {
    const urgentSections = CHECKLIST_CATEGORY_ORDER.filter((category) => {
      const sectionItems = grouped.get(category) ?? [];
      return sectionItems.some((item) =>
        isImportantChecklistItem(
          item,
          todayStr,
          programme.arrivalDate,
          programme.departureDate
        )
      );
    });
    setExpandedSections(new Set(urgentSections));
    setShowAllSections(false);
  }, [programme.id, grouped, todayStr, programme.arrivalDate, programme.departureDate]);

  const visibleCategories = useMemo(() => {
    if (showAllSections) return CHECKLIST_CATEGORY_ORDER;
    return CHECKLIST_CATEGORY_ORDER.filter((category) => {
      const sectionItems = grouped.get(category) ?? [];
      return sectionItems.some((item) =>
        isImportantChecklistItem(
          item,
          todayStr,
          programme.arrivalDate,
          programme.departureDate
        )
      );
    });
  }, [
    showAllSections,
    grouped,
    todayStr,
    programme.arrivalDate,
    programme.departureDate,
  ]);

  const handlePatch = async (id: number, fields: Partial<ChecklistItem>) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...fields } : item))
    );
    await onPatchItem(id, fields);
  };

  const handleDone = async (id: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: "done" as const } : item
      )
    );
    await onMarkDone(id);
  };

  const toggleSection = (category: ChecklistCategory) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  return (
    <section className="cal-fu-panel" aria-label="Follow-up and operations">
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
          <ProgrammeStatusBadge
            status={programme.followUpStatus}
            showDot
            arrivalDate={programme.arrivalDate}
          />
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

      {loading ? (
        <p className="cal-fu-loading">Loading checklist…</p>
      ) : (
        <>
          {importantItems.length > 0 ? (
            <div className="cal-fu-priority">
              <h3 className="cal-fu-priority-title">Priority items</h3>
              <ul className="cal-fu-priority-list">
                {importantItems.slice(0, 8).map((item) => (
                  <li key={item.id} className="cal-fu-priority-item">
                    <span className="cal-fu-priority-label">
                      {CHECKLIST_CATEGORY_LABELS[item.category]} — {item.title}
                    </span>
                    <button
                      type="button"
                      className="cal-fu-done cal-fu-done--compact min-h-[44px]"
                      disabled={updatingId === item.id}
                      onClick={() => void handleDone(item.id)}
                    >
                      {updatingId === item.id ? "…" : "Done"}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="cal-fu-empty-priority">No urgent items right now.</p>
          )}

          <div className="cal-fu-toolbar">
            <button
              type="button"
              className="cal-fu-toggle"
              onClick={() => setShowAllSections((v) => !v)}
            >
              {showAllSections ? "Show priority only" : "Show all sections"}
            </button>
          </div>

          <div className="cal-fu-sections">
            {visibleCategories.map((category) => {
              const sectionItems = grouped.get(category) ?? [];
              const { done, pending } = categoryCounts(sectionItems);
              const status = sectionStatus(
                sectionItems,
                todayStr,
                programme.arrivalDate,
                programme.departureDate
              );
              const isOpen = expandedSections.has(category);

              return (
                <div key={category} className="cal-fu-section">
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
                    <span className="cal-fu-section-counts">
                      {done} done · {pending} pending
                    </span>
                    <span className="cal-fu-section-chevron" aria-hidden>
                      {isOpen ? "▾" : "▸"}
                    </span>
                  </button>
                  {isOpen ? (
                    <ul className="cal-fu-items">
                      {sectionItems.map((item) => (
                        <FollowUpItemRow
                          key={item.id}
                          item={item}
                          updating={updatingId === item.id}
                          onMarkDone={(id) => void handleDone(id)}
                          onPatchItem={(id, fields) => void handlePatch(id, fields)}
                        />
                      ))}
                    </ul>
                  ) : null}
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
