import type { EstablishmentCommissionFields } from "@/lib/establishments/commission";

export interface StayClosingFieldRequirements {
  show_approximate_total_bill: boolean;
  show_premium_drinks: boolean;
  show_internal_notes: boolean;
}

export function getStayClosingFieldRequirements(
  commission: EstablishmentCommissionFields
): StayClosingFieldRequirements {
  const show_premium_drinks =
    commission.commission_basis === "premium_drinks" ||
    commission.commission_basis === "drinks" ||
    commission.commission_eligibility === "minimum_premium_drinks" ||
    commission.commission_eligibility === "minimum_drinks";

  return {
    show_approximate_total_bill: true,
    show_premium_drinks,
    show_internal_notes: true,
  };
}
