import type { Page } from "puppeteer-core";
import type { PlannerExportVariant } from "../planner/planner-sheet-model";
import { LOCK_PLANNER_PRINT_LAYOUT_SCRIPT } from "./lock-planner-print-layout-script";

/** A4 landscape at 96 CSS px/in — matches Client Preview max-width. */
export const PLANNER_PDF_PAGE = {
  width: 1123,
  height: 794,
  safeMarginPx: 20,
} as const;

export const PLANNER_PDF_MARGINS = {
  top: "0",
  right: "0",
  bottom: "0",
  left: "0",
} as const;

/**
 * Measure planner content bounds inside safe padding and return a scale ≤ 1
 * so nothing is cropped when Puppeteer prints A4 landscape.
 */
export const PLANNER_PDF_FIT_SCALE_SCRIPT = `
(() => {
  const SAFE = ${PLANNER_PDF_PAGE.safeMarginPx};
  const PAGE_W = ${PLANNER_PDF_PAGE.width};
  const PAGE_H = ${PLANNER_PDF_PAGE.height};
  const doc = document.querySelector(".lux-print-root .lux-document");
  if (!doc) return 1;

  const selectors = [
    ".lux-header",
    ".lux-footer",
    ".lux-meta-left",
    ".lux-meta-right",
    ".lux-client-identity",
    ".lux-header-dates-start",
    ".lux-header-dates-end",
    ".lux-itinerary-days",
    ".lux-days-row",
    ".lux-print-stay-reserved",
    ".lux-print-concierge-reserved",
  ];

  let minLeft = PAGE_W;
  let maxRight = 0;
  let maxBottom = 0;
  let minTop = PAGE_H;

  selectors.forEach((selector) => {
    doc.querySelectorAll(selector).forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width <= 0 && r.height <= 0) return;
      minLeft = Math.min(minLeft, r.left);
      maxRight = Math.max(maxRight, r.right);
      maxBottom = Math.max(maxBottom, r.bottom);
      minTop = Math.min(minTop, r.top);
    });
  });

  if (maxRight <= 0) return 1;

  const availableW = PAGE_W - SAFE * 2;
  const availableH = PAGE_H - SAFE * 2;
  const contentW = maxRight - minLeft;
  const contentH = maxBottom - minTop;

  const scaleW = availableW / contentW;
  const scaleH = availableH / contentH;
  const scale = Math.min(1, scaleW, scaleH);

  return Number.isFinite(scale) && scale > 0 ? scale : 1;
})();
`;

export interface PlannerPdfBoundsCheck {
  ok: boolean;
  scale: number;
  page: { width: number; height: number; safeMargin: number };
  content: {
    left: number;
    right: number;
    top: number;
    bottom: number;
    width: number;
    height: number;
  };
  issues: string[];
}

export const PLANNER_PDF_BOUNDS_CHECK_SCRIPT = `
(() => {
  const SAFE = ${PLANNER_PDF_PAGE.safeMarginPx};
  const PAGE_W = ${PLANNER_PDF_PAGE.width};
  const PAGE_H = ${PLANNER_PDF_PAGE.height};
  const doc = document.querySelector(".lux-print-root .lux-document");
  const issues = [];

  if (!doc) {
    return {
      ok: false,
      scale: 1,
      page: { width: PAGE_W, height: PAGE_H, safeMargin: SAFE },
      content: { left: 0, right: 0, top: 0, bottom: 0, width: 0, height: 0 },
      issues: ["missing .lux-document"],
    };
  }

  const selectors = [
    ".lux-meta-left",
    ".lux-meta-right",
    ".lux-client-identity",
    ".lux-header-dates-start",
    ".lux-footer",
  ];

  let minLeft = PAGE_W;
  let maxRight = 0;
  let maxBottom = 0;
  let minTop = PAGE_H;

  selectors.forEach((selector) => {
    doc.querySelectorAll(selector).forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width <= 0 && r.height <= 0) return;
      minLeft = Math.min(minLeft, r.left);
      maxRight = Math.max(maxRight, r.right);
      maxBottom = Math.max(maxBottom, r.bottom);
      minTop = Math.min(minTop, r.top);
    });
  });

  const availableW = PAGE_W - SAFE * 2;
  const availableH = PAGE_H - SAFE * 2;
  const contentW = maxRight - minLeft;
  const contentH = maxBottom - minTop;
  const scaleNeeded = Math.min(1, availableW / contentW, availableH / contentH);

  const fitsAtScale1 =
    minLeft >= SAFE - 0.5 &&
    maxRight <= PAGE_W - SAFE + 0.5 &&
    maxBottom <= PAGE_H - SAFE + 0.5;

  if (!fitsAtScale1 && scaleNeeded >= 0.999) {
    if (minLeft < SAFE - 0.5) {
      issues.push("left content clipped (minLeft=" + minLeft.toFixed(1) + ")");
    }
    if (maxRight > PAGE_W - SAFE + 0.5) {
      issues.push("right content clipped (maxRight=" + maxRight.toFixed(1) + ")");
    }
    if (maxBottom > PAGE_H - SAFE + 0.5) {
      issues.push("bottom content clipped (maxBottom=" + maxBottom.toFixed(1) + ")");
    }
  }

  const tailored = [...doc.querySelectorAll(".lux-travel-info-label")].some((el) =>
    el.textContent?.toLowerCase().includes("tailored")
  );
  if (tailored) issues.push("TAILORED FOR still in Your Stay");

  return {
    ok: issues.length === 0 && (fitsAtScale1 || scaleNeeded < 0.999),
    scale: Number.isFinite(scaleNeeded) ? scaleNeeded : 1,
    page: { width: PAGE_W, height: PAGE_H, safeMargin: SAFE },
    content: {
      left: minLeft,
      right: maxRight,
      top: minTop,
      bottom: maxBottom,
      width: contentW,
      height: contentH,
    },
    issues,
  };
})();
`;

export async function preparePlannerPdfPage(
  page: Page,
  tripId: number,
  mode: PlannerExportVariant,
  origin: string
): Promise<{ scale: number; bounds: PlannerPdfBoundsCheck }> {
  const url = `${origin}/planner/${tripId}/print?mode=${mode}`;

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
  await page.evaluate((script: string) => {
    eval(script);
  }, LOCK_PLANNER_PRINT_LAYOUT_SCRIPT);
  await page
    .waitForFunction(
      () =>
        document.documentElement.getAttribute("data-lux-print-ready") === "true",
      { timeout: 15_000 }
    )
    .catch(() => {
      /* layout lock sets ready flag; continue if already painted */
    });

  const scale = await page.evaluate((script: string) => {
    return eval(script) as number;
  }, PLANNER_PDF_FIT_SCALE_SCRIPT);

  const bounds = await page.evaluate((script: string) => {
    return eval(script) as PlannerPdfBoundsCheck;
  }, PLANNER_PDF_BOUNDS_CHECK_SCRIPT);

  return { scale, bounds };
}

export async function renderPlannerPdfBuffer(
  page: Page,
  scale: number
): Promise<Buffer> {
  const pdf = await page.pdf({
    format: "A4",
    landscape: true,
    printBackground: true,
    preferCSSPageSize: false,
    scale,
    margin: PLANNER_PDF_MARGINS,
  });

  return Buffer.from(pdf);
}
