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
  buildEstablishmentSeasonProgress,
  isCommissionPendingSeasonTarget,
  sumSeasonClientSpend,
} = await loadModule("src/lib/establishments/seasonal-commission.ts");

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

const progress = buildEstablishmentSeasonProgress(seasonal, [
  { reference_date: "2026-06-01", approximate_total_bill: "120000" },
  { reference_date: "2026-07-01", approximate_total_bill: "80000" },
]);
assert(progress?.remaining === 50000, "remaining to target");
assert(!progress?.target_reached, "target not reached");

const reachedSpend = sumSeasonClientSpend(
  [
    { reference_date: "2026-06-01", approximate_total_bill: "150000" },
    { reference_date: "2026-07-01", approximate_total_bill: "120000" },
  ],
  { start: "2026-04-01", end: "2026-10-31" }
);
assert(!isCommissionPendingSeasonTarget(seasonal, reachedSpend), "target reached");

console.log("test-seasonal-commission: ok");
