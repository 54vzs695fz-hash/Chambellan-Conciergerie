import {
  COMMISSION_BASIS_LABELS,
  COMMISSION_ELIGIBILITY_LABELS,
  formatCommissionThreshold,
  formatEstablishmentCommissionSummary,
  type EstablishmentCommissionFields,
} from "@/lib/establishments/commission";
import { parsePaymentAmount } from "@/lib/planner/payment-summary";

export interface StayClosingAmounts {
  approximate_total_bill: string;
  food_amount: string;
  premium_drinks_amount: string;
}

export interface StayClosingCommissionResult {
  applied: boolean;
  amount: number | null;
  amountLabel: string;
  summary: string;
  reason: string;
}

function formatEuro(amount: number): string {
  return `€${amount.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

function eligibilityAmount(
  eligibility: EstablishmentCommissionFields["commission_eligibility"],
  amounts: StayClosingAmounts
): number | null {
  switch (eligibility) {
    case "minimum_total_bill":
      return parsePaymentAmount(amounts.approximate_total_bill);
    case "minimum_food":
      return parsePaymentAmount(amounts.food_amount);
    case "minimum_drinks":
      return parsePaymentAmount(amounts.approximate_total_bill);
    case "minimum_premium_drinks":
      return parsePaymentAmount(amounts.premium_drinks_amount);
    default:
      return null;
  }
}

function basisAmount(
  basis: EstablishmentCommissionFields["commission_basis"],
  amounts: StayClosingAmounts
): number | null {
  switch (basis) {
    case "total_bill":
      return parsePaymentAmount(amounts.approximate_total_bill);
    case "food":
      return parsePaymentAmount(amounts.food_amount);
    case "drinks":
      return parsePaymentAmount(amounts.approximate_total_bill);
    case "premium_drinks":
      return parsePaymentAmount(amounts.premium_drinks_amount);
    default:
      return parsePaymentAmount(amounts.approximate_total_bill);
  }
}

function meetsEligibility(
  commission: EstablishmentCommissionFields,
  amounts: StayClosingAmounts
): { met: boolean; reason: string } {
  if (commission.commission_eligibility === "none") {
    return { met: true, reason: "" };
  }

  if (commission.commission_eligibility === "custom") {
    return { met: true, reason: "" };
  }

  const threshold = parsePaymentAmount(commission.commission_threshold_amount);
  if (threshold === null) {
    return { met: true, reason: "" };
  }

  const actual = eligibilityAmount(commission.commission_eligibility, amounts);
  if (actual === null) {
    const label =
      COMMISSION_ELIGIBILITY_LABELS[commission.commission_eligibility];
    return {
      met: false,
      reason: `Enter ${label.toLowerCase()} to check eligibility`,
    };
  }

  if (actual < threshold) {
    const label = COMMISSION_ELIGIBILITY_LABELS[commission.commission_eligibility];
    return {
      met: false,
      reason: `Below ${label.toLowerCase()} (${formatCommissionThreshold(commission.commission_threshold_amount)})`,
    };
  }

  return { met: true, reason: "" };
}

export function calculateStayClosingCommission(
  commission: EstablishmentCommissionFields,
  amounts: StayClosingAmounts
): StayClosingCommissionResult {
  const ruleSummary = formatEstablishmentCommissionSummary(commission);

  if (!commission.commission_available) {
    return {
      applied: false,
      amount: null,
      amountLabel: "—",
      summary: "No commission",
      reason: "",
    };
  }

  if (commission.commission_calc_type === "custom") {
    return {
      applied: false,
      amount: null,
      amountLabel: "—",
      summary: commission.commission_calc_custom || "Custom commission",
      reason: "Custom rule — calculate manually",
    };
  }

  const eligibility = meetsEligibility(commission, amounts);
  if (!eligibility.met) {
    return {
      applied: false,
      amount: null,
      amountLabel: "—",
      summary: ruleSummary,
      reason: eligibility.reason,
    };
  }

  const basis =
    commission.commission_basis === "custom"
      ? commission.commission_basis_custom || "Custom basis"
      : COMMISSION_BASIS_LABELS[commission.commission_basis];

  if (commission.commission_calc_type === "fixed_amount") {
    const fixed = parsePaymentAmount(commission.commission_fixed_amount);
    if (fixed === null) {
      return {
        applied: false,
        amount: null,
        amountLabel: "—",
        summary: ruleSummary,
        reason: "Fixed amount not configured",
      };
    }
    return {
      applied: true,
      amount: fixed,
      amountLabel: formatEuro(fixed),
      summary: `${ruleSummary} · Commission: ${formatEuro(fixed)}`,
      reason: "",
    };
  }

  const basisValue = basisAmount(commission.commission_basis, amounts);
  const pct = parsePaymentAmount(commission.commission_percentage);

  if (basisValue === null) {
    return {
      applied: false,
      amount: null,
      amountLabel: "—",
      summary: ruleSummary,
      reason: `Enter ${basis.toLowerCase()} to calculate commission`,
    };
  }

  if (pct === null) {
    return {
      applied: false,
      amount: null,
      amountLabel: "—",
      summary: ruleSummary,
      reason: "Commission percentage not configured",
    };
  }

  const commissionAmount = (basisValue * pct) / 100;
  return {
    applied: true,
    amount: commissionAmount,
    amountLabel: formatEuro(commissionAmount),
    summary: `${ruleSummary} · Commission: ${formatEuro(commissionAmount)}`,
    reason: "",
  };
}
