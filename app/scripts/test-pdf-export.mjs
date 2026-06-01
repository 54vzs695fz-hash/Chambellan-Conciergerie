#!/usr/bin/env node
/**
 * Smoke-test Client + Concierge PDF export via Puppeteer.
 *
 * Usage:
 *   node scripts/test-pdf-export.mjs
 *   BASE_URL=http://127.0.0.1:3000 TRIP_ID=1 node scripts/test-pdf-export.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const baseUrl = (process.env.BASE_URL ?? "https://chambellan-conciergerie.vercel.app").replace(
  /\/$/,
  ""
);
const tripId = Number(process.env.TRIP_ID ?? "1");
const outDir = path.join(__dirname, "..", "tmp");

async function exportPdf(page, mode) {
  const url = `${baseUrl}/planner/${tripId}/print?mode=${mode}`;
  await page.setViewport({ width: 1123, height: 794, deviceScaleFactor: 1 });
  await page.emulateMediaType("print");
  await page.goto(url, { waitUntil: "networkidle0", timeout: 60_000 });
  await page.waitForSelector(".lux-document", { timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(
    () =>
      document.documentElement.getAttribute("data-lux-export-ready") === "true",
    { timeout: 30_000 }
  );

  const manifest = await page.evaluate(() => ({
    expected: document.documentElement.getAttribute("data-lux-export-expected"),
    actual: document.documentElement.getAttribute("data-lux-export-actual"),
    debug: document.documentElement.getAttribute("data-lux-export-debug"),
  }));

  const pdf = await page.pdf({
    format: "A4",
    landscape: true,
    printBackground: true,
    preferCSSPageSize: true,
    margin:
      mode === "client"
        ? { top: "2.5mm", right: "1.5mm", bottom: "2.5mm", left: "1.5mm" }
        : { top: "4mm", right: "4mm", bottom: "4mm", left: "4mm" },
  });

  const file = path.join(outDir, `export-test-${mode}.pdf`);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(file, pdf);

  const screenshot = path.join(outDir, `export-test-${mode}.png`);
  await page.screenshot({ path: screenshot, fullPage: false });

  return { file, bytes: pdf.length, manifest, screenshot };
}

async function main() {
  const puppeteer = await import("puppeteer");
  const browser = await puppeteer.default.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  let exitCode = 0;
  try {
    for (const mode of ["client", "concierge"]) {
      const page = await browser.newPage();
      console.log(`Exporting ${mode} PDF from ${baseUrl}/planner/${tripId}/print?mode=${mode}…`);
      try {
        const result = await exportPdf(page, mode);
        const expected = JSON.parse(result.manifest.expected ?? "{}");
        const actual = JSON.parse(result.manifest.actual ?? "{}");
        console.log(`  PASS: ${result.bytes} bytes -> ${result.file}`);
        console.log(
          `  activities: expected ${expected.activities}, rendered ${actual.activities}, visible ${actual.visibleActivities}`
        );
        console.log(
          `  evening: expected ${expected.evening}, rendered ${actual.evening}, visible ${actual.visibleEvening}`
        );
        if (result.manifest.debug) {
          console.log(result.manifest.debug.split("\n").map((line) => `  ${line}`).join("\n"));
        }
        if (
          expected.activities !== actual.activities ||
          (mode === "client" &&
            (expected.evening !== actual.evening ||
              expected.afternoon !== actual.afternoon))
        ) {
          console.error("  FAIL: export manifest mismatch");
          exitCode = 1;
        }
        if (
          actual.visibleActivities !== actual.activities &&
          expected.activities === actual.activities
        ) {
          console.warn("  WARN: some activities may be clipped in viewport");
        }
        console.log(`  screenshot: ${result.screenshot}`);
      } catch (err) {
        console.error(`  FAIL: ${err.message}`);
        exitCode = 1;
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }

  process.exit(exitCode);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
