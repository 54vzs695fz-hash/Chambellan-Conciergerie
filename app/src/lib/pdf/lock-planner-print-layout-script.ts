/** Self-contained script for Puppeteer page.evaluate (must not import bundler deps). */
export const LOCK_PLANNER_PRINT_LAYOUT_SCRIPT = `
(() => {
  try {
    const PLANNER_GAP_PX = 24;
    const PLANNER_GAP_COMPACT_PX = 16;
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

    function unlockDayLayout(doc) {
      doc.classList.remove("lux-document--compact");
      doc.style.removeProperty("--lux-day-card-height");
      doc.style.setProperty("--lux-planner-gap", PLANNER_GAP_PX + "px");
      doc.querySelectorAll(".lux-itinerary-days, .lux-days-row, .lux-day-card, .lux-day-column, .lux-print-grid-stage, [data-lux-timeline]").forEach((node) => {
        node.style.height = "";
        node.style.minHeight = "";
        node.style.maxHeight = "";
        node.style.overflow = "";
        node.style.display = "";
        node.style.gridTemplateRows = "";
        node.style.flex = "";
      });
    }

    function measureMaxDayScrollHeight(doc) {
      let max = DAY_MIN_PX;
      doc.querySelectorAll(".lux-day-card, .lux-day-column").forEach((card) => {
        card.style.height = "auto";
        card.style.minHeight = "0";
        card.style.maxHeight = "none";
        card.style.overflow = "visible";
        max = Math.max(max, Math.ceil(card.scrollHeight));
      });
      return max;
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
          col.style.overflow = "visible";
        });
      });
    }

    function applyTimelineLayout() {
      document.querySelectorAll("[data-lux-timeline]").forEach((timeline) => {
        timeline.style.height = "auto";
        timeline.style.minHeight = "0";
        timeline.style.maxHeight = "none";
        timeline.style.display = "grid";
        timeline.style.gridTemplateRows = "auto auto auto";
        timeline.style.overflow = "visible";
        timeline.style.gap = "0";
      });
    }

    function readPlannerContentOffset() {
      const block = document.querySelector(".lux-print-root .lux-print-planner-block");
      if (!block) return 0;
      const style = window.getComputedStyle(block);
      return parseFloat(style.marginTop) || 0;
    }

    const doc = document.querySelector(".lux-print-root .lux-document");
    if (!doc) return;

    const header = doc.querySelector(".lux-header");
    const footer = doc.querySelector(".lux-footer");
    const stay = doc.querySelector(".lux-print-stay-reserved");
    const concierge = doc.querySelector(".lux-print-concierge-reserved");
    const gridStage = doc.querySelector(".lux-print-grid-stage");

    unlockDayLayout(doc);

    const docHeight = doc.getBoundingClientRect().height;
    const headerH = header ? header.getBoundingClientRect().height : 0;
    const footerH = footer ? footer.getBoundingClientRect().height : 0;
    const contentArea = Math.max(200, Math.round(docHeight - headerH - footerH));

    resetAncillaryHeights(stay, concierge);

    const stayH = stay ? Math.ceil(stay.getBoundingClientRect().height) : 0;
    const conciergeH = concierge ? Math.ceil(concierge.getBoundingClientRect().height) : 0;
    const gapCount = (stay ? 1 : 0) + (concierge && (stay || gridStage) ? 1 : 0);
    const ancillaryH = stayH + conciergeH + gapCount * PLANNER_GAP_PX;
    const contentOffset = readPlannerContentOffset();
    const availableForDays = Math.max(DAY_MIN_PX, contentArea - ancillaryH - 8 - contentOffset);

    let maxContent = measureMaxDayScrollHeight(doc);
    if (maxContent > availableForDays) {
      doc.classList.add("lux-document--compact");
      doc.style.setProperty("--lux-planner-gap", PLANNER_GAP_COMPACT_PX + "px");
      maxContent = measureMaxDayScrollHeight(doc);
    }

    const dayH = Math.max(DAY_MIN_PX, maxContent);

    doc.style.setProperty("--lux-content-area-height", contentArea + "px");
    doc.style.setProperty("--lux-day-card-height", dayH + "px");
    if (!doc.classList.contains("lux-document--compact")) {
      doc.style.setProperty("--lux-planner-gap", PLANNER_GAP_PX + "px");
    }

    if (gridStage) {
      gridStage.style.height = dayH + "px";
      gridStage.style.minHeight = dayH + "px";
      gridStage.style.maxHeight = dayH + "px";
      gridStage.style.flex = "0 0 auto";
      gridStage.style.overflow = "visible";
    }

    lockDayRows(dayH);
    applyTimelineLayout();
    resetAncillaryHeights(stay, concierge);

    function fitPlannerHeader() {
      document.querySelectorAll(".lux-meta--travel").forEach((meta) => {
        const leftCol = meta.querySelector(".lux-meta-left");
        const rightCol = meta.querySelector(".lux-meta-right");
        const centerCol = meta.querySelector(".lux-meta-center");
        const destination = centerCol ? centerCol.querySelector(".lux-destination") : null;
        const fitClasses = [
          "lux-header-fit--tight",
          "lux-header-fit--compact",
          "lux-header-fit--min",
          "lux-header-fit--wrap",
        ];

        function columnInnerWidth(col) {
          const style = window.getComputedStyle(col);
          const padding =
            parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
          return Math.max(0, col.clientWidth - padding);
        }

        const leftWidth = leftCol ? columnInnerWidth(leftCol) : 0;
        const rightWidth = rightCol ? columnInnerWidth(rightCol) : 0;
        const centerWidth = centerCol ? columnInnerWidth(centerCol) : 0;

        function clearFit(el) {
          fitClasses.forEach((cls) => el.classList.remove(cls));
        }

        function applyFit(el, maxWidth, allowWrap) {
          clearFit(el);
          if (maxWidth <= 0) return;
          const fits = () => el.scrollWidth <= maxWidth + 1;
          if (fits()) return;
          el.classList.add("lux-header-fit--tight");
          if (fits()) return;
          el.classList.add("lux-header-fit--compact");
          if (fits()) return;
          el.classList.add("lux-header-fit--min");
          if (fits()) return;
          if (allowWrap !== false) {
            el.classList.add("lux-header-fit--wrap");
          }
        }

        if (leftCol && leftWidth > 0) {
          leftCol.querySelectorAll(".lux-header-dates-start, .lux-header-dates-end").forEach((line) => {
            applyFit(line, leftWidth);
          });
        }

        if (rightCol && rightWidth > 0) {
          const nameBlock = rightCol.querySelector(".lux-client-name");
          if (nameBlock) {
            nameBlock.style.maxWidth = rightWidth + "px";
            nameBlock.querySelectorAll(".lux-client-line").forEach((line) => {
              applyFit(line, rightWidth);
            });
          }
          const guests = rightCol.querySelector(".lux-client-guests");
          if (guests) {
            guests.style.maxWidth = rightWidth + "px";
            applyFit(guests, rightWidth);
          }
        }

        if (destination && centerWidth > 0) {
          applyFit(destination, centerWidth, true);
        }

        const destinationSub = centerCol
          ? centerCol.querySelector(".lux-destination-sub")
          : null;
        if (destinationSub && centerWidth > 0) {
          applyFit(destinationSub, centerWidth, true);
        }
      });
    }

    fitPlannerHeader();
  } catch (err) {
    console.error("lockPlannerPrintLayout", err);
  }
})();
`;
