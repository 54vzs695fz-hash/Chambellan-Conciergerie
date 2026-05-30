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
const LOCK_PLANNER_PRINT_LAYOUT_SCRIPT = fs.readFileSync(
  path.join(__dirname, "../src/lib/pdf/lock-planner-print-layout-script.ts"),
  "utf8"
).replace(/^\/\*\*[\s\S]*?\*\/\s*export const LOCK_PLANNER_PRINT_LAYOUT_SCRIPT = `/, "").replace(/`;\s*$/, "");
const baseUrl = (process.env.BASE_URL ?? "https://chambellan-conciergerie.vercel.app").replace(
  /\/$/,
  ""
);
const tripId = Number(process.env.TRIP_ID ?? "1");
const outDir = path.join(__dirname, "..", "tmp");

async function exportPdf(page, mode) {
  const url = `${baseUrl}/planner/${tripId}/print?mode=${mode}`;
  await page.goto(url, { waitUntil: "networkidle0", timeout: 60_000 });
  await page.waitForSelector(".lux-document", { timeout: 30_000 });
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

  const overflow = await page.evaluate(() => {
    const doc = document.querySelector(".lux-document");
    if (!doc) return { ok: false, reason: "missing document" };
    const docRect = doc.getBoundingClientRect();
    const clipped = [];
    doc.querySelectorAll(".lux-travel-card, .lux-activity-card, .lux-travel-info-name").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.bottom > docRect.bottom + 2 || r.right > docRect.right + 2) {
        clipped.push(el.className);
      }
    });
    return { ok: clipped.length === 0, clipped: clipped.slice(0, 5), docHeight: Math.round(docRect.height) };
  });

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
  return { file, bytes: pdf.length, overflow };
}

async function main() {
  const puppeteer = await import("puppeteer");
  const browser = await puppeteer.default.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  let exitCode = 0;
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1123, height: 794, deviceScaleFactor: 1 });
    await page.emulateMediaType("print");

    for (const mode of ["client", "concierge"]) {
      console.log(`Exporting ${mode} PDF from ${baseUrl}/planner/${tripId}/print?mode=${mode}…`);
      try {
        const result = await exportPdf(page, mode);
        console.log(`  PASS: ${result.bytes} bytes -> ${result.file}`);
        if (!result.overflow.ok) {
          console.error(`  WARN: possible overflow (doc ${result.overflow.docHeight}px):`, result.overflow.clipped);
        }
      } catch (err) {
        console.error(`  FAIL: ${err.message}`);
        exitCode = 1;
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
