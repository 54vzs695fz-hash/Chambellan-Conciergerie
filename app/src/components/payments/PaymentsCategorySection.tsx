"use client";

import { memo, useState, type ComponentType } from "react";
import { PaymentSummaryCard } from "@/components/payments/PaymentSummaryCard";
import { CHECKLIST_CATEGORY_LABELS } from "@/lib/planner/checklist-defaults";
import { buildTripPaymentSummary } from "@/lib/planner/payment-summary";
import {
  categoryCounts,
  sectionStatus,
  type SectionStatus,
} from "@/lib/planner/checklist-utils";
import type {
  ChecklistItem,
  Trip,
  TripPaymentStatus,
} from "@/lib/types";

interface FollowUpItemRowProps {
  item: ChecklistItem;
  updating: boolean;
  onMarkDone: (id: number) => void;
  onPatchItem: (id: number, fields: Partial<ChecklistItem>) => void;
}

function statusDotClass(status: SectionStatus): string {
  if (status === "complete") return "cal-fu-dot cal-fu-dot--complete";
  if (status === "urgent") return "cal-fu-dot cal-fu-dot--urgent";
  return "cal-fu-dot cal-fu-dot--pending";
}

export const PaymentsCategorySection = memo(function PaymentsCategorySection({
  trip,
  sectionItems,
  isOpen,
  todayStr,
  arrivalDate,
  departureDate,
  updatingId,
  addingTaskCategory,
  savingPayment,
  paymentError,
  onToggle,
  onMarkDone,
  onPatchItem,
  onAddTask,
  onPaymentStatusChange,
  onPaymentFieldsChange,
  FollowUpItemRow,
}: {
  trip: Trip;
  sectionItems: ChecklistItem[];
  isOpen: boolean;
  todayStr: string;
  arrivalDate: string;
  departureDate: string;
  updatingId: number | null;
  addingTaskCategory: boolean;
  savingPayment: boolean;
  paymentError: string | null;
  onToggle: () => void;
  onMarkDone: (id: number) => void;
  onPatchItem: (id: number, fields: Partial<ChecklistItem>) => void;
  onAddTask: () => void;
  onPaymentStatusChange: (status: TripPaymentStatus) => void;
  onPaymentFieldsChange: (
    fields: Partial<
      Pick<
        Trip,
        | "payment_status"
        | "total_amount"
        | "amount_received"
        | "payment_method"
        | "payment_notes"
      >
    >
  ) => void | Promise<void>;
  FollowUpItemRow: ComponentType<FollowUpItemRowProps>;
}) {
  const [tasksOpen, setTasksOpen] = useState(false);
  const summary = buildTripPaymentSummary(trip);
  const { done, total } = categoryCounts(sectionItems);
  const status = sectionStatus(
    sectionItems,
    todayStr,
    arrivalDate,
    departureDate
  );
  const showTasks =
    !summary.hidePaymentChecklist && sectionItems.length > 0;

  return (
    <div className={`cal-fu-section cal-fu-section--payments${isOpen ? " is-open" : ""}`}>
      <button
        type="button"
        className="cal-fu-section-header min-h-[44px]"
        onClick={onToggle}
        aria-expanded={isOpen}
      >
        <span className={statusDotClass(status)} aria-hidden />
        <span className="cal-fu-section-title">
          {CHECKLIST_CATEGORY_LABELS.payments}
        </span>
        {showTasks ? (
          <span className="cal-fu-section-progress">
            {done}/{total}
          </span>
        ) : (
          <span className="cal-fu-section-progress cal-fu-section-progress--muted">
            {summary.statusLabel}
          </span>
        )}
        <span className="cal-fu-section-chevron" aria-hidden>
          {isOpen ? "▾" : "▸"}
        </span>
      </button>

      {isOpen ? (
        <div className="cal-fu-payments-body">
          <PaymentSummaryCard
            trip={trip}
            saving={savingPayment}
            paymentError={paymentError}
            onStatusChange={onPaymentStatusChange}
            onFieldsChange={onPaymentFieldsChange}
          />

          {showTasks ? (
            <div className="cal-fu-payment-tasks">
              <button
                type="button"
                className="cal-fu-payment-tasks-toggle min-h-[44px]"
                onClick={() => setTasksOpen((value) => !value)}
                aria-expanded={tasksOpen}
              >
                <span>Payment tasks</span>
                <span className="cal-fu-section-progress">
                  {done}/{total}
                </span>
                <span aria-hidden>{tasksOpen ? "▾" : "▸"}</span>
              </button>

              {tasksOpen ? (
                <>
                  <ul className="cal-fu-items cal-fu-items--secondary">
                    {sectionItems.map((item) => (
                      <FollowUpItemRow
                        key={item.id}
                        item={item}
                        updating={updatingId === item.id}
                        onMarkDone={onMarkDone}
                        onPatchItem={onPatchItem}
                      />
                    ))}
                  </ul>
                  <button
                    type="button"
                    className="cal-fu-add-task cal-fu-add-task--secondary min-h-[44px]"
                    disabled={addingTaskCategory}
                    onClick={onAddTask}
                  >
                    {addingTaskCategory ? "Adding…" : "+ Add task"}
                  </button>
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
});
