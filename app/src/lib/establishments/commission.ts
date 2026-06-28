export type CommissionCalculationType =
  | "percentage"
  | "fixed_amount"
  | "custom";

export type CommissionBasis =
  | "total_bill"
  | "food"
  | "drinks"
  | "premium_drinks"
  | "custom";

export type CommissionEligibility =
  | "none"
  | "minimum_total_bill"
  | "minimum_food"
  | "minimum_drinks"
  | "minimum_premium_drinks"
  | "custom";

export const COMMISSION_CALCULATION_OPTIONS: CommissionCalculationType[] = [
  "percentage",
  "fixed_amount",
  "custom",
];

export const COMMISSION_BASIS_OPTIONS: CommissionBasis[] = [
  "total_bill",
  "food",
  "drinks",
  "premium_drinks",
  "custom",
];

export const COMMISSION_ELIGIBILITY_OPTIONS: CommissionEligibility[] = [
  "none",
  "minimum_total_bill",
  "minimum_food",
  "minimum_drinks",
  "minimum_premium_drinks",
  "custom",
];

export const COMMISSION_CALCULATION_LABELS: Record<
  CommissionCalculationType,
  string
> = {
  percentage: "Percentage",
  fixed_amount: "Fixed amount",
  custom: "Custom",
};

export const COMMISSION_BASIS_LABELS: Record<CommissionBasis, string> = {
  total_bill: "Total Bill",
  food: "Food",
  drinks: "Drinks",
  premium_drinks: "Premium Drinks",
  custom: "Custom",
};

export const COMMISSION_ELIGIBILITY_LABELS: Record<CommissionEligibility, string> =
  {
    none: "No minimum",
    minimum_total_bill: "Minimum Total Bill",
    minimum_food: "Minimum Food Spend",
    minimum_drinks: "Minimum Drinks Spend",
    minimum_premium_drinks: "Minimum Premium Drinks Spend",
    custom: "Custom",
  };

export interface EstablishmentCommissionFields {
  commission_available: boolean;
  commission_calc_type: CommissionCalculationType;
  commission_percentage: string;
  commission_fixed_amount: string;
  commission_calc_custom: string;
  commission_basis: CommissionBasis;
  commission_basis_custom: string;
  commission_eligibility: CommissionEligibility;
  commission_eligibility_custom: string;
  commission_threshold_amount: string;
}

export const DEFAULT_ESTABLISHMENT_COMMISSION: EstablishmentCommissionFields = {
  commission_available: false,
  commission_calc_type: "percentage",
  commission_percentage: "",
  commission_fixed_amount: "",
  commission_calc_custom: "",
  commission_basis: "total_bill",
  commission_basis_custom: "",
  commission_eligibility: "none",
  commission_eligibility_custom: "",
  commission_threshold_amount: "",
};

export function normalizeCommissionCalculationType(
  value: unknown
): CommissionCalculationType {
  if (
    typeof value === "string" &&
    COMMISSION_CALCULATION_OPTIONS.includes(value as CommissionCalculationType)
  ) {
    return value as CommissionCalculationType;
  }
  return "percentage";
}

export function normalizeCommissionBasis(value: unknown): CommissionBasis {
  if (
    typeof value === "string" &&
    COMMISSION_BASIS_OPTIONS.includes(value as CommissionBasis)
  ) {
    return value as CommissionBasis;
  }
  return "total_bill";
}

export function normalizeCommissionEligibility(
  value: unknown
): CommissionEligibility {
  if (
    typeof value === "string" &&
    COMMISSION_ELIGIBILITY_OPTIONS.includes(value as CommissionEligibility)
  ) {
    return value as CommissionEligibility;
  }
  return "none";
}

export function normalizeEstablishmentCommission(
  input: Partial<{
    [K in keyof EstablishmentCommissionFields]: unknown;
  }>
): EstablishmentCommissionFields {
  return {
    commission_available: Boolean(input.commission_available),
    commission_calc_type: normalizeCommissionCalculationType(
      input.commission_calc_type
    ),
    commission_percentage: String(input.commission_percentage ?? "").trim(),
    commission_fixed_amount: String(input.commission_fixed_amount ?? "").trim(),
    commission_calc_custom: String(input.commission_calc_custom ?? "").trim(),
    commission_basis: normalizeCommissionBasis(input.commission_basis),
    commission_basis_custom: String(input.commission_basis_custom ?? "").trim(),
    commission_eligibility: normalizeCommissionEligibility(
      input.commission_eligibility
    ),
    commission_eligibility_custom: String(
      input.commission_eligibility_custom ?? ""
    ).trim(),
    commission_threshold_amount: String(
      input.commission_threshold_amount ?? ""
    ).trim(),
  };
}

export function formatCommissionThreshold(amount: string): string {
  const trimmed = amount.trim();
  if (!trimmed) return "";
  if (/^€/.test(trimmed)) return trimmed;
  if (/^\d/.test(trimmed)) return `€${trimmed}`;
  return trimmed;
}

export function formatEstablishmentCommissionSummary(
  commission: EstablishmentCommissionFields
): string {
  if (!commission.commission_available) return "No commission";

  const parts: string[] = [];

  if (commission.commission_calc_type === "percentage") {
    parts.push(
      commission.commission_percentage
        ? `${commission.commission_percentage}%`
        : "Percentage"
    );
  } else if (commission.commission_calc_type === "fixed_amount") {
    parts.push(
      commission.commission_fixed_amount
        ? formatCommissionThreshold(commission.commission_fixed_amount)
        : "Fixed amount"
    );
  } else {
    parts.push(commission.commission_calc_custom || "Custom");
  }

  const basisLabel =
    commission.commission_basis === "custom"
      ? commission.commission_basis_custom || "Custom basis"
      : COMMISSION_BASIS_LABELS[commission.commission_basis];
  parts.push(`Basis: ${basisLabel}`);

  if (commission.commission_eligibility !== "none") {
    const eligibilityLabel =
      commission.commission_eligibility === "custom"
        ? commission.commission_eligibility_custom || "Custom eligibility"
        : COMMISSION_ELIGIBILITY_LABELS[commission.commission_eligibility];
    const threshold = formatCommissionThreshold(
      commission.commission_threshold_amount
    );
    parts.push(
      threshold
        ? `Eligibility: ${eligibilityLabel} = ${threshold}`
        : `Eligibility: ${eligibilityLabel}`
    );
  }

  return parts.join(" · ");
}
