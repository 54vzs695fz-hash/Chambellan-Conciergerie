#!/usr/bin/env node
/**
 * Verify stay closing field requirements and commission calculation.
 * Run: npx tsx scripts/test-stay-closing-commission.mjs (from app/)
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

const { normalizeEstablishmentCommission } = await loadModule(
  "src/lib/establishments/commission.ts"
);
const { getStayClosingFieldRequirements } = await loadModule(
  "src/lib/stay-closing/field-requirements.ts"
);
const { calculateStayClosingCommission } = await loadModule(
  "src/lib/stay-closing/calculate-commission.ts"
);

const verde = normalizeEstablishmentCommission({
  commission_available: true,
  commission_calc_type: "percentage",
  commission_percentage: "10",
  commission_basis: "total_bill",
  commission_eligibility: "minimum_premium_drinks",
  commission_threshold_amount: "2500",
});

const verdeFields = getStayClosingFieldRequirements(verde);
assert(verdeFields.show_premium_drinks, "verde requires premium drinks");

const belowThreshold = calculateStayClosingCommission(verde, {
  approximate_total_bill: "5000",
  premium_drinks_amount: "2000",
  food_amount: "",
});
assert(!belowThreshold.applied, "verde below threshold");
assert(belowThreshold.reason.includes("Below"), "verde threshold reason");

const eligible = calculateStayClosingCommission(verde, {
  approximate_total_bill: "5000",
  premium_drinks_amount: "3000",
  food_amount: "",
});
assert(eligible.applied, "verde eligible");
assert(eligible.amount === 500, "verde 10% of 5000");

const noto = normalizeEstablishmentCommission({
  commission_available: true,
  commission_percentage: "5",
  commission_basis: "total_bill",
});
const notoFields = getStayClosingFieldRequirements(noto);
assert(!notoFields.show_premium_drinks, "noto no premium drinks field");

const notoCommission = calculateStayClosingCommission(noto, {
  approximate_total_bill: "4000",
  premium_drinks_amount: "",
  food_amount: "",
});
assert(notoCommission.applied, "noto commission");
assert(notoCommission.amount === 200, "noto 5% of 4000");

const disabled = normalizeEstablishmentCommission({ commission_available: false });
const disabledResult = calculateStayClosingCommission(disabled, {
  approximate_total_bill: "1000",
  premium_drinks_amount: "",
  food_amount: "",
});
assert(!disabledResult.applied, "no commission when disabled");

console.log("test-stay-closing-commission: ok");
