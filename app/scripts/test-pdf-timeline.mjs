#!/usr/bin/env node
/**
 * Verify PDF timeline + fixed grid/stay layout.
 *
 * Usage:
 *   STANDALONE=1 node scripts/test-pdf-timeline.mjs
 *   TRIP_ID=1 BASE_URL=http://127.0.0.1:3001 node scripts/test-pdf-timeline.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const tripId = Number(process.env.TRIP_ID ?? "1");
const outDir = path.join(__dirname, "..", "tmp");
const standalone = process.env.STANDALONE === "1";

const LOCK_LAYOUT = `
(() => {
  function cssVarPx(el, name) {
    const raw = getComputedStyle(el).getPropertyValue(name).trim();
    if (!raw) return null;
    const probe = document.createElement("div");
    probe.style.height = raw;
    probe.style.position = "absolute";
    probe.style.visibility = "hidden";
    document.body.appendChild(probe);
    const px = probe.getBoundingClientRect().height;
    document.body.removeChild(probe);
    return px > 0 ? px : null;
  }
  function applyFixedBox(el, heightPx) {
    el.style.height = heightPx + "px";
    el.style.minHeight = heightPx + "px";
    el.style.maxHeight = heightPx + "px";
    el.style.flex = "0 0 auto";
    el.style.overflow = "hidden";
  }
  const root = document.querySelector(".lux-print-root--client");
  const gridStage = document.querySelector(".lux-print-grid-stage");
  const stay = document.querySelector(".lux-print-stay-reserved");
  if (root && gridStage) {
    const gridPx = cssVarPx(root, "--lux-print-grid-height");
    if (gridPx) applyFixedBox(gridStage, gridPx);
    const main = gridStage.querySelector(".lux-main");
    const days = gridStage.querySelector(".lux-itinerary-days");
    if (main) { main.style.height = "100%"; main.style.display = "flex"; main.style.flexDirection = "column"; }
    if (days) { days.style.height = "100%"; days.style.flex = "1 1 auto"; }
  }
  if (root && stay) {
    const stayPx = cssVarPx(root, "--lux-print-stay-height");
    if (stayPx) applyFixedBox(stay, stayPx);
  }
  document.querySelectorAll(".lux-itinerary-days").forEach((row) => {
    const rowHeight = row.getBoundingClientRect().height;
    if (rowHeight < 40) return;
    row.querySelectorAll(".lux-day-card").forEach((col) => {
      col.style.height = rowHeight + "px";
      col.style.minHeight = rowHeight + "px";
    });
  });
  document.querySelectorAll(".lux-day-card").forEach((card) => {
    const timeline = card.querySelector("[data-lux-timeline]");
    if (!timeline) return;
    const head = card.querySelector(".lux-day-card-head");
    const bodyHeight = Math.round(card.getBoundingClientRect().height - (head ? head.getBoundingClientRect().height : 0));
    if (bodyHeight < 40) return;
    timeline.style.height = bodyHeight + "px";
    timeline.style.minHeight = bodyHeight + "px";
    timeline.style.overflow = "visible";
  });
  document.documentElement.setAttribute("data-lux-print-ready", "true");
})();
`;

function stayFields(count) {
  const labels = ["Hotel", "Villa", "Driver", "Butler", "Security", "Yacht"];
  return labels
    .slice(0, count)
    .map(
      (label) =>
        `<div class="lux-travel-info-item"><span class="lux-travel-info-label">${label}</span><span class="lux-travel-info-name">Contact ${label}</span></div>`
    )
    .join("");
}

function standaloneHtml(stayCount) {
  const dense = stayCount > 4 ? " lux-print-stay-reserved--dense" : "";
  return `<!DOCTYPE html>
<html><head>
<style>
  html, body { height: 794px; margin: 0; }
  .lux-print-root--client {
    --lux-print-grid-height: 86mm;
    --lux-print-stay-height: 20mm;
    height: 794px;
    display: flex;
    flex-direction: column;
  }
  .lux-document { height: 100%; display: flex; flex-direction: column; }
  .lux-header { height: 72px; flex-shrink: 0; }
  .lux-print-grid-stage {
    display: flex; flex-direction: column;
    flex: 0 0 var(--lux-print-grid-height);
    height: var(--lux-print-grid-height);
    min-height: var(--lux-print-grid-height);
    max-height: var(--lux-print-grid-height);
    overflow: hidden;
  }
  .lux-print-grid-stage .lux-main { height: 100%; display: flex; flex-direction: column; overflow: hidden; }
  .lux-itinerary-days { flex: 1; height: 100%; display: flex; align-items: stretch; }
  .lux-day-card { flex: 1; display: flex; flex-direction: column; height: 100%; }
  .lux-day-card-head { height: 36px; flex-shrink: 0; }
  .lux-day-card-body--timeline { display: flex; flex-direction: column; flex: 1; height: 100%; overflow: visible; }
  .lux-timeline-top-spacer { flex: 0 0 26%; flex-shrink: 0; }
  .lux-timeline-bottom-spacer { flex: 0 0 12%; flex-shrink: 0; }
  .lux-period-block { flex: 0 0 auto; }
  .lux-period-block--evening { margin-top: auto; }
  .lux-travel-card { background: #f3efe8; padding: 8px; }
  .lux-print-stay-reserved {
    display: flex; flex-direction: column; justify-content: center;
    flex: 0 0 var(--lux-print-stay-height);
    height: var(--lux-print-stay-height);
    min-height: var(--lux-print-stay-height);
    max-height: var(--lux-print-stay-height);
    overflow: hidden;
  }
  .lux-travel-info { height: 100%; display: flex; flex-direction: column; justify-content: center; overflow: hidden; }
  .lux-travel-info-grid { display: flex; flex-wrap: wrap; justify-content: center; gap: 0.2rem 1rem; overflow: hidden; }
  .lux-print-stay-reserved--dense .lux-travel-info-name { font-size: 12px; }
  .lux-footer { height: 24px; flex-shrink: 0; }
</style>
</head><body>
<div class="lux-planner-root">
<div class="lux-print-root lux-print-root--client">
  <div class="lux-document lux-document--client lux-document--travel lux-document--grid-expanded">
    <header class="lux-header"></header>
    <div class="lux-print-grid-stage">
      <div class="lux-main">
        <div class="lux-itinerary-days">
          <article class="lux-day-card">
            <header class="lux-day-card-head"><span>Mon</span></header>
            <div class="lux-day-card-body lux-day-card-body--timeline" data-lux-timeline>
              <div class="lux-timeline-top-spacer"></div>
              <div class="lux-period-block lux-period-block--afternoon">
                <div class="lux-travel-card"><time class="lux-travel-time">15:30</time><p class="lux-travel-venue">Shellona</p></div>
              </div>
              <div class="lux-period-block lux-period-block--evening">
                <div class="lux-travel-card"><time class="lux-travel-time">22:00</time><p class="lux-travel-venue">Gaia</p></div>
              </div>
              <div class="lux-timeline-bottom-spacer"></div>
            </div>
          </article>
        </div>
      </div>
    </div>
    <div class="lux-print-stay-reserved${dense}">
      <section class="lux-travel-info">
        <h2 class="lux-travel-info-heading">Your Stay</h2>
        <div class="lux-travel-info-grid">${stayFields(stayCount)}</div>
      </section>
    </div>
    <footer class="lux-footer">Footer</footer>
  </div>
</div>
</div>
</body></html>`;
}

async function runStandaloneLayoutTest(page) {
  const gridHeights = [];
  for (const stayCount of [2, 6]) {
    await page.setContent(standaloneHtml(stayCount), {
      waitUntil: "domcontentloaded",
    });
    await page.evaluate(LOCK_LAYOUT);
    const result = await page.evaluate(() => {
      const grid = document.querySelector(".lux-print-grid-stage");
      const stay = document.querySelector(".lux-print-stay-reserved");
      const timeline = document.querySelector("[data-lux-timeline]");
      const afternoon = document.querySelector(
        ".lux-period-block--afternoon .lux-travel-card"
      );
      const evening = document.querySelector(
        ".lux-period-block--evening .lux-travel-card"
      );
      if (!grid || !timeline || !afternoon || !evening) return null;
      const timelineRect = timeline.getBoundingClientRect();
      const afternoonRect = afternoon.getBoundingClientRect();
      const eveningRect = evening.getBoundingClientRect();
      const gap = eveningRect.top - afternoonRect.bottom;
      return {
        gridHeight: Math.round(grid.getBoundingClientRect().height),
        stayHeight: stay ? Math.round(stay.getBoundingClientRect().height) : 0,
        timelineH: Math.round(timelineRect.height),
        afternoonTopPct: Math.round(
          ((afternoonRect.top - timelineRect.top) / timelineRect.height) * 100
        ),
        eveningTopPct: Math.round(
          ((eveningRect.top - timelineRect.top) / timelineRect.height) * 100
        ),
        gapPct: Math.round((gap / timelineRect.height) * 100),
        stayFields: document.querySelectorAll(".lux-travel-info-item").length,
      };
    });
    if (!result) throw new Error("Standalone layout metrics missing");
    gridHeights.push(result);
    console.log(
      `  Stay fields ${result.stayFields}: grid ${result.gridHeight}px, stay ${result.stayHeight}px, gap ${result.gapPct}%`
    );
  }

  if (Math.abs(gridHeights[0].gridHeight - gridHeights[1].gridHeight) > 2) {
    console.error(
      `  FAIL: grid height changed with stay field count (${gridHeights[0].gridHeight}px vs ${gridHeights[1].gridHeight}px)`
    );
    process.exitCode = 1;
  } else {
    console.log(
      `  PASS: grid height stable at ${gridHeights[0].gridHeight}px with 2 vs 6 stay fields`
    );
  }

  if (
    Math.abs(gridHeights[0].stayHeight - gridHeights[1].stayHeight) > 2
  ) {
    console.error(
      `  FAIL: stay area height changed (${gridHeights[0].stayHeight}px vs ${gridHeights[1].stayHeight}px)`
    );
    process.exitCode = 1;
  } else {
    console.log(
      `  PASS: stay area fixed at ${gridHeights[0].stayHeight}px with 2 vs 6 stay fields`
    );
  }

  const m = gridHeights[0];
  const okAfternoon = m.afternoonTopPct >= 22 && m.afternoonTopPct <= 32;
  const okEvening = m.eveningTopPct >= 52 && m.eveningTopPct <= 62;
  const okGap = m.gapPct >= 3 && m.gapPct <= 35;
  if (!okAfternoon || !okEvening || !okGap) {
    console.error(
      `  FAIL: expected afternoon top 22-32%, evening top 52-62%, gap 3-35% (got ${m.afternoonTopPct}%, ${m.eveningTopPct}%, ${m.gapPct}%)`
    );
    process.exitCode = 1;
  } else {
    console.log("  PASS: centered timeline positioning");
  }

  await page.setContent(standaloneHtml(2), { waitUntil: "domcontentloaded" });
  await page.evaluate(LOCK_LAYOUT);
}

async function main() {
  const puppeteer = await import("puppeteer");
  const browser = await puppeteer.default.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1123, height: 794, deviceScaleFactor: 1 });
    await page.emulateMediaType("print");

    if (standalone) {
      console.log("Running standalone timeline + stay layout test…");
      await runStandaloneLayoutTest(page);
    } else {
      const printUrl = `${baseUrl}/planner/${tripId}/print?mode=client`;
      console.log(`Opening ${printUrl}…`);
      await page.goto(printUrl, { waitUntil: "networkidle0", timeout: 60_000 });
      await page.waitForSelector(".lux-document", { timeout: 30_000 });
      await page.evaluate(() => document.fonts.ready);
      await page.evaluate(LOCK_LAYOUT);
    }

    const metrics = await page.evaluate(() => {
      const grid = document.querySelector(".lux-print-grid-stage");
      const results = [];
      document.querySelectorAll(".lux-day-card").forEach((card, index) => {
        const timeline = card.querySelector("[data-lux-timeline]");
        if (!timeline) return;
        const timelineRect = timeline.getBoundingClientRect();
        const afternoon = timeline.querySelector(
          ".lux-period-block--afternoon .lux-travel-card"
        );
        const evening = timeline.querySelector(
          ".lux-period-block--evening .lux-travel-card"
        );
        if (!afternoon || !evening) return;
        const afternoonRect = afternoon.getBoundingClientRect();
        const eveningRect = evening.getBoundingClientRect();
        const timelineH = timelineRect.height;
        const gap = eveningRect.top - afternoonRect.bottom;
        results.push({
          day: index + 1,
          gridHeight: grid ? Math.round(grid.getBoundingClientRect().height) : 0,
          timelineH: Math.round(timelineH),
          afternoonTopPct: Math.round(
            ((afternoonRect.top - timelineRect.top) / timelineH) * 100
          ),
          eveningTopPct: Math.round(
            ((eveningRect.top - timelineRect.top) / timelineH) * 100
          ),
          gapPct: Math.round((gap / timelineH) * 100),
        });
      });
      return results;
    });

    console.log("\nTimeline metrics:");
    if (!metrics.length) {
      console.warn("No split-timeline day cards found.");
      process.exitCode = 1;
    }
    for (const m of metrics) {
      console.log(
        `  Day ${m.day}: grid ${m.gridHeight}px | timeline ${m.timelineH}px | afternoon top ${m.afternoonTopPct}% | evening top ${m.eveningTopPct}% | gap ${m.gapPct}%`
      );
      const ok =
        m.afternoonTopPct >= 22 &&
        m.afternoonTopPct <= 32 &&
        m.eveningTopPct >= 52 &&
        m.eveningTopPct <= 62 &&
        m.gapPct >= 3 &&
        m.gapPct <= 35;
      console.log(ok ? "  PASS" : "  FAIL");
      if (!ok) process.exitCode = 1;
    }

    fs.mkdirSync(outDir, { recursive: true });
    const pdfPath = path.join(
      outDir,
      standalone ? "timeline-stay-layout-test.pdf" : `timeline-test-trip-${tripId}.pdf`
    );
    const pdf = await page.pdf({
      format: "A4",
      landscape: true,
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: "2.5mm", right: "1.5mm", bottom: "2.5mm", left: "1.5mm" },
    });
    fs.writeFileSync(pdfPath, pdf);
    console.log(`\nPDF saved: ${pdfPath}`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
