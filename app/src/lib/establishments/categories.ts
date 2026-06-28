import type { ActivityType } from "@/lib/types";

export const ESTABLISHMENT_CATEGORIES = [
  "restaurant",
  "beach_club",
  "club",
  "hotel",
  "villa",
  "yacht",
  "jet",
  "driver",
  "security",
  "private_chef",
  "butler",
  "other",
] as const;

export type EstablishmentCategory = (typeof ESTABLISHMENT_CATEGORIES)[number];

export const ESTABLISHMENT_CATEGORY_LABELS: Record<
  EstablishmentCategory,
  string
> = {
  restaurant: "Restaurants",
  beach_club: "Beach Clubs",
  club: "Clubs",
  hotel: "Hotels",
  villa: "Villas",
  yacht: "Yachts",
  jet: "Jets",
  driver: "Drivers",
  security: "Security",
  private_chef: "Private Chefs",
  butler: "Butlers",
  other: "Other",
};

export const ACTIVITY_TYPE_ESTABLISHMENT_CATEGORY: Partial<
  Record<ActivityType, EstablishmentCategory>
> = {
  restaurant: "restaurant",
  beach_club: "beach_club",
  club: "club",
};

export const TRIP_FIELD_ESTABLISHMENT_CATEGORY: Partial<
  Record<string, EstablishmentCategory>
> = {
  hotel: "hotel",
  villa: "villa",
  yacht: "yacht",
  jet: "jet",
};

export const TEAM_ROW_ESTABLISHMENT_CATEGORY: Partial<
  Record<string, EstablishmentCategory>
> = {
  driver: "driver",
  butler: "butler",
  security: "security",
};

export function isEstablishmentCategory(
  value: string
): value is EstablishmentCategory {
  return (ESTABLISHMENT_CATEGORIES as readonly string[]).includes(value);
}
