import type { Browser } from "puppeteer-core";
import type { PlannerExportVariant } from "../planner/planner-sheet-model";

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

export async function generatePlannerPdf(
  tripId: number,
  mode: PlannerExportVariant,
  baseUrl?: string
): Promise<Buffer> {
  const origin = resolveBaseUrl(baseUrl);
  const url = `${origin}/planner/${tripId}/print?mode=${mode}`;

  const browser = await launchBrowser();

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1123, height: 794, deviceScaleFactor: 1 });
    await page.emulateMediaType("print");
    await page.goto(url, { waitUntil: "networkidle0", timeout: 60_000 });
    await page.waitForSelector(".lux-document", { timeout: 30_000 });
    await page.evaluate(() => document.fonts.ready);

    await page.waitForFunction(
      () =>
        document.documentElement.getAttribute("data-lux-export-ready") ===
        "true",
      { timeout: 30_000 }
    );

    const exportState = await page.evaluate(() => {
      const expected = document.documentElement.getAttribute(
        "data-lux-export-expected"
      );
      const actual = document.documentElement.getAttribute("data-lux-export-actual");
      const debug = document.documentElement.getAttribute("data-lux-export-debug");
      return { expected, actual, debug };
    });

    if (!exportState.expected || !exportState.actual) {
      throw new Error("PDF export ready gate did not publish manifest data");
    }

    if (exportState.debug) {
      console.info("[planner-pdf-export]\n" + exportState.debug);
    }

    const expected = JSON.parse(exportState.expected) as {
      activities: number;
      dayColumns: number;
      evening: number;
      byDay: Array<{ date: string; afternoon: number; evening: number; total: number }>;
    };
    const actual = JSON.parse(exportState.actual) as {
      activities: number;
      dayColumns: number;
      evening: number;
      visibleActivities: number;
      visibleEvening: number;
      byDay: Array<{
        date: string;
        afternoon: number;
        evening: number;
        total: number;
        visibleTotal: number;
        visibleAfternoon: number;
        visibleEvening: number;
      }>;
    };

    if (
      expected.activities !== actual.activities ||
      expected.dayColumns !== actual.dayColumns ||
      expected.evening !== actual.evening ||
      expected.activities !== actual.visibleActivities ||
      expected.evening !== actual.visibleEvening
    ) {
      throw new Error(
        `PDF export DOM mismatch: expected ${expected.activities} activities (${expected.evening} evening), visible ${actual.visibleActivities} (${actual.visibleEvening} evening)`
      );
    }

    for (let i = 0; i < expected.byDay.length; i += 1) {
      const expectedDay = expected.byDay[i];
      const actualDay = actual.byDay[i];
      if (
        !actualDay ||
        expectedDay.total !== actualDay.total ||
        expectedDay.evening !== actualDay.evening ||
        expectedDay.total !== actualDay.visibleTotal ||
        expectedDay.evening !== actualDay.visibleEvening
      ) {
        throw new Error(
          `PDF export day mismatch for ${expectedDay?.date ?? `day ${i + 1}`}`
        );
      }
    }

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

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
