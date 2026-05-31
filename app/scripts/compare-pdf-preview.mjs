#!/usr/bin/env node
/**
 * Compare Client Preview layout vs PDF capture bounds.
 *
 * Usage:
 *   node scripts/compare-pdf-preview.mjs
 *   BASE_URL=http://127.0.0.1:3000 TRIP_ID=1 node scripts/compare-pdf-preview.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

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

const PLANNER_PDF_FIT_SCALE_SCRIPT = fs.readFileSync(
  path.join(__dirname, "../src/lib/pdf/planner-pdf-capture.ts"),
  "utf8"
).match(/export const PLANNER_PDF_FIT_SCALE_SCRIPT = `([\s\S]*?)`;/)[1];

const PLANNER_PDF_BOUNDS_CHECK_SCRIPT = fs.readFileSync(
  path.join(__dirname, "../src/lib/pdf/planner-pdf-capture.ts"),
  "utf8"
).match(/export const PLANNER_PDF_BOUNDS_CHECK_SCRIPT = `([\s\S]*?)`;/)[1];

const PREVIEW_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <link rel="stylesheet" href="${baseUrl}/_next/static/css/app/planner/%5Bid%5D/page.css" />
  <style>
    html, body { margin: 0; background: #ebe3d8; }
    .lux-client-preview {
      flex: 1;
      overflow: auto;
      padding: 0.75rem 0.5rem 1.5rem;
      display: flex;
      justify-content: center;
    }
    .lux-client-preview .lux-print-root {
      width: 100%;
      max-width: 1123px;
    }
    .lux-client-preview .lux-print-root--client {
      width: 100%;
      max-width: 1123px;
      height: auto;
      min-height: 0;
      aspect-ratio: 297 / 210;
      margin: 0 auto;
      box-shadow: 0 2px 24px rgba(28, 24, 20, 0.1);
    }
  </style>
</head>
<body>
  <div class="lux-client-preview">
    <iframe id="frame" src="${baseUrl}/planner/${tripId}/print?mode=client" style="width:1123px;height:794px;border:0;"></iframe>
  </div>
</body>
</html>`;

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
  await page.waitForFunction(
    () => document.documentElement.getAttribute("data-lux-print-ready") === "true",
    { timeout: 15_000 }
  ).catch(() => {});

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
  await page.waitForFunction(
    () => document.documentElement.getAttribute("data-lux-print-ready") === "true",
    { timeout: 15_000 }
  ).catch(() => {});

  const scale = await page.evaluate((script) => eval(script), PLANNER_PDF_FIT_SCALE_SCRIPT);
  const bounds = await page.evaluate((script) => eval(script), PLANNER_PDF_BOUNDS_CHECK_SCRIPT);

  const pdfPath = path.join(outDir, "client-compare.pdf");
  const pdf = await page.pdf({
    format: "A4",
    landscape: true,
    printBackground: true,
    preferCSSPageSize: false,
    scale,
    margin: { top: "0", right: "0", bottom: "0", left: "0" },
  });
  fs.writeFileSync(pdfPath, pdf);

  const shot = path.join(outDir, "client-pdf-capture-compare.png");
  await page.screenshot({ path: shot, fullPage: false });

  return { shot, pdfPath, scale, bounds };
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "preview-shell.html"), PREVIEW_HTML);

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
