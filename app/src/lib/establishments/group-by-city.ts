import type { Establishment } from "@/lib/types";

export function normalizeCity(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function citiesMatch(a: string, b: string): boolean {
  const left = normalizeCity(a);
  const right = normalizeCity(b);
  if (!left || !right) return false;
  return left === right || left.includes(right) || right.includes(left);
}

export function sortEstablishmentsAlphabetically(
  items: Establishment[]
): Establishment[] {
  return [...items].sort((a, b) => {
    const cityCmp = a.city.localeCompare(b.city, undefined, { sensitivity: "base" });
    if (cityCmp !== 0) return cityCmp;
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });
}

export function sortEstablishmentsWithPrioritizedCity(
  items: Establishment[],
  prioritizeCity?: string
): Establishment[] {
  const priority = prioritizeCity?.trim();
  if (!priority) return sortEstablishmentsAlphabetically(items);

  return [...items].sort((a, b) => {
    const aMatch = citiesMatch(a.city, priority);
    const bMatch = citiesMatch(b.city, priority);
    if (aMatch !== bMatch) return aMatch ? -1 : 1;
    const cityCmp = a.city.localeCompare(b.city, undefined, { sensitivity: "base" });
    if (cityCmp !== 0) return cityCmp;
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });
}

export interface EstablishmentCityGroup {
  city: string;
  items: Establishment[];
}

export function groupEstablishmentsByCity(
  items: Establishment[]
): EstablishmentCityGroup[] {
  const sorted = sortEstablishmentsAlphabetically(items);
  const groups = new Map<string, Establishment[]>();

  for (const item of sorted) {
    const key = item.city.trim() || "Unassigned";
    const bucket = groups.get(key) ?? [];
    bucket.push(item);
    groups.set(key, bucket);
  }

  return [...groups.entries()]
    .sort(([a], [b]) =>
      a.localeCompare(b, undefined, { sensitivity: "base" })
    )
    .map(([city, groupItems]) => ({ city, items: groupItems }));
}
