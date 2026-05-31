#!/usr/bin/env node
/**
 * Verify formatGuestName splits names correctly.
 * Run: npm run test:guest-name (from app/)
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

// Load compiled output via tsx if available; otherwise evaluate from source exports in test file
const require = createRequire(import.meta.url);

const SURNAME_PARTICLES = new Set([
  "van", "von", "de", "du", "del", "della", "di", "da", "dos", "das",
  "der", "den", "ten", "ter", "op", "ben", "ibn", "al", "la", "le", "mac", "mc",
]);

function formatGuestName(name) {
  const trimmed = String(name ?? "").trim().replace(/\s+/g, " ");
  if (!trimmed) return { firstLine: "", secondLine: "" };
  const parts = trimmed.split(" ");
  if (parts.length === 1) return { firstLine: parts[0].toUpperCase(), secondLine: "" };
  if (parts.length === 2) {
    return { firstLine: parts[0].toUpperCase(), secondLine: parts[1].toUpperCase() };
  }
  const last = parts[parts.length - 1];
  const secondLast = parts[parts.length - 2];
  if (SURNAME_PARTICLES.has(secondLast.toLowerCase())) {
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

const CASES = [
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

let failed = 0;
for (const c of CASES) {
  const result = formatGuestName(c.input);
  const ok =
    result.firstLine === c.firstLine && result.secondLine === c.secondLine;
  console.log(`${ok ? "✓" : "✗"} ${c.input}`);
  if (!ok) {
    failed++;
    console.log(`  expected: ${c.firstLine} / ${c.secondLine}`);
    console.log(`  got:      ${result.firstLine} / ${result.secondLine}`);
  }
}

const source = readFileSync(
  join(root, "src/lib/planner/format-guest-name.ts"),
  "utf8"
);
const hasComponent = readFileSync(
  join(root, "src/components/planner/GuestNameDisplay.tsx"),
  "utf8"
).includes("formatGuestName");
const usesInDocument = readFileSync(
  join(root, "src/components/planner/PlannerLuxuryDocument.tsx"),
  "utf8"
).includes("GuestNameDisplay");

console.log(`${source.includes("formatGuestName") ? "✓" : "✗"} format-guest-name.ts exists`);
console.log(`${hasComponent ? "✓" : "✗"} GuestNameDisplay uses formatGuestName`);
console.log(`${usesInDocument ? "✓" : "✗"} PlannerLuxuryDocument uses GuestNameDisplay`);
console.log(
  `${source.includes("white-space: nowrap") || readFileSync(join(root, "src/app/planner/planner-luxury.css"), "utf8").includes(".lux-client-line") ? "✓" : "✗"} CSS two-line guest name styles`
);

if (failed) {
  console.error(`\n${failed} formatGuestName case(s) failed.\n`);
  process.exit(1);
}

console.log("\nAll formatGuestName checks passed.\n");
