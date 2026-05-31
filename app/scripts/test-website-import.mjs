#!/usr/bin/env node
/**
 * Smoke test: fetch establishments from chambellan-conciergerie.fr WordPress API.
 * Run: node scripts/test-website-import.mjs (from app/)
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

const checks = [];
function assert(name, ok) {
  checks.push({ name, ok: Boolean(ok) });
}

assert("website-import module exists", existsSync(join(root, "src/lib/establishments/website-import.ts")));
assert("import preview API exists", existsSync(join(root, "src/app/api/establishments/import/preview/route.ts")));
assert("import commit API exists", existsSync(join(root, "src/app/api/establishments/import/route.ts")));
assert("import review page exists", existsSync(join(root, "src/app/establishments/import/page.tsx")));
assert("destinations module exists", existsSync(join(root, "src/lib/establishments/destinations.ts")));

const websiteImport = read("src/lib/establishments/website-import.ts");
assert("fetches annonces endpoint", websiteImport.includes("/wp-json/wp/v2/annonces"));
assert("dedup key support", websiteImport.includes("dedup_key"));
assert("duplicate batch detection", websiteImport.includes("duplicate_batch"));

const review = read("src/components/establishments/EstablishmentImportReview.tsx");
assert("review shows name destination category", review.includes("Name") && review.includes("Destination") && review.includes("Category"));
assert("approve import button", review.includes("Approve & import"));

let liveCount = 0;
try {
  const res = await fetch(
    "https://www.chambellan-conciergerie.fr/wp-json/wp/v2/annonces?per_page=100&status=publish"
  );
  assert("live website API reachable", res.ok);
  const data = await res.json();
  liveCount = Array.isArray(data) ? data.length : 0;
  assert("live website has establishments", liveCount > 0);
} catch {
  assert("live website API reachable", false);
  assert("live website has establishments", false);
}

const failed = checks.filter((c) => !c.ok);
console.log(`\nWebsite import checks: ${checks.length - failed.length}/${checks.length} passed`);
if (liveCount) console.log(`Live website listings: ${liveCount}`);
for (const c of checks) console.log(`${c.ok ? "✓" : "✗"} ${c.name}`);
if (failed.length) process.exit(1);
