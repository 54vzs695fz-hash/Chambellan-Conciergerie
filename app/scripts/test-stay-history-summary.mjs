#!/usr/bin/env node
/**
 * Verify stay history spend and commission aggregation.
 * Run: npx tsx scripts/test-stay-history-summary.mjs (from app/)
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
  formatStayHistoryMoney,
  sumStayClosingCommission,
  sumStayClosingSpend,
} = await loadModule("src/lib/stay-closing/stay-history-summary.ts");

assert(formatStayHistoryMoney(null) === "—", "null money");
assert(formatStayHistoryMoney(2500) === "€2,500", "format money");

const spend = sumStayClosingSpend([
  { approximate_total_bill: "3500" },
  { approximate_total_bill: "1200" },
]);
assert(spend === 4700, "sum spend");

const commission = sumStayClosingCommission([
  { calculated_commission: "€350", commission_applied: true },
  { calculated_commission: "—", commission_applied: false },
  { calculated_commission: "200", commission_applied: true },
]);
assert(commission === 550, "sum commission");

console.log("test-stay-history-summary: ok");
