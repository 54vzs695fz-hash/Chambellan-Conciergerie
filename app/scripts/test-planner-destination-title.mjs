#!/usr/bin/env node
/**
 * Smoke-test planner destination title resolution.
 *
 * Usage: node scripts/test-planner-destination-title.mjs
 */
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const modulePath = pathToFileURL(
  path.join(__dirname, "../src/lib/planner/trip-destinations.ts")
).href;

const {
  resolvePlannerDestinationTitleLines,
  resolvePlannerDisplayTitle,
} = await import(modulePath);

const single = resolvePlannerDestinationTitleLines({
  multi_destination: false,
  destination: "Saint Tropez",
  destinations: [],
});
assert.deepEqual(single, ["Saint Tropez"]);
assert.equal(resolvePlannerDisplayTitle({
  multi_destination: false,
  destination: "Saint Tropez",
}), "Saint Tropez");

const multi = resolvePlannerDestinationTitleLines({
  multi_destination: true,
  destination: "French Riviera",
  destinations: ["Monaco", "Saint Tropez"],
});
assert.deepEqual(multi, ["Monaco", "Saint Tropez"]);
assert.equal(resolvePlannerDisplayTitle({
  multi_destination: true,
  destination: "French Riviera",
  destinations: ["Monaco", "Saint Tropez"],
}), "Monaco · Saint Tropez");

const triple = resolvePlannerDestinationTitleLines({
  multi_destination: true,
  destination: "",
  destinations: ["Monaco", "Saint Tropez", "Cannes"],
});
assert.deepEqual(triple, ["Monaco", "Saint Tropez", "Cannes"]);

const fallback = resolvePlannerDestinationTitleLines({
  multi_destination: true,
  destination: "Monaco",
  destinations: [],
});
assert.deepEqual(fallback, ["Monaco"]);

console.log("PASS planner destination title resolution");
