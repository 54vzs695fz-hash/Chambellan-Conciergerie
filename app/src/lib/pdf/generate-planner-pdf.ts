import type { Browser } from "puppeteer-core";
import type { PlannerExportVariant } from "../planner/planner-sheet-model";
import {
  preparePlannerPdfPage,
  renderPlannerPdfBuffer,
} from "./planner-pdf-capture";

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
  const browser = await launchBrowser();

  try {
    const page = await browser.newPage();
    const { scale } = await preparePlannerPdfPage(page, tripId, mode, origin);
    return renderPlannerPdfBuffer(page, scale);
  } finally {
    await browser.close();
  }
}
