import {
  normalizeTripPaymentMethod,
  normalizeTripPaymentStatus,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  paymentMethodLabel,
} from "@/lib/planner/payment-status";
import type { Trip, TripPaymentMethod, TripPaymentStatus } from "@/lib/types";

export interface TripPaymentSummary {
  status: TripPaymentStatus;
  statusLabel: string;
  totalAmount: string;
  amountReceived: string;
  remainingBalance: number | null;
  remainingBalanceLabel: string;
  paymentMethod: TripPaymentMethod | "";
  paymentMethodLabel: string;
  paymentNotes: string;
  indicator: string;
  indicatorTone: "pending" | "deposit" | "paid" | "cancelled";
  showAmountReceived: boolean;
  showRemainingBalance: boolean;
  hidePaymentChecklist: boolean;
}

const PAYMENT_CHECKLIST_TITLES = new Set(
  [
    "Deposit requested",
    "Deposit received",
    "Balance requested",
    "Fully paid",
    "Invoice sent",
  ].map((title) => title.trim().toLowerCase())
);

export function parsePaymentAmount(
  value: string | null | undefined
): number | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const cleaned = raw.replace(/[^\d.,-]/g, "").replace(/,/g, ".");
  if (!cleaned) return null;
  const num = Number.parseFloat(cleaned);
  return Number.isFinite(num) ? num : null;
}

export function formatPaymentAmount(value: number | null): string {
  if (value === null) return "—";
  return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

export function calculateRemainingBalance(
  totalAmount: string,
  amountReceived: string,
  paymentStatus?: TripPaymentStatus | string | null
): number | null {
  const status = normalizeTripPaymentStatus(paymentStatus ?? undefined);
  if (status === "fully_paid") return 0;
  if (status === "cancelled") return null;

  const total = parsePaymentAmount(totalAmount);
  const received = parsePaymentAmount(amountReceived) ?? 0;
  if (total === null) return null;
  return Math.max(0, total - received);
}

export type TripPaymentFieldsInput = {
  payment_status?: Trip["payment_status"] | string | null;
  total_amount?: string | null;
  amount_received?: string | null;
  payment_method?: Trip["payment_method"] | string | null;
  payment_notes?: string | null;
};

export function buildTripPaymentSummary(
  trip: TripPaymentFieldsInput
): TripPaymentSummary {
  const status = normalizeTripPaymentStatus(trip.payment_status);
  const totalAmount = trip.total_amount ?? "";
  const amountReceived = trip.amount_received ?? "";
  const remainingBalance = calculateRemainingBalance(
    totalAmount,
    amountReceived,
    status
  );
  const paymentMethod = normalizeTripPaymentMethod(trip.payment_method);
  const hasReceived = parsePaymentAmount(amountReceived) !== null;
  const hasTotal = parsePaymentAmount(totalAmount) !== null;

  let indicator = "";
  let indicatorTone: TripPaymentSummary["indicatorTone"] = "pending";

  if (status === "fully_paid") {
    indicator = "Fully paid";
    indicatorTone = "paid";
  } else if (status === "cancelled") {
    indicator = "Payment cancelled";
    indicatorTone = "cancelled";
  } else if (status === "deposit_paid") {
    indicator = "Balance pending";
    indicatorTone = "deposit";
  } else {
    indicator = "Payment pending";
    indicatorTone = "pending";
  }

  return {
    status,
    statusLabel: PAYMENT_STATUS_LABELS[status],
    totalAmount,
    amountReceived,
    remainingBalance,
    remainingBalanceLabel:
      remainingBalance === null ? "—" : formatPaymentAmount(remainingBalance),
    paymentMethod,
    paymentMethodLabel: paymentMethod
      ? paymentMethodLabel(paymentMethod)
      : "Not set",
    paymentNotes: trip.payment_notes ?? "",
    indicator,
    indicatorTone,
    showAmountReceived:
      status === "deposit_paid" ||
      status === "fully_paid" ||
      hasReceived,
    showRemainingBalance:
      status !== "cancelled" &&
      (hasTotal || hasReceived || remainingBalance !== null),
    hidePaymentChecklist: status === "fully_paid" || status === "cancelled",
  };
}

export function paymentSummaryCardClass(
  status: TripPaymentStatus
): string {
  return `pay-summary-card pay-summary-card--${status.replace(/_/g, "-")}`;
}

export function paymentRemainingBadgeLabel(
  trip: TripPaymentFieldsInput
): string | null {
  const summary = buildTripPaymentSummary(trip);
  if (summary.status === "fully_paid") return "Fully paid";
  if (
    summary.remainingBalance !== null &&
    summary.remainingBalance > 0
  ) {
    return `${formatPaymentAmount(summary.remainingBalance)} remaining`;
  }
  if (summary.status === "deposit_paid") return "Balance pending";
  if (summary.status === "pending") return "Payment pending";
  return null;
}

export function isPaymentChecklistTitle(title: string): boolean {
  return PAYMENT_CHECKLIST_TITLES.has(title.trim().toLowerCase());
}

/** Whether a default payment checklist row is still relevant for this trip. */
export function isRelevantPaymentChecklistTitle(
  title: string,
  trip: TripPaymentFieldsInput
): boolean {
  const key = title.trim().toLowerCase();
  const status = normalizeTripPaymentStatus(trip.payment_status);
  const summary = buildTripPaymentSummary(trip);

  if (status === "fully_paid" || status === "cancelled") {
    return false;
  }

  if (key === "deposit requested") {
    return status === "pending" && (summary.remainingBalance ?? 1) > 0;
  }

  if (key === "deposit received") {
    return (
      status === "pending" &&
      parsePaymentAmount(trip.amount_received) !== null &&
      (parsePaymentAmount(trip.amount_received) ?? 0) > 0
    );
  }

  if (key === "balance requested") {
    return (
      status === "deposit_paid" ||
      ((summary.remainingBalance ?? 0) > 0 && status === "pending")
    );
  }

  if (key === "fully paid") {
    return false;
  }

  if (key === "invoice sent") {
    return status === "deposit_paid" || status === "pending";
  }

  return false;
}

export function shouldShowPaymentsCategory(
  trip: TripPaymentFieldsInput
): boolean {
  if (trip.payment_status === "cancelled") {
    return (
      parsePaymentAmount(trip.total_amount) !== null ||
      parsePaymentAmount(trip.amount_received) !== null
    );
  }
  return true;
}

export { PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS };
