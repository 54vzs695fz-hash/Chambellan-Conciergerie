export type CommissionDisplayStatus = "pending" | "received" | "not_eligible";

export function resolveCommissionDisplayStatus(input: {
  commission_applied: boolean;
  commission_amount: number;
  commission_received: boolean;
}): CommissionDisplayStatus {
  if (!input.commission_applied || input.commission_amount <= 0) {
    return "not_eligible";
  }
  if (input.commission_received) return "received";
  return "pending";
}

export function commissionDisplayStatusLabel(
  status: CommissionDisplayStatus
): string {
  switch (status) {
    case "received":
      return "Received";
    case "not_eligible":
      return "Not eligible";
    default:
      return "Pending";
  }
}
