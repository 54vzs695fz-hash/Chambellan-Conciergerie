#!/usr/bin/env node
/**
 * Chambellan v3 — smoke checks for establishment & events library, planner integration.
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

const requiredFiles = [
  "src/components/layout/MobileNav.tsx",
  "src/components/library/LibraryAutocomplete.tsx",
  "src/components/library/LibraryNav.tsx",
  "src/components/establishments/EstablishmentForm.tsx",
  "src/components/events/EventForm.tsx",
  "src/components/events/EventVenueForm.tsx",
  "src/app/establishments/page.tsx",
  "src/app/events/page.tsx",
  "src/app/event-venues/page.tsx",
  "src/app/api/establishments/route.ts",
  "src/app/api/events/route.ts",
  "src/app/api/event-venues/route.ts",
  "prisma/migrations/20260602120000_events_library_v3/migration.sql",
  "src/app/mobile.css",
];

for (const f of requiredFiles) {
  assert(`exists: ${f}`, existsSync(join(root, f)));
}

const schema = read("prisma/schema.prisma");
assert("Establishment model in schema", schema.includes("model Establishment"));
assert("ConciergeEvent model in schema", schema.includes("model ConciergeEvent"));
assert("EventVenue model in schema", schema.includes("model EventVenue"));
assert("Trip event fields", schema.includes("event_booking"));
assert("PostgreSQL provider", schema.includes('provider = "postgresql"'));

const mobileCss = read("src/app/mobile.css");
assert("44px touch targets in mobile.css", mobileCss.includes("min-height: 44px"));
assert("library nav styles", mobileCss.includes(".library-nav"));
assert("favorite button styles", mobileCss.includes(".est-fav-btn"));

const adminCss = read("src/app/planner/planner-admin.css");
assert("adm-days stacks on mobile", adminCss.includes("grid-template-columns: 1fr"));
assert("adm icon btn 44px on mobile", adminCss.includes("min-width: 44px"));

const activitiesEditor = read("src/components/planner/PlannerActivitiesEditor.tsx");
assert(
  "activity venue uses LibraryAutocomplete",
  activitiesEditor.includes("LibraryAutocomplete")
);
assert(
  "event activity type uses event source",
  activitiesEditor.includes('source="event"')
);

const dashboard = read("src/components/planner/PlannerConciergeDashboard.tsx");
assert(
  "planner event fields",
  dashboard.includes('source="event"') && dashboard.includes('source="event_venue"')
);
assert(
  "travel fields use library autocomplete",
  dashboard.includes("LibraryAutocomplete")
);

const saveHook = read("src/components/planner/use-planner-save.ts");
assert("planner error save state", saveHook.includes('"error"'));

const libraryPage = read("src/app/establishments/page.tsx");
assert(
  "library groups by destination and category",
  libraryPage.includes("groupEstablishmentsByDestinationAndCategory")
);
assert("library nav tabs", libraryPage.includes("LibraryNav"));

const websiteImport = read("src/lib/establishments/website-import.ts");
assert("website import event detection", websiteImport.includes("inferEventCategory"));

const tripsDb = read("src/lib/db/trips.ts");
assert("trip persists event fields", tripsDb.includes("event_booking"));

const pkg = read("package.json");
assert("version 3.x", /"version": "3\./.test(pkg));

const sidePanel = read("src/components/calendar/CalendarProgrammeSidePanel.tsx");
assert(
  "mobile programme detail has no backdrop",
  !sidePanel.includes("cal-mobile-panel-backdrop")
);
assert(
  "mobile programme detail is full-screen page",
  sidePanel.includes("cal-side-panel--mobile-full") &&
    mobileCss.includes("has-mobile-detail")
);

const failed = checks.filter((c) => !c.ok);
const passed = checks.filter((c) => c.ok);

console.log(`\nChambellan v3 library checks: ${passed.length}/${checks.length} passed\n`);

for (const c of checks) {
  console.log(`${c.ok ? "✓" : "✗"} ${c.name}${c.detail ? ` — ${c.detail}` : ""}`);
}

if (failed.length) {
  console.error(`\n${failed.length} check(s) failed.\n`);
  process.exit(1);
}

console.log("\nAll static checks passed.");
console.log("Manual QA: iPhone 390px & 430px Safari, Mac desktop.");
console.log("Flows: client, planner, establishments, events, venues, import, PDF export.\n");
