#!/usr/bin/env node
/**
 * Verify evening/night activity time ordering (late night after midnight sorts last).
 * Run: npm run test:activity-time-sort (from app/)
 */

const LATE_NIGHT_END_HOUR = 5;
const MINUTES_PER_DAY = 24 * 60;

function isEveningNightSection(periodId, sectionLabel = "") {
  const safePeriodId = String(periodId ?? "");
  const normalized = String(sectionLabel ?? "").trim().toLowerCase();
  if (safePeriodId === "evening") return true;
  return normalized.includes("evening") || normalized.includes("night");
}

function activityTimeSortKey(time, { eveningSection = false } = {}) {
  const safeTime = String(time ?? "").trim();
  if (!safeTime) return Number.MAX_SAFE_INTEGER;
  const [hRaw, mRaw] = safeTime.split(":");
  const h = Number(hRaw);
  const m = Number(mRaw);
  if (Number.isNaN(h) || Number.isNaN(m)) return Number.MAX_SAFE_INTEGER;
  let minutes = h * 60 + m;
  if (eveningSection && h >= 0 && h <= LATE_NIGHT_END_HOUR) {
    minutes += MINUTES_PER_DAY;
  }
  return minutes;
}

function sortByTime(times, eveningSection = false) {
  return [...times].sort(
    (a, b) =>
      activityTimeSortKey(a, { eveningSection }) -
        activityTimeSortKey(b, { eveningSection }) ||
      a.localeCompare(b)
  );
}

const EVENING_CASE = ["00:00", "21:00", "22:00", "23:00", "01:30"];
const EXPECTED_EVENING = ["21:00", "22:00", "23:00", "00:00", "01:30"];

const afternoonSorted = sortByTime(["14:00", "12:30", "16:00"], false);
const eveningSorted = sortByTime(EVENING_CASE, true);
const missingTimeSorted = sortByTime(["21:00", "", "00:00"], true);

let failed = 0;

function assertEqual(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${ok ? "✓" : "✗"} ${label}`);
  if (!ok) {
    failed++;
    console.log(`  expected: ${JSON.stringify(expected)}`);
    console.log(`  got:      ${JSON.stringify(actual)}`);
  }
}

assertEqual(
  "evening/night late-night order",
  eveningSorted,
  EXPECTED_EVENING
);
assertEqual(
  "evening section id keeps late-night grouping",
  isEveningNightSection("evening", ""),
  true
);
assertEqual(
  "missing time sorts last in evening",
  missingTimeSorted,
  ["21:00", "00:00", ""]
);
assertEqual(
  "afternoon daytime order",
  afternoonSorted,
  ["12:30", "14:00", "16:00"]
);

if (failed) {
  console.error(`\n${failed} activity time sort case(s) failed.\n`);
  process.exit(1);
}

console.log("\nAll activity time sort checks passed.\n");
