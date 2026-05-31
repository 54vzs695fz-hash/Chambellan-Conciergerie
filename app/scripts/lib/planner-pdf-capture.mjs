/** Shared PDF capture constants and eval scripts for Node test runners. */
export const PLANNER_PDF_PAGE = {
  width: 1123,
  height: 794,
  safeMarginPx: 20,
};

export const PLANNER_PDF_MARGINS = {
  top: "0",
  right: "0",
  bottom: "0",
  left: "0",
};

export const PLANNER_PDF_FIT_SCALE_SCRIPT = `
(() => {
  const SAFE = 20;
  const PAGE_W = 1123;
  const PAGE_H = 794;
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

export const PLANNER_PDF_BOUNDS_CHECK_SCRIPT = `
(() => {
  const SAFE = 20;
  const PAGE_W = 1123;
  const PAGE_H = 794;
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
