#!/usr/bin/env node
/**
 * Chambellan v2 — smoke checks for mobile layout, establishment library, planner integration.
 * Run: npm run test:mobile (from app/)
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const checks = [];

function assert(name, condition, detail = "") {
  checks.push({ name, ok: Boolean(condition), detail });
}

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

// ─── File presence ───
const requiredFiles = [
  "src/components/layout/MobileNav.tsx",
  "src/components/establishments/EstablishmentAutocomplete.tsx",
  "src/components/establishments/EstablishmentForm.tsx",
  "src/app/establishments/page.tsx",
  "src/app/api/establishments/route.ts",
  "prisma/migrations/20260601120000_add_establishments/migration.sql",
  "src/app/mobile.css",
];

for (const f of requiredFiles) {
  assert(`exists: ${f}`, existsSync(join(root, f)));
}

// ─── Schema ───
const schema = read("prisma/schema.prisma");
assert("Establishment model in schema", schema.includes("model Establishment"));
assert("PostgreSQL provider", schema.includes('provider = "postgresql"'));

// ─── Mobile CSS ───
const mobileCss = read("src/app/mobile.css");
assert("44px touch targets in mobile.css", mobileCss.includes("min-height: 44px"));
assert("mobile nav height token", mobileCss.includes("--mobile-nav-h"));

const adminCss = read("src/app/planner/planner-admin.css");
assert("adm-days stacks on mobile", adminCss.includes("grid-template-columns: 1fr"));
assert("adm icon btn 44px on mobile", adminCss.includes("min-width: 44px"));

const luxuryCss = read("src/app/planner/planner-luxury.css");
assert("lux toolbar mobile buttons", luxuryCss.includes(".lux-toolbar-right .lux-btn"));
assert("has-mobile-nav padding", luxuryCss.includes(".has-mobile-nav"));

// ─── Planner integration ───
const activitiesEditor = read("src/components/planner/PlannerActivitiesEditor.tsx");
assert(
  "activity venue uses EstablishmentAutocomplete",
  activitiesEditor.includes("EstablishmentAutocomplete")
);
assert(
  "activity type category mapping",
  activitiesEditor.includes("ACTIVITY_TYPE_ESTABLISHMENT_CATEGORY")
);

const dashboard = read("src/components/planner/PlannerConciergeDashboard.tsx");
assert(
  "travel fields use establishment autocomplete",
  dashboard.includes("TripEstablishmentField")
);
assert(
  "team driver autocomplete",
  dashboard.includes("TEAM_ROW_ESTABLISHMENT_CATEGORY")
);

// ─── Save states ───
const saveHook = read("src/components/planner/use-planner-save.ts");
assert("planner error save state", saveHook.includes('"error"'));

const plannerEditor = read("src/components/planner/PlannerEditor.tsx");
assert("planner shows Error saving", plannerEditor.includes("Error saving"));

// ─── Sidebar nav ───
const sidebar = read("src/components/layout/Sidebar.tsx");
assert("sidebar Library link", sidebar.includes("/establishments"));

// ─── Viewport tokens (390 / 430 iPhone) ───
assert("mobile breakpoint 767px", adminCss.includes("max-width: 767px"));
assert("page-shell responsive padding", mobileCss.includes("@media (min-width: 768px)"));

const failed = checks.filter((c) => !c.ok);
const passed = checks.filter((c) => c.ok);

console.log(`\nChambellan v2 mobile & library checks: ${passed.length}/${checks.length} passed\n`);

for (const c of checks) {
  console.log(`${c.ok ? "✓" : "✗"} ${c.name}${c.detail ? ` — ${c.detail}` : ""}`);
}

if (failed.length) {
  console.error(`\n${failed.length} check(s) failed.\n`);
  process.exit(1);
}

console.log("\nAll static checks passed.");
console.log("Manual QA: iPhone 390px & 430px Safari, Mac desktop.");
console.log("Flows: create client, create establishment, add restaurant from library,");
console.log("manual restaurant + save to library, export Client PDF, export Concierge PDF.\n");
