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
