export interface FormattedGuestName {
  firstLine: string;
  secondLine: string;
}

const SURNAME_PARTICLES = new Set([
  "van",
  "von",
  "de",
  "du",
  "del",
  "della",
  "di",
  "da",
  "dos",
  "das",
  "der",
  "den",
  "ten",
  "ter",
  "op",
  "ben",
  "ibn",
  "al",
  "la",
  "le",
  "mac",
  "mc",
]);

function isParticle(token: string): boolean {
  return SURNAME_PARTICLES.has(token.toLowerCase());
}

/**
 * Split a guest name into two centered header lines:
 * given name(s) on the first line, surname on the second.
 */
export function formatGuestName(name: string): FormattedGuestName {
  const trimmed = String(name ?? "").trim().replace(/\s+/g, " ");
  if (!trimmed) {
    return { firstLine: "", secondLine: "" };
  }

  const parts = trimmed.split(" ");
  if (parts.length === 1) {
    return { firstLine: parts[0].toUpperCase(), secondLine: "" };
  }

  if (parts.length === 2) {
    return {
      firstLine: parts[0].toUpperCase(),
      secondLine: parts[1].toUpperCase(),
    };
  }

  const last = parts[parts.length - 1];
  const secondLast = parts[parts.length - 2];

  if (isParticle(secondLast)) {
    return {
      firstLine: parts.slice(0, -2).join(" ").toUpperCase(),
      secondLine: `${secondLast} ${last}`.toUpperCase(),
    };
  }

  return {
    firstLine: parts.slice(0, -1).join(" ").toUpperCase(),
    secondLine: last.toUpperCase(),
  };
}

export const FORMAT_GUEST_NAME_EXAMPLES: Array<{
  input: string;
  firstLine: string;
  secondLine: string;
}> = [
  { input: "Scott Gilbert", firstLine: "SCOTT", secondLine: "GILBERT" },
  { input: "Juliana Garcia", firstLine: "JULIANA", secondLine: "GARCIA" },
  {
    input: "David Joshua Bartch",
    firstLine: "DAVID JOSHUA",
    secondLine: "BARTCH",
  },
  {
    input: "Jean Pierre Van Damme",
    firstLine: "JEAN PIERRE",
    secondLine: "VAN DAMME",
  },
  {
    input: "Christopher Alexander Johnson",
    firstLine: "CHRISTOPHER ALEXANDER",
    secondLine: "JOHNSON",
  },
  {
    input: "Maximilian Von Habsburg",
    firstLine: "MAXIMILIAN",
    secondLine: "VON HABSBURG",
  },
];
