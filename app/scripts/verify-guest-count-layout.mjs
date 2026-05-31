#!/usr/bin/env node
/**
 * Verify guest count placement in client identity header across viewports and PDF modes.
 *
 * Usage:
 *   node scripts/verify-guest-count-layout.mjs
 *   BASE_URL=https://chambellan-conciergerie.vercel.app TRIP_ID=1 node scripts/verify-guest-count-layout.mjs
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
const outDir = path.join(__dirname, "..", "tmp", "verify-guest-count");

const LOCK_PLANNER_PRINT_LAYOUT_SCRIPT = fs.readFileSync(
  path.join(__dirname, "../src/lib/pdf/lock-planner-print-layout-script.ts"),
  "utf8"
)
  .replace(/^\/\*\*[\s\S]*?\*\/\s*export const LOCK_PLANNER_PRINT_LAYOUT_SCRIPT = `/, "")
  .replace(/`;\s*$/, "");

const VIEWPORTS = [
  { id: "iphone", width: 390, height: 844, label: "iPhone" },
  { id: "ipad", width: 820, height: 1180, label: "iPad" },
  { id: "mac", width: 1440, height: 900, label: "Mac" },
  { id: "print", width: 1123, height: 794, label: "Print A4 landscape" },
];

async function preparePrintPage(page) {
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
}

async function measureGuestCountLayout(page) {
  return page.evaluate(() => {
    const clientLines = [...document.querySelectorAll(".lux-client-line")];
    const client = document.querySelector(".lux-client-name");
    const guests = document.querySelector(".lux-client-guests");
    const identity = document.querySelector(".lux-client-identity");
    const metaRight = document.querySelector(".lux-meta-right");
    const tailoredInStay = [...document.querySelectorAll(".lux-travel-info-label")].some(
      (el) => el.textContent?.trim().toLowerCase().includes("tailored")
    );

    if (!guests) {
      return {
        hasGuestCount: false,
        tailoredInStay,
        ok: !tailoredInStay,
        issues: guests ? [] : ["guest count element not found"],
      };
    }

    const clientRect = client?.getBoundingClientRect();
    const firstLineRect = clientLines[0]?.getBoundingClientRect();
    const lastLineRect = clientLines[clientLines.length - 1]?.getBoundingClientRect();
    const guestsRect = guests?.getBoundingClientRect();
    const identityRect = identity?.getBoundingClientRect();
    const metaRightRect = metaRight?.getBoundingClientRect();

    const issues = [];
    if (tailoredInStay) issues.push("TAILORED FOR still appears in Your Stay");
    if (clientLines.length > 2) issues.push("guest name has more than two lines");
    for (const line of clientLines) {
      const style = window.getComputedStyle(line);
      if (style.whiteSpace !== "nowrap") {
        issues.push("guest name line allows wrapping");
      }
      if (line.scrollWidth > line.clientWidth + 1) {
        issues.push(`guest name line overflows: "${line.textContent?.trim()}"`);
      }
    }
    if (firstLineRect && lastLineRect && clientLines.length >= 2 && lastLineRect.top <= firstLineRect.bottom) {
      issues.push("guest name lines overlap vertically");
    }
    if (clientRect && guestsRect && guestsRect.top < (lastLineRect?.bottom ?? clientRect.bottom) - 1) {
      issues.push("guest count overlaps client name vertically");
    }
    if (clientRect && guestsRect && Math.abs(clientRect.right - guestsRect.right) > 2) {
      issues.push(
        `right edge misaligned by ${Math.abs(clientRect.right - guestsRect.right).toFixed(1)}px`
      );
    }
    if (identityRect && metaRightRect && Math.abs(identityRect.right - metaRightRect.right) > 2) {
      issues.push("identity block not right-aligned with meta-right");
    }
    if (guestsRect && identityRect && guestsRect.width > (identityRect?.width ?? guestsRect.width) + 1) {
      issues.push("guest count wider than identity block");
    }

    const doc = document.querySelector(".lux-document");
    const docRect = doc?.getBoundingClientRect();
    if (docRect && guestsRect && guestsRect.right > docRect.right + 2) {
      issues.push("guest count clipped past document edge");
    }
    if (docRect && guestsRect && guestsRect.left < docRect.left - 2) {
      issues.push("guest count extends past document left edge");
    }
    if (docRect && clientRect && clientRect.right > docRect.right + 2) {
      issues.push("guest name clipped past document edge");
    }

    return {
      hasGuestCount: Boolean(guests),
      guestText: guests?.textContent?.trim() ?? "",
      guestNameLines: clientLines.map((line) => line.textContent?.trim() ?? ""),
      tailoredInStay,
      clientRight: clientRect ? Math.round(clientRect.right) : null,
      guestsRight: Math.round(guestsRect.right),
      gapPx: clientRect ? Math.round(guestsRect.top - clientRect.bottom) : null,
      ok: issues.length === 0,
      issues,
    };
  });
}

async function capture(page, filePath, fullPage = false) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  await page.screenshot({ path: filePath, fullPage });
}

async function verifyPrintMode(browser, mode, viewport) {
  const page = await browser.newPage();
  await page.setViewport({
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: viewport.id === "iphone" ? 2 : 1,
  });
  await page.emulateMediaType(viewport.id === "print" ? "print" : "screen");

  const url = `${baseUrl}/planner/${tripId}/print?mode=${mode}`;
  await page.goto(url, { waitUntil: "networkidle0", timeout: 90_000 });
  await page.waitForSelector(".lux-document", { timeout: 30_000 });
  await preparePrintPage(page);

  const metrics = await measureGuestCountLayout(page);
  const shot = path.join(outDir, `${mode}-${viewport.id}.png`);
  await capture(page, shot);

  await page.close();
  return { mode, viewport: viewport.id, shot, metrics };
}

async function verifyClientPreview(browser, viewport) {
  const page = await browser.newPage();
  await page.setViewport({
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: viewport.id === "iphone" ? 2 : 1,
  });

  const url = `${baseUrl}/planner/${tripId}/print?mode=client`;
  await page.goto(url, { waitUntil: "networkidle0", timeout: 90_000 });
  await page.waitForSelector(".lux-document", { timeout: 30_000 });
  await preparePrintPage(page);

  const metrics = await measureGuestCountLayout(page);
  const shot = path.join(outDir, `client-preview-${viewport.id}.png`);
  await page.screenshot({
    path: shot,
    clip: { x: 0, y: 0, width: viewport.width, height: Math.min(420, viewport.height) },
  });

  await page.close();
  return { mode: "client-preview", viewport: viewport.id, shot, metrics };
}

async function main() {
  const puppeteer = await import("puppeteer");
  const browser = await puppeteer.default.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const results = [];
  let exitCode = 0;

  try {
    console.log(`Verifying guest count layout on ${baseUrl} (trip ${tripId})…\n`);

    for (const viewport of VIEWPORTS) {
      for (const mode of ["client", "concierge"]) {
        const result = await verifyPrintMode(browser, mode, viewport);
        results.push(result);
        const status = result.metrics.ok ? "PASS" : "FAIL";
        console.log(
          `[${status}] ${mode} PDF @ ${viewport.label}: ${result.metrics.guestText || "(no guest count)"}`
        );
        if (result.metrics.issues?.length) {
          result.metrics.issues.forEach((issue) => console.log(`       - ${issue}`));
          exitCode = 1;
        }
        console.log(`       screenshot: ${result.shot}`);
      }

      const preview = await verifyClientPreview(browser, viewport);
      results.push(preview);
      const status = preview.metrics.ok ? "PASS" : "FAIL";
      console.log(
        `[${status}] client preview header @ ${viewport.label}: ${preview.metrics.guestText || "(no guest count)"}`
      );
      if (preview.metrics.issues?.length) {
        preview.metrics.issues.forEach((issue) => console.log(`       - ${issue}`));
        exitCode = 1;
      }
      console.log(`       screenshot: ${preview.shot}\n`);
    }

    const summaryPath = path.join(outDir, "results.json");
    fs.writeFileSync(summaryPath, JSON.stringify(results, null, 2));
    console.log(`Results saved to ${summaryPath}`);
  } finally {
    await browser.close();
  }

  process.exit(exitCode);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
