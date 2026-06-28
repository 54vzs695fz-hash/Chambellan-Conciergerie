import { formatCommissionThreshold } from "@/lib/establishments/commission";
import { parsePaymentAmount } from "@/lib/planner/payment-summary";
import { isDateWithinRange } from "@/lib/dashboard/business-season";

export interface SeasonalCommissionFields {
  seasonal_commission_enabled: boolean;
  seasonal_commission_start: string;
  seasonal_commission_end: string;
  seasonal_commission_target: string;
  seasonal_commission_after_target: boolean;
}

export const DEFAULT_SEASONAL_COMMISSION: SeasonalCommissionFields = {
  seasonal_commission_enabled: false,
  seasonal_commission_start: "",
  seasonal_commission_end: "",
  seasonal_commission_target: "",
  seasonal_commission_after_target: true,
};

export interface SeasonSpendEntry {
  reference_date: string;
  approximate_total_bill: string;
}

export interface SeasonalCommissionProgress {
  establishment_id: number;
  establishment_name: string;
  season_start: string;
  season_end: string;
  season_target: number;
  season_target_label: string;
  current_spend: number;
  current_spend_label: string;
  remaining: number;
  remaining_label: string;
  progress_percent: number;
  target_reached: boolean;
  expected_commission: number;
  expected_commission_label: string;
  payable_commission: number;
  payable_commission_label: string;
  pending_commission: number;
  pending_commission_label: string;
  received_commission: number;
  received_commission_label: string;
}

export function normalizeSeasonalCommission(
  input: Partial<{ [K in keyof SeasonalCommissionFields]: unknown }>
): SeasonalCommissionFields {
  return {
    seasonal_commission_enabled: Boolean(input.seasonal_commission_enabled),
    seasonal_commission_start: String(
      input.seasonal_commission_start ?? ""
    ).trim(),
    seasonal_commission_end: String(input.seasonal_commission_end ?? "").trim(),
    seasonal_commission_target: String(
      input.seasonal_commission_target ?? ""
    ).trim(),
    seasonal_commission_after_target:
      input.seasonal_commission_after_target === undefined
        ? true
        : Boolean(input.seasonal_commission_after_target),
  };
}

export function formatSeasonalCommissionSummary(
  seasonal: SeasonalCommissionFields
): string {
  if (!seasonal.seasonal_commission_enabled) return "";

  const target = formatCommissionThreshold(seasonal.seasonal_commission_target);
  const parts = [
    seasonal.seasonal_commission_start && seasonal.seasonal_commission_end
      ? `${seasonal.seasonal_commission_start} – ${seasonal.seasonal_commission_end}`
      : "Season dates not set",
  ];

  if (target) {
    parts.push(`Target ${target} client spend`);
  }

  if (seasonal.seasonal_commission_after_target) {
    parts.push("Payable after target reached");
  }

  return parts.join(" · ");
}

export function getSeasonalDateRange(
  seasonal: SeasonalCommissionFields
): { start: string; end: string } | null {
  if (
    !seasonal.seasonal_commission_enabled ||
    !seasonal.seasonal_commission_start ||
    !seasonal.seasonal_commission_end
  ) {
    return null;
  }
  return {
    start: seasonal.seasonal_commission_start,
    end: seasonal.seasonal_commission_end,
  };
}

export function sumSeasonClientSpend(
  entries: SeasonSpendEntry[],
  season: { start: string; end: string }
): number {
  let total = 0;
  for (const entry of entries) {
    if (!isDateWithinRange(entry.reference_date, season)) continue;
    const amount = parsePaymentAmount(entry.approximate_total_bill);
    if (amount !== null) total += amount;
  }
  return total;
}

export function isSeasonTargetReached(
  currentSpend: number,
  targetAmount: string
): boolean {
  const target = parsePaymentAmount(targetAmount);
  if (target === null || target <= 0) return true;
  return currentSpend >= target;
}

export function isCommissionPendingSeasonTarget(
  seasonal: SeasonalCommissionFields,
  currentSpend: number
): boolean {
  if (!seasonal.seasonal_commission_enabled) return false;
  if (!seasonal.seasonal_commission_after_target) return false;
  return !isSeasonTargetReached(currentSpend, seasonal.seasonal_commission_target);
}

export function formatSeasonMoney(amount: number): string {
  return `€${amount.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export function buildSeasonalCommissionProgress(input: {
  establishment_id: number;
  establishment_name: string;
  seasonal: SeasonalCommissionFields;
  spend_entries: SeasonSpendEntry[];
  commission_entries: Array<{
    commission_amount: number;
    commission_applied: boolean;
    commission_received: boolean;
    commission_pending_season_target: boolean;
    reference_date: string;
  }>;
}): SeasonalCommissionProgress | null {
  const season = getSeasonalDateRange(input.seasonal);
  if (!season) return null;

  const target = parsePaymentAmount(input.seasonal.seasonal_commission_target) ?? 0;
  const current_spend = sumSeasonClientSpend(input.spend_entries, season);
  const target_reached = isSeasonTargetReached(
    current_spend,
    input.seasonal.seasonal_commission_target
  );
  const remaining = Math.max(0, target - current_spend);
  const progress_percent =
    target > 0 ? Math.min(100, Math.round((current_spend / target) * 100)) : 0;

  const inSeasonCommissions = input.commission_entries.filter((entry) =>
    isDateWithinRange(entry.reference_date, season)
  );

  let expected_commission = 0;
  let payable_commission = 0;
  let pending_commission = 0;
  let received_commission = 0;

  for (const entry of inSeasonCommissions) {
    if (!entry.commission_applied || entry.commission_amount <= 0) continue;
    expected_commission += entry.commission_amount;
    if (entry.commission_received) {
      received_commission += entry.commission_amount;
      continue;
    }
    if (entry.commission_pending_season_target) {
      pending_commission += entry.commission_amount;
      continue;
    }
    payable_commission += entry.commission_amount;
  }

  return {
    establishment_id: input.establishment_id,
    establishment_name: input.establishment_name,
    season_start: season.start,
    season_end: season.end,
    season_target: target,
    season_target_label: formatSeasonMoney(target),
    current_spend,
    current_spend_label: formatSeasonMoney(current_spend),
    remaining,
    remaining_label: formatSeasonMoney(remaining),
    progress_percent,
    target_reached,
    expected_commission,
    expected_commission_label: formatSeasonMoney(expected_commission),
    payable_commission,
    payable_commission_label: formatSeasonMoney(payable_commission),
    pending_commission,
    pending_commission_label: formatSeasonMoney(pending_commission),
    received_commission,
    received_commission_label: formatSeasonMoney(received_commission),
  };
}
