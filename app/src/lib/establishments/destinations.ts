export const LIBRARY_DESTINATIONS = [
  "Saint-Tropez",
  "Monaco",
  "Cannes",
  "Ibiza",
  "Courchevel",
  "New York",
  "Dubai",
  "Saint Barth",
  "Mykonos",
  "Other",
] as const;

export type LibraryDestination = (typeof LIBRARY_DESTINATIONS)[number];

const WEBSITE_CITY_MAP: Record<string, LibraryDestination> = {
  sainttropez: "Saint-Tropez",
  "saint-tropez": "Saint-Tropez",
  "saint tropez": "Saint-Tropez",
  monaco: "Monaco",
  cannes: "Cannes",
  courchevel: "Courchevel",
  dubai: "Dubai",
  "new-york": "New York",
  "new york": "New York",
  nyc: "New York",
  ibiza: "Ibiza",
  "saint barth": "Saint Barth",
  "saint-barth": "Saint Barth",
  "st barth": "Saint Barth",
  mykonos: "Mykonos",
};

export function normalizeDestination(value: string): LibraryDestination {
  const key = value.trim().toLowerCase().replace(/\s+/g, " ");
  const slug = key.replace(/\s+/g, "-");
  return (
    WEBSITE_CITY_MAP[key] ??
    WEBSITE_CITY_MAP[slug] ??
    (LIBRARY_DESTINATIONS.find(
      (d) => d.toLowerCase() === key || d.toLowerCase().replace(/\s+/g, "-") === slug
    ) as LibraryDestination | undefined) ??
    "Other"
  );
}

export function establishmentDedupKey(name: string, city: string): string {
  return `${name.trim().toLowerCase()}|${city.trim().toLowerCase()}`;
}
