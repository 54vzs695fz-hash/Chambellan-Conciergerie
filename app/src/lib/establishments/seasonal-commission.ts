import { formatCommissionThreshold } from "@/lib/establishments/commission";
import { parsePaymentAmount } from "@/lib/planner/payment-summary";
import { getYearRange } from "@/lib/stay-closing/season-year";
import { isDateWithinRange } from "@/lib/stay-closing/utils";

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

export interface EstablishmentSeasonProgress {
  current_spend: number;
  current_spend_label: string;
  season_target: number;
  season_target_label: string;
  remaining: number;
  remaining_label: string;
  progress_percent: number;
  target_reached: boolean;
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
  return target
    ? `Season target ${target} client spend · Payable after target reached`
    : "Season target enabled";
}

export function getSeasonalDateRange(
  seasonal: SeasonalCommissionFields,
  today = new Date()
): { start: string; end: string } | null {
  if (!seasonal.seasonal_commission_enabled) return null;

  if (seasonal.seasonal_commission_start && seasonal.seasonal_commission_end) {
    return {
      start: seasonal.seasonal_commission_start,
      end: seasonal.seasonal_commission_end,
    };
  }

  const year = getYearRange(today);
  return { start: year.start, end: year.end };
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

export function buildEstablishmentSeasonProgress(
  seasonal: SeasonalCommissionFields,
  spendEntries: SeasonSpendEntry[],
  today = new Date()
): EstablishmentSeasonProgress | null {
  if (!seasonal.seasonal_commission_enabled) return null;

  const season = getSeasonalDateRange(seasonal, today);
  if (!season) return null;

  const season_target = parsePaymentAmount(seasonal.seasonal_commission_target) ?? 0;
  const current_spend = sumSeasonClientSpend(spendEntries, season);
  const target_reached = isSeasonTargetReached(
    current_spend,
    seasonal.seasonal_commission_target
  );
  const remaining = Math.max(0, season_target - current_spend);
  const progress_percent =
    season_target > 0
      ? Math.min(100, Math.round((current_spend / season_target) * 100))
      : 0;

  return {
    current_spend,
    current_spend_label: formatSeasonMoney(current_spend),
    season_target,
    season_target_label: formatSeasonMoney(season_target),
    remaining,
    remaining_label: formatSeasonMoney(remaining),
    progress_percent,
    target_reached,
  };
}

function formatSeasonMoney(amount: number): string {
  return `€${amount.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}
