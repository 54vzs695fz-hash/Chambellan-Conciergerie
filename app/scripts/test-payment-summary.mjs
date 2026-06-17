#!/usr/bin/env node
/**
 * Verify payment summary calculations and checklist relevance.
 * Run: npx tsx scripts/test-payment-summary.mjs (from app/)
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

function makeTrip(overrides = {}) {
  return {
    payment_status: "pending",
    total_amount: "15000",
    amount_received: "",
    payment_method: "",
    payment_notes: "",
    ...overrides,
  };
}

async function main() {
  const {
    buildTripPaymentSummary,
    calculateRemainingBalance,
    isRelevantPaymentChecklistTitle,
    paymentRemainingBadgeLabel,
  } = await loadModule("src/lib/planner/payment-summary.ts");

  assert(
    calculateRemainingBalance("15000", "5000", "pending") === 10000,
    "Remaining balance should be 10000"
  );

  assert(
    calculateRemainingBalance("15000", "5000", "fully_paid") === 0,
    "Fully paid should force remaining balance to 0"
  );

  const fullyPaid = buildTripPaymentSummary(
    makeTrip({ payment_status: "fully_paid", amount_received: "5000" })
  );
  assert(fullyPaid.remainingBalance === 0, "Summary remaining should be 0");
  assert(fullyPaid.hidePaymentChecklist, "Fully paid hides checklist");
  assert(fullyPaid.indicator === "Fully paid", "Fully paid indicator");

  const deposit = buildTripPaymentSummary(
    makeTrip({ payment_status: "deposit_paid", amount_received: "5000" })
  );
  assert(deposit.indicator === "Balance pending", "Deposit paid indicator");
  assert(deposit.showAmountReceived, "Deposit paid shows amount received");

  assert(
    !isRelevantPaymentChecklistTitle("Deposit received", makeTrip()),
    "No amount received hides deposit received task"
  );

  assert(
    isRelevantPaymentChecklistTitle(
      "Deposit requested",
      makeTrip({ payment_status: "pending" })
    ),
    "Pending shows deposit requested"
  );

  assert(
    !isRelevantPaymentChecklistTitle(
      "Fully paid",
      makeTrip({ payment_status: "fully_paid" })
    ),
    "Fully paid hides fully paid checklist row"
  );

  assert(
    paymentRemainingBadgeLabel(
      makeTrip({ payment_status: "fully_paid", amount_received: "15000" })
    ) === "Fully paid",
    "Badge label for fully paid"
  );

  assert(
    paymentRemainingBadgeLabel(
      makeTrip({ payment_status: "deposit_paid", amount_received: "5000" })
    ) === "10,000 remaining",
    "Badge label shows remaining balance"
  );

  console.log("test-payment-summary: ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
