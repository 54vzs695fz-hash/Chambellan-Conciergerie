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

async function testPlannerMobile(page, width, tripId) {
  await page.setViewport({ width, height: 844, deviceScaleFactor: 2 });
  await page.goto(`${baseUrl}/planner/${tripId}`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await new Promise((r) => setTimeout(r, 1200));

  const exports = await page.evaluate(() => {
    const btns = [...document.querySelectorAll(".lux-mobile-action-exports .lux-btn")];
    return btns.map((btn) => {
      const rect = btn.getBoundingClientRect();
      return {
        text: btn.textContent?.trim(),
        visible:
          rect.width > 0 &&
          rect.height >= 40 &&
          rect.top >= 0 &&
          rect.bottom <= window.innerHeight + 1 &&
          rect.right <= window.innerWidth + 1,
      };
    });
  });

  await page.click(".lux-mobile-action-exports .lux-btn--ghost");
  await page.waitForSelector(".lux-pdf-export-dialog", { timeout: 10000 });
  const modal = await page.evaluate(() => ({
    title: document.querySelector(".lux-pdf-export-title")?.textContent?.trim(),
    filename: document.querySelector(".lux-pdf-export-input")?.value ?? "",
  }));
  await page.click(".lux-pdf-export-dialog .lux-btn--ghost");

  await page.click(".lux-mobile-action-toggle button:nth-child(2)");
  await page.waitForSelector(".lux-client-preview-scroller", { timeout: 15000 });

  await page.evaluate(() => {
    const toggle = [...document.querySelectorAll(".adm-panel-toggle")].find((el) =>
      el.textContent?.includes("Activities")
    );
    if (toggle?.getAttribute("aria-expanded") !== "true") toggle.click();
  });
  await new Promise((r) => setTimeout(r, 500));

  const activities = await page.evaluate(() => {
    const acts = [...document.querySelectorAll(".adm-activity-actions .adm-icon-btn")].slice(0, 3);
    return acts.map((btn) => {
      const rect = btn.getBoundingClientRect();
      return {
        label: btn.getAttribute("aria-label"),
        visible: rect.width >= 40 && rect.height >= 40 && rect.right <= window.innerWidth + 1,
      };
    });
  });

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
  );

  return { width, exports, modal, activities, overflow };
}

async function testCalendarTouchTargets(page, width) {
  await page.setViewport({ width, height: 844, deviceScaleFactor: 2 });
  await page.goto(`${baseUrl}/calendar`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 800));
  return page.evaluate((viewportWidth) => {
    const pay = [...document.querySelectorAll(".pay-status-picker-trigger")].slice(0, 2).map((el) => {
      const rect = el.getBoundingClientRect();
      return { h: rect.height, ok: rect.height >= 40 };
    });
    const quick = [...document.querySelectorAll(".cal-quick-btn")].slice(0, 3).map((el) => {
      const rect = el.getBoundingClientRect();
      return { text: el.textContent?.trim(), h: rect.height, ok: rect.height >= 40 };
    });
    return {
      width: viewportWidth,
      pay,
      quick,
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
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

    try {
      const t = await testCalendarTouchTargets(page, width);
      const payOk = t.pay.length === 0 || t.pay.every((p) => p.ok);
      const quickOk = t.quick.length === 0 || t.quick.every((q) => q.ok);
      const ok = payOk && quickOk && !t.overflow;
      if (!ok) exitCode = 1;
      console.log(
        `${ok ? "PASS" : "FAIL"} calendar touch targets pay=${payOk} quick=${quickOk} overflow=${t.overflow}`
      );
    } catch (err) {
      exitCode = 1;
      console.log(`FAIL calendar touch targets — ${err.message}`);
    }

    try {
      const p = await testPlannerMobile(page, width, tripId);
      const exportsOk = p.exports.length === 2 && p.exports.every((b) => b.visible);
      const modalOk = p.modal.title === "Export PDF" && p.modal.filename.endsWith(".pdf");
      const actsOk = p.activities.length === 0 || p.activities.every((a) => a.visible);
      const ok = exportsOk && modalOk && actsOk && !p.overflow;
      if (!ok) exitCode = 1;
      console.log(
        `${ok ? "PASS" : "FAIL"} planner mobile exports=${exportsOk} modal=${modalOk} activities=${actsOk} overflow=${p.overflow}`
      );
    } catch (err) {
      exitCode = 1;
      console.log(`FAIL planner mobile — ${err.message}`);
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
