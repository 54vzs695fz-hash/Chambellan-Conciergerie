#!/usr/bin/env node
/**
 * Verify business dashboard season ranges and commission aggregation.
 * Run: npx tsx scripts/test-business-dashboard.mjs (from app/)
 */
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

async function loadModule(relativePath) {
  return import(pathToFileURL(join(root, relativePath)).href);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const {
  getCurrentSeasonRange,
  getLastSeasonRange,
  getYearRange,
  resolveBusinessDateRange,
} = await loadModule("src/lib/dashboard/business-season.ts");

const {
  buildBusinessCommissionRecords,
  computeBusinessDashboardSummary,
} = await loadModule("src/lib/dashboard/business-commissions.ts");

const maySeason = getCurrentSeasonRange(new Date("2026-05-15"));
assert(maySeason.start === "2026-04-01", "May current season start");
assert(maySeason.end === "2026-10-31", "May current season end");

const janSeason = getCurrentSeasonRange(new Date("2027-01-15"));
assert(janSeason.start === "2026-04-01", "January current season start");

const lastSeason = getLastSeasonRange(new Date("2026-05-15"));
assert(lastSeason.start === "2025-04-01", "last season start");

const year = getYearRange(new Date("2026-05-15"));
assert(year.start === "2026-01-01", "year start");

const custom = resolveBusinessDateRange(
  "custom",
  "2026-06-01",
  "2026-06-30"
);
assert(custom?.start === "2026-06-01", "custom range");

const records = buildBusinessCommissionRecords([
  {
    entry_id: 1,
    trip_id: 10,
    client_id: 3,
    client_name: "Alice",
    destination: "Saint-Tropez",
    departure_date: "2026-06-10",
    closed_at: "2026-06-12T10:00:00.000Z",
    establishment_id: 5,
    establishment_name: "Verde Beach",
    calculated_commission: "500",
    commission_applied: true,
    commission_received: false,
    commission_received_at: "",
  },
  {
    entry_id: 2,
    trip_id: 11,
    client_id: 4,
    client_name: "Bob",
    destination: "Ibiza",
    departure_date: "2026-06-11",
    closed_at: "2026-06-11T10:00:00.000Z",
    establishment_id: 6,
    establishment_name: "Noto",
    calculated_commission: "200",
    commission_applied: true,
    commission_received: true,
    commission_received_at: "2026-06-12",
  },
]);

const summary = computeBusinessDashboardSummary(
  records,
  { start: "2026-04-01", end: "2026-10-31", label: "Season 2026" },
  new Date("2026-06-11")
);

assert(summary.metrics.season_total === 700, "season total");
assert(summary.metrics.outstanding === 500, "outstanding");
assert(summary.metrics.received === 200, "received");
assert(summary.metrics.todays_expected === 0, "today expected when none due today");
assert(summary.top_clients[0].label === "Alice", "top client");

console.log("test-business-dashboard: ok");
