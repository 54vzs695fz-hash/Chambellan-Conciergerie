import { normalizeDestination } from "@/lib/establishments/destinations";

const DESTINATION_ALIASES: Record<string, string> = {
  "st tropez": "saint-tropez",
  "st-tropez": "saint-tropez",
  "st. tropez": "saint-tropez",
  "st tropez.": "saint-tropez",
  "st barth": "saint barth",
  "st-barth": "saint barth",
  "st. barth": "saint barth",
};

function stripAccents(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "");
}

/** Lowercase comparison key — exact match only (no partial/substring matching). */
export function normalizeDestinationKey(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const ascii = stripAccents(trimmed)
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

  const aliased = DESTINATION_ALIASES[ascii] ?? ascii;
  const canonical = normalizeDestination(
    aliased === ascii ? trimmed : aliased.replace(/-/g, " ")
  );

  if (canonical !== "Other") {
    return stripAccents(canonical).toLowerCase().replace(/-/g, " ");
  }

  return aliased;
}

export function destinationsMatch(a: string, b: string): boolean {
  const left = normalizeDestinationKey(a);
  const right = normalizeDestinationKey(b);
  if (!left || !right) return false;
  return left === right;
}

export function canonicalizeDestinationDisplay(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const normalized = normalizeDestination(trimmed);
  if (normalized === "Saint-Tropez") return "Saint Tropez";
  if (normalized === "Other") return trimmed;
  return normalized;
}

/** Deduplicate destinations using normalized keys; preserves first canonical display. */
export function dedupeDestinations(values: string[]): string[] {
  const result: string[] = [];

  for (const value of values) {
    const display = canonicalizeDestinationDisplay(value);
    if (!display) continue;
    if (result.some((entry) => destinationsMatch(entry, display))) continue;
    result.push(display);
  }

  return result;
}
