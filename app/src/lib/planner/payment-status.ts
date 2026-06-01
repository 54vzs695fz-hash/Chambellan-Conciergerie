import type { TripPaymentMethod, TripPaymentStatus } from "@/lib/types";
import { daysUntilArrival, startOfDay } from "@/lib/calendar/programmes";

export const PAYMENT_STATUS_LABELS: Record<TripPaymentStatus, string> = {
  pending: "Pending",
  deposit_paid: "Deposit Paid",
  fully_paid: "Fully Paid",
  cancelled: "Cancelled",
};

export const PAYMENT_STATUS_OPTIONS: TripPaymentStatus[] = [
  "pending",
  "deposit_paid",
  "fully_paid",
  "cancelled",
];

export const PAYMENT_METHOD_LABELS: Record<TripPaymentMethod, string> = {
  stripe: "Stripe",
  paypal: "PayPal",
  revolut: "Revolut",
  bank_transfer: "Bank Transfer",
  cash: "Cash",
  other: "Other",
};

export const PAYMENT_METHOD_OPTIONS: TripPaymentMethod[] = [
  "stripe",
  "paypal",
  "revolut",
  "bank_transfer",
  "cash",
  "other",
];

const PAYMENT_STATUS_SET = new Set<string>(PAYMENT_STATUS_OPTIONS);
const PAYMENT_METHOD_SET = new Set<string>(PAYMENT_METHOD_OPTIONS);

export function isTripPaymentStatus(value: string): value is TripPaymentStatus {
  return PAYMENT_STATUS_SET.has(value);
}

export function isTripPaymentMethod(value: string): value is TripPaymentMethod {
  return PAYMENT_METHOD_SET.has(value);
}

export function normalizeTripPaymentStatus(
  value: string | null | undefined
): TripPaymentStatus {
  if (value && isTripPaymentStatus(value)) return value;
  return "pending";
}

export function normalizeTripPaymentMethod(
  value: string | null | undefined
): TripPaymentMethod | "" {
  if (value && isTripPaymentMethod(value)) return value;
  return "";
}

export function paymentStatusLabel(
  status: TripPaymentStatus | string | null | undefined
): string {
  const normalized = normalizeTripPaymentStatus(status ?? undefined);
  return PAYMENT_STATUS_LABELS[normalized];
}

export function paymentMethodLabel(
  method: TripPaymentMethod | string | null | undefined
): string {
  const normalized = normalizeTripPaymentMethod(method ?? undefined);
  if (!normalized) return "";
  return PAYMENT_METHOD_LABELS[normalized];
}

export function paymentBadgeClass(status: TripPaymentStatus): string {
  return `pay-status pay-status--${status.replace(/_/g, "-")}`;
}

export function countPaymentStatuses(
  trips: { payment_status?: TripPaymentStatus | string | null }[]
): Record<TripPaymentStatus, number> {
  const counts: Record<TripPaymentStatus, number> = {
    pending: 0,
    deposit_paid: 0,
    fully_paid: 0,
    cancelled: 0,
  };
  for (const trip of trips) {
    const status = normalizeTripPaymentStatus(trip.payment_status);
    counts[status] += 1;
  }
  return counts;
}

export function needsPaymentWarning(
  arrivalDate: string,
  paymentStatus: TripPaymentStatus,
  today = startOfDay(new Date())
): boolean {
  if (paymentStatus !== "pending") return false;
  if (!arrivalDate) return false;
  const days = daysUntilArrival(arrivalDate, today);
  return days !== null && days >= 0 && days <= 7;
}
