import { parsePaymentAmount } from "@/lib/planner/payment-summary";
import type { StayClosingEntry } from "@/lib/types";

export function formatStayHistoryMoney(amount: number | null): string {
  if (amount === null) return "—";
  return `€${amount.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

export function sumStayClosingSpend(
  entries: Pick<StayClosingEntry, "approximate_total_bill">[]
): number | null {
  let total = 0;
  let hasValue = false;

  for (const entry of entries) {
    const amount = parsePaymentAmount(entry.approximate_total_bill);
    if (amount === null) continue;
    total += amount;
    hasValue = true;
  }

  return hasValue ? total : null;
}

export function sumStayClosingCommission(
  entries: Pick<
    StayClosingEntry,
    "calculated_commission" | "commission_applied"
  >[]
): number | null {
  let total = 0;
  let hasValue = false;

  for (const entry of entries) {
    if (!entry.commission_applied) continue;
    const amount = parsePaymentAmount(entry.calculated_commission);
    if (amount === null) continue;
    total += amount;
    hasValue = true;
  }

  return hasValue ? total : null;
}

export function buildStayHistoryEstablishments(
  entries: StayClosingEntry[]
): Array<{
  name: string;
  approximate_total_bill: string;
  commission: string;
  commission_applied: boolean;
}> {
  return entries.map((entry) => ({
    name: entry.establishment_name,
    approximate_total_bill: entry.approximate_total_bill.trim() || "—",
    commission: entry.commission_applied
      ? entry.calculated_commission || "—"
      : "—",
    commission_applied: entry.commission_applied,
  }));
}
