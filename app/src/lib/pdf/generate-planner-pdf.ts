import type { Browser } from "puppeteer-core";
import type { PlannerExportVariant } from "../planner/planner-sheet-model";
import { createPdfExportToken } from "./pdf-export-token";
import { LOCK_PLANNER_PRINT_LAYOUT_SCRIPT } from "./lock-planner-print-layout-script";

function resolveBaseUrl(baseUrl?: string): string {
  if (baseUrl) return baseUrl.replace(/\/$/, "");
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  const port = process.env.PORT || "3000";
  return `http://127.0.0.1:${port}`;
}

async function launchBrowser(): Promise<Browser> {
  if (process.env.VERCEL) {
    const chromium = await import("@sparticuz/chromium");
    const puppeteer = await import("puppeteer-core");
    return puppeteer.default.launch({
      args: chromium.default.args,
      executablePath: await chromium.default.executablePath(),
      headless: true,
    });
  }

  const puppeteer = await import("puppeteer");
  return puppeteer.default.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  }) as Promise<Browser>;
}

async function runLockScript(page: Awaited<ReturnType<Browser["newPage"]>>) {
  await page.evaluate(LOCK_PLANNER_PRINT_LAYOUT_SCRIPT);
  await page.evaluate(() => document.fonts.ready);
}

function logExportWarnings(
  exportState: { expected: string | null; actual: string | null; debug: string | null },
  mode: PlannerExportVariant
) {
  if (!exportState.expected || !exportState.actual) {
    console.warn(
      "[planner-pdf-export] Manifest data missing; proceeding with rendered document"
    );
    return;
  }

  try {
    const expected = JSON.parse(exportState.expected) as {
      activities: number;
      dayColumns: number;
      afternoon?: number;
      evening?: number;
    };
    const actual = JSON.parse(exportState.actual) as {
      activities: number;
      dayColumns: number;
      afternoon?: number;
      evening?: number;
    };

    if (expected.activities !== actual.activities) {
      console.warn(
        `[planner-pdf-export] Activity count mismatch: expected ${expected.activities}, rendered ${actual.activities}`
      );
    }
    if (expected.dayColumns !== actual.dayColumns) {
      console.warn(
        `[planner-pdf-export] Day column mismatch: expected ${expected.dayColumns}, rendered ${actual.dayColumns}`
      );
    }
    if (
      mode === "client" &&
      (expected.evening !== actual.evening ||
        expected.afternoon !== actual.afternoon)
    ) {
      console.warn(
        `[planner-pdf-export] Period count mismatch: expected afternoon ${expected.afternoon} evening ${expected.evening}, rendered afternoon ${actual.afternoon} evening ${actual.evening}`
      );
    }
  } catch (err) {
    console.warn("[planner-pdf-export] Could not parse manifest for warnings:", err);
  }

  if (exportState.debug) {
    console.info("[planner-pdf-export]\n" + exportState.debug);
  }
}

export async function generatePlannerPdf(
  tripId: number,
  mode: PlannerExportVariant,
  baseUrl?: string
): Promise<Buffer> {
  const origin = resolveBaseUrl(baseUrl);
  const pdfToken = await createPdfExportToken(tripId);
  const url = `${origin}/planner/${tripId}/print?mode=${mode}&pdfToken=${encodeURIComponent(pdfToken)}`;

  const browser = await launchBrowser();

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1123, height: 794, deviceScaleFactor: 1 });
    await page.emulateMediaType("print");

    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });
    page.on("pageerror", (err) => {
      consoleErrors.push(err instanceof Error ? err.message : String(err));
    });

    const response = await page.goto(url, {
      waitUntil: "networkidle0",
      timeout: 60_000,
    });
    if (!response?.ok()) {
      throw new Error(
        `Print page returned HTTP ${response?.status() ?? "unknown"}`
      );
    }

    try {
      await page.waitForSelector(".lux-document", { timeout: 30_000 });
    } catch {
      const title = await page.title();
      const bodyText = await page.evaluate(
        () => document.body?.innerText?.slice(0, 500) ?? ""
      );
      throw new Error(
        `Print layout failed to render (.lux-document missing). title="${title}" errors=${consoleErrors.join(" | ") || "none"} body="${bodyText}"`
      );
    }
    await page.evaluate(() => document.fonts.ready);

    const readyInTime = await page
      .waitForFunction(
        () =>
          document.documentElement.getAttribute("data-lux-export-ready") ===
          "true",
        { timeout: 20_000 }
      )
      .then(() => true)
      .catch((err) => {
        console.warn(
          "[planner-pdf-export] Export ready gate timeout; applying lock script:",
          err instanceof Error ? err.message : err
        );
        return false;
      });

    if (!readyInTime) {
      await runLockScript(page);
      await page.evaluate(() => {
        if (
          document.documentElement.getAttribute("data-lux-export-ready") !==
          "true"
        ) {
          document.documentElement.setAttribute("data-lux-export-ready", "true");
          document.documentElement.setAttribute("data-lux-print-ready", "true");
        }
      });
    }

    const exportState = await page.evaluate(() => ({
      expected: document.documentElement.getAttribute("data-lux-export-expected"),
      actual: document.documentElement.getAttribute("data-lux-export-actual"),
      debug: document.documentElement.getAttribute("data-lux-export-debug"),
      cardCount: document.querySelectorAll(".lux-travel-card, .lux-activity-card--itinerary").length,
    }));

    logExportWarnings(exportState, mode);

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

    if (!pdf?.byteLength) {
      throw new Error("PDF buffer is empty after render");
    }

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
