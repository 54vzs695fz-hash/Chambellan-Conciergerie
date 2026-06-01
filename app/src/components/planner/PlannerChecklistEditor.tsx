"use client";

import { useMemo, useState } from "react";
import {
  CHECKLIST_CATEGORY_LABELS,
  CHECKLIST_CATEGORY_ORDER,
  CHECKLIST_STATUS_LABELS,
  CHECKLIST_STATUS_OPTIONS,
} from "@/lib/planner/checklist-defaults";
import type {
  ChecklistCategory,
  ChecklistItem,
  ChecklistItemStatus,
} from "@/lib/types";

interface Props {
  items: ChecklistItem[];
  onPatchItem: (
    id: number,
    fields: Partial<ChecklistItem>,
    options?: { immediate?: boolean }
  ) => void;
  onAddItem: (category: ChecklistCategory) => void;
  onRemoveItem: (id: number) => void;
}

function groupByCategory(items: ChecklistItem[]) {
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

function categoryProgress(items: ChecklistItem[]) {
  const done = items.filter((i) => i.status === "done").length;
  return { done, total: items.length };
}

function ChecklistItemRow({
  item,
  onPatchItem,
  onRemoveItem,
}: {
  item: ChecklistItem;
  onPatchItem: Props["onPatchItem"];
  onRemoveItem: Props["onRemoveItem"];
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <li
      className={`chk-item chk-item--${item.status}${expanded ? " is-expanded" : ""}`}
    >
      <div className="chk-item-main">
        <select
          className="chk-status-select"
          value={item.status}
          onChange={(e) =>
            onPatchItem(
              item.id,
              { status: e.target.value as ChecklistItemStatus },
              { immediate: true }
            )
          }
          aria-label={`Status for ${item.title}`}
        >
          {CHECKLIST_STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {CHECKLIST_STATUS_LABELS[status]}
            </option>
          ))}
        </select>
        <input
          className="chk-title-input"
          value={item.title}
          onChange={(e) => onPatchItem(item.id, { title: e.target.value })}
          onBlur={() => onPatchItem(item.id, {}, { immediate: true })}
          aria-label="Checklist item title"
        />
        <button
          type="button"
          className="chk-details-btn min-h-[44px] min-w-[44px]"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-label={expanded ? "Hide details" : "Show details"}
        >
          {expanded ? "−" : "+"}
        </button>
        <button
          type="button"
          className="chk-delete-btn min-h-[44px] min-w-[44px]"
          onClick={() => onRemoveItem(item.id)}
          aria-label={`Delete ${item.title}`}
        >
          ×
        </button>
      </div>
      {expanded ? (
        <div className="chk-item-details">
          <label className="chk-detail-field">
            <span>Notes</span>
            <textarea
              className="adm-textarea chk-notes"
              value={item.notes}
              onChange={(e) => onPatchItem(item.id, { notes: e.target.value })}
              onBlur={() => onPatchItem(item.id, {}, { immediate: true })}
              rows={2}
              placeholder="Internal notes…"
            />
          </label>
          <div className="chk-date-row">
            <label className="chk-detail-field">
              <span>Due date</span>
              <input
                type="date"
                className="adm-input"
                value={item.due_date}
                onChange={(e) =>
                  onPatchItem(item.id, { due_date: e.target.value })
                }
                onBlur={() => onPatchItem(item.id, {}, { immediate: true })}
              />
            </label>
            <label className="chk-detail-field">
              <span>Reminder</span>
              <input
                type="date"
                className="adm-input"
                value={item.reminder_date}
                onChange={(e) =>
                  onPatchItem(item.id, { reminder_date: e.target.value })
                }
                onBlur={() => onPatchItem(item.id, {}, { immediate: true })}
              />
            </label>
          </div>
        </div>
      ) : null}
    </li>
  );
}

export function PlannerChecklistEditor({
  items,
  onPatchItem,
  onAddItem,
  onRemoveItem,
}: Props) {
  const grouped = useMemo(() => groupByCategory(items), [items]);
  const [openCategories, setOpenCategories] = useState<Set<ChecklistCategory>>(
    () => new Set(["programme", "reservations", "arrival"])
  );

  const toggleCategory = (category: ChecklistCategory) => {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  return (
    <div className="chk-root">
      {CHECKLIST_CATEGORY_ORDER.map((category) => {
        const categoryItems = grouped.get(category) ?? [];
        const { done, total } = categoryProgress(categoryItems);
        const isOpen = openCategories.has(category);

        return (
          <section key={category} className="chk-category">
            <button
              type="button"
              className="chk-category-header min-h-[44px]"
              onClick={() => toggleCategory(category)}
              aria-expanded={isOpen}
            >
              <span className="chk-category-title">
                {CHECKLIST_CATEGORY_LABELS[category]}
              </span>
              <span className="chk-category-meta">
                {done}/{total}
              </span>
              <span className="chk-category-chevron" aria-hidden>
                {isOpen ? "▾" : "▸"}
              </span>
            </button>
            {isOpen ? (
              <div className="chk-category-body">
                <ul className="chk-list">
                  {categoryItems.map((item) => (
                    <ChecklistItemRow
                      key={item.id}
                      item={item}
                      onPatchItem={onPatchItem}
                      onRemoveItem={onRemoveItem}
                    />
                  ))}
                </ul>
                <button
                  type="button"
                  className="chk-add-btn min-h-[44px]"
                  onClick={() => onAddItem(category)}
                >
                  + Add item
                </button>
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
