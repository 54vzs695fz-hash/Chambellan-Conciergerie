/** Self-contained script for Puppeteer page.evaluate (must not import bundler deps). */
export const LOCK_PLANNER_PRINT_LAYOUT_SCRIPT = `
(() => {
  try {
    const PLANNER_GAP_PX = 24;
    const DAY_MAX_RATIO = 0.52;
    const DAY_MIN_PX = 140;

    function resetAncillaryHeights(stay, concierge) {
      [stay, concierge].forEach((el) => {
        if (!el) return;
        el.style.height = "auto";
        el.style.minHeight = "0";
        el.style.maxHeight = "none";
        el.style.flex = "0 0 auto";
      });
    }

    function lockDayRows(dayH) {
      document.querySelectorAll(".lux-itinerary-days, .lux-days-row").forEach((row) => {
        row.style.height = dayH + "px";
        row.style.minHeight = dayH + "px";
        row.style.maxHeight = dayH + "px";
        row.style.flex = "0 0 auto";
        row.style.overflow = "visible";
        row.querySelectorAll(".lux-day-card, .lux-day-column").forEach((col) => {
          col.style.height = dayH + "px";
          col.style.minHeight = dayH + "px";
          col.style.maxHeight = dayH + "px";
        });
      });
    }

    function lockTimelineZones() {
      document.querySelectorAll("[data-lux-timeline]").forEach((timeline) => {
        const card = timeline.closest(".lux-day-card, .lux-day-column");
        if (!card) return;
        const head = card.querySelector(".lux-day-card-head, .lux-day-column-head");
        const section = timeline.closest(".lux-day-section");
        let bodyH;
        if (timeline.closest(".lux-day-card")) {
          bodyH = Math.round(
            card.getBoundingClientRect().height -
              (head ? head.getBoundingClientRect().height : 0)
          );
        } else {
          const columnGap = parseFloat(getComputedStyle(card).gap) || 0;
          const sectionStyles = section ? getComputedStyle(section) : null;
          const sectionPad = sectionStyles
            ? parseFloat(sectionStyles.paddingTop) +
              parseFloat(sectionStyles.paddingBottom)
            : 0;
          bodyH = Math.round(
            card.getBoundingClientRect().height -
              (head ? head.getBoundingClientRect().height : 0) -
              columnGap -
              sectionPad
          );
        }
        if (bodyH < 40) return;
        timeline.style.height = bodyH + "px";
        timeline.style.minHeight = bodyH + "px";
        timeline.style.display = "grid";
        timeline.style.gridTemplateRows = "1fr 1fr 1fr";
        timeline.style.overflow = "visible";
      });
    }

    const doc = document.querySelector(".lux-print-root .lux-document");
    if (!doc) return;

    const header = doc.querySelector(".lux-header");
    const footer = doc.querySelector(".lux-footer");
    const stay = doc.querySelector(".lux-print-stay-reserved");
    const concierge = doc.querySelector(".lux-print-concierge-reserved");
    const gridStage = doc.querySelector(".lux-print-grid-stage");

    const docHeight = doc.getBoundingClientRect().height;
    const headerH = header ? header.getBoundingClientRect().height : 0;
    const footerH = footer ? footer.getBoundingClientRect().height : 0;
    const contentArea = Math.max(200, Math.round(docHeight - headerH - footerH));

    resetAncillaryHeights(stay, concierge);

    const stayH = stay ? Math.ceil(stay.getBoundingClientRect().height) : 0;
    const conciergeH = concierge ? Math.ceil(concierge.getBoundingClientRect().height) : 0;
    const gapCount = (stay ? 1 : 0) + (concierge && (stay || gridStage) ? 1 : 0);
    const ancillaryH = stayH + conciergeH + gapCount * PLANNER_GAP_PX;

    const maxDayH = Math.round(contentArea * DAY_MAX_RATIO);
    const dayH = Math.max(
      DAY_MIN_PX,
      Math.min(maxDayH, contentArea - ancillaryH - 8)
    );

    doc.style.setProperty("--lux-content-area-height", contentArea + "px");
    doc.style.setProperty("--lux-day-card-height", dayH + "px");
    doc.style.setProperty("--lux-planner-gap", PLANNER_GAP_PX + "px");

    if (gridStage) {
      gridStage.style.height = dayH + "px";
      gridStage.style.minHeight = dayH + "px";
      gridStage.style.maxHeight = dayH + "px";
      gridStage.style.flex = "0 0 auto";
      gridStage.style.overflow = "visible";
    }

    lockDayRows(dayH);
    lockTimelineZones();
    resetAncillaryHeights(stay, concierge);
  } catch (err) {
    console.error("lockPlannerPrintLayout", err);
  }
  document.documentElement.setAttribute("data-lux-print-ready", "true");
})();
`;
