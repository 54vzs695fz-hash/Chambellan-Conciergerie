/** Self-contained script for Puppeteer page.evaluate (must not import bundler deps). */
export const LOCK_PLANNER_PRINT_LAYOUT_SCRIPT = `
(() => {
  try {
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

    function availableGridHeight() {
      const doc = document.querySelector(".lux-print-root .lux-document");
      if (!doc) return null;
      const docHeight = doc.getBoundingClientRect().height;
      const header = doc.querySelector(".lux-header");
      const stay = doc.querySelector(".lux-print-stay-reserved");
      const concierge = doc.querySelector(".lux-print-concierge-reserved");
      const footer = doc.querySelector(".lux-footer");
      const used =
        (header ? header.getBoundingClientRect().height : 0) +
        (stay ? stay.getBoundingClientRect().height : 0) +
        (concierge ? concierge.getBoundingClientRect().height : 0) +
        (footer ? footer.getBoundingClientRect().height : 0) +
        8;
      return Math.max(120, Math.round(docHeight - used));
    }

    const gridStage = document.querySelector(".lux-print-grid-stage");
    if (gridStage) {
      const root =
        gridStage.closest(".lux-print-root") ||
        gridStage.closest(".lux-document") ||
        document.documentElement;
      const cssMax = cssVarPx(root, "--lux-print-grid-height");
      const available = availableGridHeight();
      const heightPx = cssMax && available
        ? Math.min(cssMax, available)
        : cssMax || available;
      if (heightPx) {
        gridStage.style.height = heightPx + "px";
        gridStage.style.minHeight = heightPx + "px";
        gridStage.style.maxHeight = heightPx + "px";
        gridStage.style.flex = "0 0 auto";
        gridStage.style.overflow = "hidden";
      }
      const main = gridStage.querySelector(".lux-main");
      const daysRow = gridStage.querySelector(".lux-itinerary-days, .lux-days-row");
      if (main) {
        main.style.height = "100%";
        main.style.display = "flex";
        main.style.flexDirection = "column";
        main.style.overflow = "hidden";
      }
      if (daysRow) {
        daysRow.style.flex = "1 1 auto";
        daysRow.style.height = "100%";
        daysRow.style.maxHeight = "100%";
        daysRow.style.overflow = "hidden";
      }
    }

    const stay = document.querySelector(".lux-print-stay-reserved");
    if (stay) {
      const root =
        stay.closest(".lux-print-root") ||
        stay.closest(".lux-document") ||
        document.documentElement;
      const stayPx = cssVarPx(root, "--lux-print-stay-height");
      if (stayPx) {
        stay.style.height = stayPx + "px";
        stay.style.minHeight = stayPx + "px";
        stay.style.maxHeight = stayPx + "px";
        stay.style.flex = "0 0 auto";
      }
    }

    document.querySelectorAll(".lux-itinerary-days, .lux-days-row").forEach((row) => {
      const rowHeight = row.getBoundingClientRect().height;
      if (rowHeight < 40) return;
      row.querySelectorAll(".lux-day-card, .lux-day-column").forEach((col) => {
        col.style.height = rowHeight + "px";
        col.style.minHeight = rowHeight + "px";
      });
    });

    document.querySelectorAll(".lux-day-card").forEach((card) => {
      const timeline = card.querySelector("[data-lux-timeline]");
      if (!timeline) return;
      const head = card.querySelector(".lux-day-card-head");
      const bodyHeight = Math.round(
        card.getBoundingClientRect().height -
          (head ? head.getBoundingClientRect().height : 0)
      );
      if (bodyHeight < 40) return;
      timeline.style.height = bodyHeight + "px";
      timeline.style.minHeight = bodyHeight + "px";
      timeline.style.overflow = "visible";
    });
  } catch (err) {
    console.error("lockPlannerPrintLayout", err);
  }
  document.documentElement.setAttribute("data-lux-print-ready", "true");
})();
`;
