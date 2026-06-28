#!/usr/bin/env node
/**
 * Verify seasonal commission target tracking.
 * Run: npx tsx scripts/test-seasonal-commission.mjs (from app/)
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
  buildSeasonalCommissionProgress,
  isCommissionPendingSeasonTarget,
  sumSeasonClientSpend,
} = await loadModule("src/lib/establishments/seasonal-commission.ts");

const {
  enrichRecordsWithSeasonalStatus,
  computeBusinessDashboardSummary,
} = await loadModule("src/lib/dashboard/business-commissions.ts");

const seasonal = {
  seasonal_commission_enabled: true,
  seasonal_commission_start: "2026-04-01",
  seasonal_commission_end: "2026-10-31",
  seasonal_commission_target: "250000",
  seasonal_commission_after_target: true,
};

const spend = sumSeasonClientSpend(
  [
    { reference_date: "2026-06-01", approximate_total_bill: "120000" },
    { reference_date: "2026-07-01", approximate_total_bill: "80000" },
  ],
  { start: "2026-04-01", end: "2026-10-31" }
);
assert(spend === 200000, "season spend sum");
assert(isCommissionPendingSeasonTarget(seasonal, spend), "below target pending");

const progress = buildSeasonalCommissionProgress({
  establishment_id: 1,
  establishment_name: "Verde Beach",
  seasonal,
  spend_entries: [
    { reference_date: "2026-06-01", approximate_total_bill: "120000" },
    { reference_date: "2026-07-01", approximate_total_bill: "80000" },
  ],
  commission_entries: [
    {
      commission_amount: 5000,
      commission_applied: true,
      commission_received: false,
      commission_pending_season_target: true,
      reference_date: "2026-06-01",
    },
  ],
});
assert(progress?.remaining === 50000, "remaining to target");
assert(!progress?.target_reached, "target not reached");

const records = enrichRecordsWithSeasonalStatus(
  [
    {
      entry_id: 1,
      trip_id: 1,
      client_id: 1,
      client_name: "Alice",
      destination: "Saint-Tropez",
      departure_date: "2026-06-10",
      closed_at: "2026-06-12T10:00:00.000Z",
      establishment_id: 5,
      establishment_name: "Verde Beach",
      approximate_total_bill: "120000",
      calculated_commission: "5000",
      commission_applied: true,
      commission_received: false,
      commission_received_at: "",
      commission_pending_season_target: false,
      seasonal,
    },
  ],
  [
    {
      establishment_id: 5,
      departure_date: "2026-06-10",
      closed_at: "2026-06-12T10:00:00.000Z",
      approximate_total_bill: "120000",
    },
    {
      establishment_id: 5,
      departure_date: "2026-07-01",
      closed_at: "2026-07-02T10:00:00.000Z",
      approximate_total_bill: "80000",
    },
  ]
);

assert(records[0].commission_status === "pending_season_target", "pending status");

const summary = computeBusinessDashboardSummary(records, {
  start: "2026-04-01",
  end: "2026-10-31",
  label: "Season 2026",
});
assert(summary.metrics.pending_season_target === 5000, "pending metric");

console.log("test-seasonal-commission: ok");
