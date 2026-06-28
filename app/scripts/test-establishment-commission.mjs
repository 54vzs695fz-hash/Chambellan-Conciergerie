#!/usr/bin/env node
/**
 * Verify establishment commission normalization and summaries.
 * Run: npx tsx scripts/test-establishment-commission.mjs (from app/)
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
  formatEstablishmentCommissionSummary,
  normalizeEstablishmentCommission,
} = await loadModule("src/lib/establishments/commission.ts");

const disabled = normalizeEstablishmentCommission({ commission_available: false });
assert(!disabled.commission_available, "commission disabled");
assert(
  formatEstablishmentCommissionSummary(disabled) === "No commission",
  "disabled summary"
);

const verde = normalizeEstablishmentCommission({
  commission_available: true,
  commission_calc_type: "percentage",
  commission_percentage: "10",
  commission_basis: "total_bill",
  commission_eligibility: "minimum_premium_drinks",
  commission_threshold_amount: "2500",
});
assert(
  formatEstablishmentCommissionSummary(verde).includes("10%"),
  "verde percentage"
);
assert(
  formatEstablishmentCommissionSummary(verde).includes("Premium Drinks"),
  "verde eligibility"
);
assert(
  formatEstablishmentCommissionSummary(verde).includes("€2500"),
  "verde threshold"
);

const noto = normalizeEstablishmentCommission({
  commission_available: true,
  commission_percentage: "5",
  commission_basis: "total_bill",
});
assert(
  formatEstablishmentCommissionSummary(noto).includes("5%"),
  "noto percentage"
);
assert(
  formatEstablishmentCommissionSummary(noto).includes("Total Bill"),
  "noto basis"
);

console.log("test-establishment-commission: ok");
