import type { Establishment } from "@/lib/types";

export function formatEstablishmentDetails(est: Establishment): string {
  return [est.contact_name, est.phone, est.notes].filter(Boolean).join(" · ");
}

export function establishmentDisplayName(est: Establishment): string {
  return est.name.trim();
}

export function teamAutofillFromEstablishment(
  est: Establishment
): { name: string; phone?: string } {
  return {
    name: est.contact_name.trim() || est.name.trim(),
    phone: est.phone.trim() || undefined,
  };
}
