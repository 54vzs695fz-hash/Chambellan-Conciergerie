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

const LOCK_LAYOUT = fs.readFileSync(
  path.join(__dirname, "../src/lib/pdf/lock-planner-print-layout-script.ts"),
  "utf8"
)
  .replace(/^\/\*\*[\s\S]*?\*\/\s*export const LOCK_PLANNER_PRINT_LAYOUT_SCRIPT = `/, "")
  .replace(/`;\s*$/, "");

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
  .lux-print-root--client { height: 794px; display: flex; flex-direction: column; }
  .lux-document { height: 100%; display: flex; flex-direction: column; }
  .lux-header { height: 72px; flex-shrink: 0; }
  .lux-print-body { flex: 1; display: flex; flex-direction: column; justify-content: center; min-height: 0; }
  .lux-print-planner-block { display: flex; flex-direction: column; gap: 24px; }
  .lux-print-grid-stage { display: flex; flex-direction: column; flex: 0 0 auto; overflow: visible; }
  .lux-print-grid-stage .lux-main { height: 100%; display: flex; flex-direction: column; overflow: visible; }
  .lux-itinerary-days { flex: 0 0 auto; display: flex; align-items: stretch; }
  .lux-day-card { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
  .lux-day-card-head { height: 36px; flex-shrink: 0; }
  .lux-day-card-body--timeline { display: grid; grid-template-rows: 1fr 1fr 1fr; flex: 1; height: 100%; overflow: visible; }
  .lux-timeline-zone--upper, .lux-timeline-zone--lower { display: flex; flex-direction: column; justify-content: center; }
  .lux-travel-card { background: #f3efe8; padding: 8px; }
  .lux-print-stay-reserved { display: flex; flex-direction: column; flex: 0 0 auto; height: auto; overflow: visible; }
  .lux-travel-info { display: flex; flex-direction: column; border-top: 1px solid #ccc; padding-top: 4px; }
  .lux-travel-info-grid { display: flex; flex-wrap: wrap; justify-content: center; gap: 0.2rem 1rem; }
  .lux-print-stay-reserved--dense .lux-travel-info-name { font-size: 12px; }
  .lux-footer { height: 24px; flex-shrink: 0; }
</style>
</head><body>
<div class="lux-planner-root">
<div class="lux-print-root lux-print-root--client">
  <div class="lux-document lux-document--client lux-document--travel lux-document--grid-expanded">
    <header class="lux-header"></header>
    <div class="lux-print-body">
      <div class="lux-print-planner-block">
        <div class="lux-print-grid-stage">
          <div class="lux-main">
            <div class="lux-itinerary-days">
              <article class="lux-day-card">
                <header class="lux-day-card-head"><span>Mon</span></header>
                <div class="lux-day-card-body lux-day-card-body--timeline" data-lux-timeline>
                  <div class="lux-timeline-zone lux-timeline-zone--upper">
                    <div class="lux-period-block lux-period-block--afternoon">
                      <div class="lux-travel-card"><time class="lux-travel-time">15:30</time><p class="lux-travel-venue">Shellona</p></div>
                    </div>
                  </div>
                  <div class="lux-timeline-zone lux-timeline-zone--middle"></div>
                  <div class="lux-timeline-zone lux-timeline-zone--lower">
                    <div class="lux-period-block lux-period-block--evening">
                      <div class="lux-travel-card"><time class="lux-travel-time">22:00</time><p class="lux-travel-venue">Gaia</p></div>
                    </div>
                  </div>
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
      </div>
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
    await page.evaluate((script) => eval(script), LOCK_LAYOUT);
    const result = await page.evaluate(() => {
      const doc = document.querySelector(".lux-document");
      const header = document.querySelector(".lux-header");
      const footer = document.querySelector(".lux-footer");
      const body = document.querySelector(".lux-print-body");
      const planner = document.querySelector(".lux-print-planner-block");
      const grid = document.querySelector(".lux-print-grid-stage");
      const stay = document.querySelector(".lux-print-stay-reserved");
      const timeline = document.querySelector("[data-lux-timeline]");
      const afternoon = document.querySelector(
        ".lux-timeline-zone--upper .lux-travel-card"
      );
      const evening = document.querySelector(
        ".lux-timeline-zone--lower .lux-travel-card"
      );
      if (!doc || !planner || !grid || !timeline || !afternoon || !evening) return null;

      const headerH = header.getBoundingClientRect().height;
      const footerH = footer.getBoundingClientRect().height;
      const contentTop = header.getBoundingClientRect().bottom;
      const contentBottom = footer.getBoundingClientRect().top;
      const contentArea = contentBottom - contentTop;
      const plannerRect = planner.getBoundingClientRect();
      const topMargin = plannerRect.top - contentTop;
      const bottomMargin = contentBottom - plannerRect.bottom;
      const stayGap = stay
        ? stay.getBoundingClientRect().top - grid.getBoundingClientRect().bottom
        : 0;

      const timelineRect = timeline.getBoundingClientRect();
      const afternoonRect = afternoon.getBoundingClientRect();
      const eveningRect = evening.getBoundingClientRect();
      const zoneH = timelineRect.height / 3;

      return {
        gridHeight: Math.round(grid.getBoundingClientRect().height),
        contentArea: Math.round(contentArea),
        dayMaxPct: Math.round((grid.getBoundingClientRect().height / contentArea) * 100),
        stayGap: Math.round(stayGap),
        centerBalance: Math.round(Math.abs(topMargin - bottomMargin)),
        afternoonZonePct: Math.round(
          (((afternoonRect.top + afternoonRect.bottom) / 2 - timelineRect.top) / zoneH) * 100
        ),
        eveningZonePct: Math.round(
          (((eveningRect.top + eveningRect.bottom) / 2 - (timelineRect.top + zoneH * 2)) / zoneH) *
            100
        ),
        stayFields: document.querySelectorAll(".lux-travel-info-item").length,
      };
    });
    if (!result) throw new Error("Standalone layout metrics missing");
    gridHeights.push(result);
    console.log(
      `  Stay fields ${result.stayFields}: grid ${result.gridHeight}px (${result.dayMaxPct}% of content), stay gap ${result.stayGap}px, balance ${result.centerBalance}px`
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

  const m = gridHeights[0];
  const okDayMax = m.dayMaxPct <= 60;
  const okStayGap = m.stayGap >= 18 && m.stayGap <= 34;
  const okCenter = m.centerBalance <= 24;
  const okAfternoon = m.afternoonZonePct >= 35 && m.afternoonZonePct <= 65;
  const okEvening = m.eveningZonePct >= 35 && m.eveningZonePct <= 65;
  if (!okDayMax || !okStayGap || !okCenter || !okAfternoon || !okEvening) {
    console.error(
      `  FAIL: day max <=60% (${m.dayMaxPct}%), stay gap 18-34px (${m.stayGap}), balance <=24px (${m.centerBalance}), zones ~50% (${m.afternoonZonePct}/${m.eveningZonePct})`
    );
    process.exitCode = 1;
  } else {
    console.log("  PASS: centered planner composition and three-zone timeline");
  }

  await page.setContent(standaloneHtml(2), { waitUntil: "domcontentloaded" });
  await page.evaluate((script) => eval(script), LOCK_LAYOUT);
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
      await page.evaluate((script) => eval(script), LOCK_LAYOUT);
    }

    const metrics = await page.evaluate(() => {
      const grid = document.querySelector(".lux-print-grid-stage");
      const results = [];
      document.querySelectorAll(".lux-day-card").forEach((card, index) => {
        const timeline = card.querySelector("[data-lux-timeline]");
        if (!timeline) return;
        const timelineRect = timeline.getBoundingClientRect();
        const afternoon = timeline.querySelector(
          ".lux-timeline-zone--upper .lux-travel-card"
        );
        const evening = timeline.querySelector(
          ".lux-timeline-zone--lower .lux-travel-card"
        );
        if (!afternoon || !evening) return;
        const afternoonRect = afternoon.getBoundingClientRect();
        const eveningRect = evening.getBoundingClientRect();
        const zoneH = timelineRect.height / 3;
        results.push({
          day: index + 1,
          gridHeight: grid ? Math.round(grid.getBoundingClientRect().height) : 0,
          timelineH: Math.round(timelineRect.height),
          afternoonZonePct: Math.round(
            (((afternoonRect.top + afternoonRect.bottom) / 2 - timelineRect.top) /
              zoneH) *
              100
          ),
          eveningZonePct: Math.round(
            (((eveningRect.top + eveningRect.bottom) / 2 -
              (timelineRect.top + zoneH * 2)) /
              zoneH) *
              100
          ),
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
        `  Day ${m.day}: grid ${m.gridHeight}px | timeline ${m.timelineH}px | upper zone ${m.afternoonZonePct}% | lower zone ${m.eveningZonePct}%`
      );
      const ok =
        m.afternoonZonePct >= 35 &&
        m.afternoonZonePct <= 65 &&
        m.eveningZonePct >= 35 &&
        m.eveningZonePct <= 65;
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
