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

const PLANNER_PDF_PAGE = { width: 1123, height: 794, safeMarginPx: 20 };

const LOCK_PLANNER_PRINT_LAYOUT_SCRIPT = fs.readFileSync(
  path.join(__dirname, "../src/lib/pdf/lock-planner-print-layout-script.ts"),
  "utf8"
)
  .replace(/^\/\*\*[\s\S]*?\*\/\s*export const LOCK_PLANNER_PRINT_LAYOUT_SCRIPT = `/, "")
  .replace(/`;\s*$/, "");

const PLANNER_PDF_FIT_SCALE_SCRIPT = fs.readFileSync(
  path.join(__dirname, "../src/lib/pdf/planner-pdf-capture.ts"),
  "utf8"
).match(/export const PLANNER_PDF_FIT_SCALE_SCRIPT = `([\s\S]*?)`;/)[1];

const PLANNER_PDF_BOUNDS_CHECK_SCRIPT = fs.readFileSync(
  path.join(__dirname, "../src/lib/pdf/planner-pdf-capture.ts"),
  "utf8"
).match(/export const PLANNER_PDF_BOUNDS_CHECK_SCRIPT = `([\s\S]*?)`;/)[1];

const baseUrl = (process.env.BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const tripId = Number(process.env.TRIP_ID ?? "1");
const outDir = path.join(__dirname, "..", "tmp");

async function preparePage(page, mode) {
  const url = `${baseUrl}/planner/${tripId}/print?mode=${mode}`;
  await page.setViewport({
    width: PLANNER_PDF_PAGE.width,
    height: PLANNER_PDF_PAGE.height,
    deviceScaleFactor: 1,
  });
  await page.emulateMediaType("print");
  await page.goto(url, { waitUntil: "networkidle0", timeout: 60_000 });
  await page.waitForSelector(".lux-print-root--capture .lux-document", {
    timeout: 30_000,
  });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate((script) => {
    eval(script);
  }, LOCK_PLANNER_PRINT_LAYOUT_SCRIPT);
  await page
    .waitForFunction(
      () => document.documentElement.getAttribute("data-lux-print-ready") === "true",
      { timeout: 15_000 }
    )
    .catch(() => {});

  const scale = await page.evaluate((script) => eval(script), PLANNER_PDF_FIT_SCALE_SCRIPT);
  const bounds = await page.evaluate((script) => eval(script), PLANNER_PDF_BOUNDS_CHECK_SCRIPT);
  return { scale, bounds };
}

async function exportPdf(page, mode) {
  const { scale, bounds } = await preparePage(page, mode);

  const pdf = await page.pdf({
    format: "A4",
    landscape: true,
    printBackground: true,
    preferCSSPageSize: false,
    scale,
    margin: { top: "0", right: "0", bottom: "0", left: "0" },
  });

  const file = path.join(outDir, `export-test-${mode}.pdf`);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(file, pdf);

  const screenshot = path.join(outDir, `export-test-${mode}.png`);
  await page.screenshot({ path: screenshot, fullPage: false });

  return { file, bytes: pdf.length, scale, bounds, screenshot };
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
        console.log(`  PASS: ${result.bytes} bytes -> ${result.file}`);
        console.log(`  scale: ${result.scale.toFixed(4)}`);
        console.log(`  bounds ok: ${result.bounds.ok}`);
        if (result.bounds.issues?.length) {
          result.bounds.issues.forEach((issue) => console.error(`  ISSUE: ${issue}`));
          exitCode = 1;
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
