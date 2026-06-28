import type { ClientRelationshipType } from "@/lib/types";

export const CLIENT_RELATIONSHIP_TYPE_OPTIONS: ClientRelationshipType[] = [
  "friend",
  "family",
  "partner",
  "business_relation",
  "travel_group",
  "vip_group",
  "introduced_by",
  "other",
];

export const CLIENT_RELATIONSHIP_TYPE_LABELS: Record<
  ClientRelationshipType,
  string
> = {
  friend: "Friend",
  family: "Family",
  partner: "Partner",
  business_relation: "Business relation",
  travel_group: "Travel group",
  vip_group: "VIP group",
  introduced_by: "Introduced by",
  other: "Other",
};

export function normalizeClientRelationshipType(
  value: unknown
): ClientRelationshipType {
  if (
    typeof value === "string" &&
    CLIENT_RELATIONSHIP_TYPE_OPTIONS.includes(value as ClientRelationshipType)
  ) {
    return value as ClientRelationshipType;
  }
  return "other";
}
