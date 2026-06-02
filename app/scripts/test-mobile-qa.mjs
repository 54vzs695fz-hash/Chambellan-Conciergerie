#!/usr/bin/env node
/**
 * Mobile QA — 390px & 430px viewport checks.
 * Usage: BASE_URL=http://127.0.0.1:3015 node scripts/test-mobile-qa.mjs
 */
import puppeteer from "puppeteer";

const baseUrl = (process.env.BASE_URL ?? "https://chambellan-conciergerie.vercel.app").replace(
  /\/$/,
  ""
);
const widths = [390, 430];
const tripId = Number(process.env.TRIP_ID ?? "4");

async function auditPage(page, path, width) {
  await page.setViewport({ width, height: 844, deviceScaleFactor: 2 });
  const url = `${baseUrl}${path}`;
  const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForSelector("body", { timeout: 5000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 800));
  const status = res?.status() ?? 0;

  const metrics = await page.evaluate(() => {
    const doc = document.documentElement;
    const overflowX = doc.scrollWidth > doc.clientWidth + 1;
    const hiddenButtons = [];
    for (const el of document.querySelectorAll("button, a.btn-primary, a.btn-secondary, .lux-btn, .mobile-nav-link, .dash-action")) {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      if (rect.width === 0 || rect.height === 0) continue;
      if (style.visibility === "hidden" || style.display === "none") continue;
      const clipped =
        style.opacity === "0" ||
        style.pointerEvents === "none" ||
        rect.right > window.innerWidth + 2 ||
        rect.left < -2;
      if (clipped) {
        hiddenButtons.push(el.textContent?.trim().slice(0, 40) || el.className);
      }
    }
    return {
      overflowX,
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      hasMobileNav: !!document.querySelector(".mobile-nav"),
      sidebarHidden: getComputedStyle(document.querySelector(".app-sidebar") || document.body).display === "none" ||
        !document.querySelector(".app-sidebar"),
      hiddenButtons: hiddenButtons.slice(0, 5),
      title: document.title,
    };
  });

  return { path, width, status, ...metrics };
}

async function testCalendarFilters(page, width) {
  await page.setViewport({ width, height: 844, deviceScaleFactor: 2 });
  await page.goto(`${baseUrl}/calendar`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 600));
  if ((await page.content()).includes("__next_error__")) {
    return { width, filters: "page-error" };
  }
  await page.waitForSelector(".cal-filters-drawer-trigger, .cal-filters", {
    timeout: 10000,
  });
  const hasDrawer = await page.$(".cal-filters-drawer-trigger");
  if (!hasDrawer) return { width, filters: "desktop-inline" };
  await hasDrawer.click();
  await page.waitForSelector(".cal-filters-drawer-sheet", { timeout: 5000 });
  const sheetVisible = await page.evaluate(() => {
    const sheet = document.querySelector(".cal-filters-drawer-sheet");
    return !!sheet && getComputedStyle(sheet).display !== "none";
  });
  return { width, filters: sheetVisible ? "ok" : "sheet-hidden" };
}

async function testBadgePickers(page, width) {
  await page.setViewport({ width, height: 844, deviceScaleFactor: 2 });
  await page.goto(`${baseUrl}/calendar`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 600));
  return page.evaluate((viewportWidth) => {
    const payPicker = document.querySelector(".pay-status-picker-trigger");
    const progBadge = document.querySelector(".prog-status");
    const quickActions = document.querySelector(".cal-quick-actions");
    return {
      width: viewportWidth,
      payPicker: !!payPicker,
      progBadge: !!progBadge,
      quickActions: !!quickActions,
    };
  }, width);
}

async function testPdfApi() {
  const res = await fetch(`${baseUrl}/api/trips/${tripId}/pdf?mode=client`);
  const buf = Buffer.from(await res.arrayBuffer());
  return {
    status: res.status,
    valid: buf.subarray(0, 4).toString() === "%PDF" && buf.length > 1000,
    bytes: buf.length,
  };
}

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  let exitCode = 0;

  const routes = [
    "/",
    "/calendar",
    "/planner",
    `/planner/${tripId}`,
    "/clients",
    "/establishments",
  ];

  console.log(`Mobile QA against ${baseUrl}\n`);

  for (const width of widths) {
    console.log(`--- ${width}px ---`);
    for (const path of routes) {
      try {
        const r = await auditPage(page, path, width);
        const ok = r.status < 400 && !r.overflowX && r.hiddenButtons.length === 0;
        if (!ok) exitCode = 1;
        console.log(
          `${ok ? "PASS" : "FAIL"} ${path} status=${r.status} overflow=${r.overflowX} scroll=${r.scrollWidth}/${r.clientWidth} nav=${r.hasMobileNav}${r.hiddenButtons.length ? ` hidden=[${r.hiddenButtons.join(", ")}]` : ""}`
        );
        if (r.status >= 400) console.log(`  (page error — server/data issue)`);
      } catch (err) {
        exitCode = 1;
        console.log(`FAIL ${path} — ${err.message}`);
      }
    }

    try {
      const f = await testCalendarFilters(page, width);
      const ok = f.filters === "ok" || f.filters === "desktop-inline";
      if (f.filters !== "ok" && f.filters !== "desktop-inline") exitCode = 1;
      console.log(`${ok ? "PASS" : "FAIL"} calendar filters: ${f.filters}`);
    } catch (err) {
      exitCode = 1;
      console.log(`FAIL calendar filters — ${err.message}`);
    }

    try {
      const b = await testBadgePickers(page, width);
      const ok = b.payPicker || b.progBadge;
      if (!ok) exitCode = 1;
      console.log(`${ok ? "PASS" : "FAIL"} badges pay=${b.payPicker} prog=${b.progBadge} quick=${b.quickActions}`);
    } catch (err) {
      exitCode = 1;
      console.log(`FAIL badges — ${err.message}`);
    }
  }

  try {
    const pdf = await testPdfApi();
    const ok = pdf.status === 200 && pdf.valid;
    if (!ok) exitCode = 1;
    console.log(`\n${ok ? "PASS" : "FAIL"} PDF API status=${pdf.status} bytes=${pdf.bytes} valid=${pdf.valid}`);
  } catch (err) {
    exitCode = 1;
    console.log(`FAIL PDF — ${err.message}`);
  }

  await browser.close();
  process.exit(exitCode);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
