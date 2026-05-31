import type { Establishment } from "@/lib/types";
import { ESTABLISHMENT_CATEGORY_LABELS, type EstablishmentCategory } from "@/lib/establishments/categories";
import { sortEstablishmentsAlphabetically } from "@/lib/establishments/group-by-city";

export interface DestinationCategoryGroup {
  destination: string;
  categories: Array<{
    category: string;
    categoryLabel: string;
    items: Establishment[];
  }>;
}

export function groupEstablishmentsByDestinationAndCategory(
  items: Establishment[]
): DestinationCategoryGroup[] {
  const sorted = sortEstablishmentsAlphabetically(items);
  const byDestination = new Map<string, Map<string, Establishment[]>>();

  for (const item of sorted) {
    const dest = item.city.trim() || "Other";
    const cat = item.category || "other";
    if (!byDestination.has(dest)) byDestination.set(dest, new Map());
    const catMap = byDestination.get(dest)!;
    if (!catMap.has(cat)) catMap.set(cat, []);
    catMap.get(cat)!.push(item);
  }

  return [...byDestination.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([destination, catMap]) => ({
      destination,
      categories: [...catMap.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([category, catItems]) => ({
          category,
          categoryLabel:
            ESTABLISHMENT_CATEGORY_LABELS[category as EstablishmentCategory] ??
            category,
          items: catItems,
        })),
    }));
}
