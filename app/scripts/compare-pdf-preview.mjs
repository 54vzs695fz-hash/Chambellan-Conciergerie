#!/usr/bin/env node
/**
 * Compare Client Preview layout vs PDF capture bounds.
 *
 * Usage:
 *   node scripts/compare-pdf-preview.mjs
 *   BASE_URL=https://chambellan-conciergerie.vercel.app TRIP_ID=1 node scripts/compare-pdf-preview.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  PLANNER_PDF_BOUNDS_CHECK_SCRIPT,
  PLANNER_PDF_FIT_SCALE_SCRIPT,
  PLANNER_PDF_MARGINS,
} from "./lib/planner-pdf-capture.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const baseUrl = (process.env.BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const tripId = Number(process.env.TRIP_ID ?? "1");
const outDir = path.join(__dirname, "..", "tmp", "pdf-preview-compare");

const LOCK_PLANNER_PRINT_LAYOUT_SCRIPT = fs.readFileSync(
  path.join(__dirname, "../src/lib/pdf/lock-planner-print-layout-script.ts"),
  "utf8"
)
  .replace(/^\/\*\*[\s\S]*?\*\/\s*export const LOCK_PLANNER_PRINT_LAYOUT_SCRIPT = `/, "")
  .replace(/`;\s*$/, "");

async function capturePreview(page) {
  const url = `${baseUrl}/planner/${tripId}/print?mode=client`;
  await page.setViewport({ width: 1123, height: 900, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: "networkidle0", timeout: 60_000 });

  await page.evaluate(() => {
    const root = document.querySelector(".lux-print-root");
    if (!root) return;
    root.classList.remove("lux-print-root--capture");
    const wrap = document.createElement("div");
    wrap.className = "lux-client-preview";
    const parent = root.parentElement;
    if (!parent) return;
    parent.replaceChildren(wrap);
    wrap.appendChild(root);
    root.classList.add("lux-print-root--client");
  });

  await page.waitForSelector(".lux-client-preview .lux-document", { timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate((script) => eval(script), LOCK_PLANNER_PRINT_LAYOUT_SCRIPT);
  await page
    .waitForFunction(
      () => document.documentElement.getAttribute("data-lux-print-ready") === "true",
      { timeout: 15_000 }
    )
    .catch(() => {});

  const shot = path.join(outDir, "client-preview-compare.png");
  await page.screenshot({ path: shot, fullPage: false });
  return shot;
}

async function capturePdf(page) {
  const url = `${baseUrl}/planner/${tripId}/print?mode=client`;
  await page.setViewport({ width: 1123, height: 794, deviceScaleFactor: 1 });
  await page.emulateMediaType("print");
  await page.goto(url, { waitUntil: "networkidle0", timeout: 60_000 });
  await page.waitForSelector(".lux-print-root--capture .lux-document", { timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate((script) => eval(script), LOCK_PLANNER_PRINT_LAYOUT_SCRIPT);
  await page
    .waitForFunction(
      () => document.documentElement.getAttribute("data-lux-print-ready") === "true",
      { timeout: 15_000 }
    )
    .catch(() => {});

  const scale = await page.evaluate((script) => eval(script), PLANNER_PDF_FIT_SCALE_SCRIPT);
  const bounds = await page.evaluate((script) => eval(script), PLANNER_PDF_BOUNDS_CHECK_SCRIPT);

  const pdfPath = path.join(outDir, "client-compare.pdf");
  const pdf = await page.pdf({
    format: "A4",
    landscape: true,
    printBackground: true,
    preferCSSPageSize: false,
    scale,
    margin: PLANNER_PDF_MARGINS,
  });
  fs.writeFileSync(pdfPath, pdf);

  const shot = path.join(outDir, "client-pdf-capture-compare.png");
  await page.screenshot({ path: shot, fullPage: false });

  return { shot, pdfPath, scale, bounds };
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });

  const puppeteer = await import("puppeteer");
  const browser = await puppeteer.default.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  let exitCode = 0;
  try {
    const previewPage = await browser.newPage();
    const previewShot = await capturePreview(previewPage);
    await previewPage.close();
    console.log(`Preview screenshot: ${previewShot}`);

    const pdfPage = await browser.newPage();
    const pdfResult = await capturePdf(pdfPage);
    await pdfPage.close();
    console.log(`PDF capture screenshot: ${pdfResult.shot}`);
    console.log(`PDF file: ${pdfResult.pdfPath}`);
    console.log(`Fit scale: ${pdfResult.scale.toFixed(4)}`);
    console.log(`Bounds ok: ${pdfResult.bounds.ok}`);
    console.log(`Content box: left=${pdfResult.bounds.content.left.toFixed(1)} right=${pdfResult.bounds.content.right.toFixed(1)}`);
    if (pdfResult.bounds.issues?.length) {
      pdfResult.bounds.issues.forEach((issue) => console.error(`  ISSUE: ${issue}`));
      exitCode = 1;
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
