import type { Establishment } from "@/lib/types";
import type { ReservationStatusItem } from "@/lib/reservations/reservation-status";

export interface EstablishmentContactLookup {
  whatsapp: string;
  phone: string;
}

export function buildEstablishmentContactLookup(
  establishments: Establishment[]
): Map<string, EstablishmentContactLookup> {
  const map = new Map<string, EstablishmentContactLookup>();
  for (const establishment of establishments) {
    const key = establishment.name.trim().toLowerCase();
    if (!key) continue;
    map.set(key, {
      whatsapp: establishment.whatsapp.trim(),
      phone: establishment.phone.trim(),
    });
  }
  return map;
}

export function resolveVenueWhatsApp(
  venue: string,
  lookup: Map<string, EstablishmentContactLookup>
): string {
  const entry = lookup.get(venue.trim().toLowerCase());
  if (!entry) return "";
  return entry.whatsapp || entry.phone || "";
}

export function enrichReservationItemsWithContacts(
  items: ReservationStatusItem[],
  lookup: Map<string, EstablishmentContactLookup>
): ReservationStatusItem[] {
  return items.map((item) => ({
    ...item,
    venue_whatsapp: resolveVenueWhatsApp(item.venue, lookup),
  }));
}
