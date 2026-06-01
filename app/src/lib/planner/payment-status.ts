import type { TripPaymentMethod, TripPaymentStatus } from "@/lib/types";

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
