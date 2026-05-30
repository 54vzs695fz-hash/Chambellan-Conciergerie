/** Locks timeline column heights before PDF capture or browser print. */
export function lockPlannerPrintLayout(): void {
  lockPrintGridStage();
  lockPrintStayReserved();
  lockPrintConciergeReserved();

  document.querySelectorAll(".lux-itinerary-days, .lux-days-row").forEach((row) => {
    const rowHeight = row.getBoundingClientRect().height;
    if (rowHeight < 40) return;
    row.querySelectorAll(".lux-day-card, .lux-day-column").forEach((col) => {
      (col as HTMLElement).style.height = `${rowHeight}px`;
      (col as HTMLElement).style.minHeight = `${rowHeight}px`;
    });
  });

  document.querySelectorAll(".lux-day-card").forEach((card) => {
    const timeline = card.querySelector("[data-lux-timeline]");
    if (!timeline) return;
    const head = card.querySelector(".lux-day-card-head");
    const cardHeight = card.getBoundingClientRect().height;
    const headHeight = head ? head.getBoundingClientRect().height : 0;
    const bodyHeight = Math.round(cardHeight - headHeight);
    if (bodyHeight < 40) return;
    const el = timeline as HTMLElement;
    el.style.height = `${bodyHeight}px`;
    el.style.minHeight = `${bodyHeight}px`;
    el.style.maxHeight = `${bodyHeight}px`;
    el.style.flex = "0 0 auto";
  });

  document.querySelectorAll(".lux-day-column").forEach((column) => {
    const timeline = column.querySelector("[data-lux-timeline]");
    const section = timeline?.closest(".lux-day-section");
    if (!timeline || !section) return;
    const head = column.querySelector(".lux-day-column-head");
    const columnHeight = column.getBoundingClientRect().height;
    const headHeight = head ? head.getBoundingClientRect().height : 0;
    const columnGap = parseFloat(getComputedStyle(column).gap) || 0;
    const sectionStyles = getComputedStyle(section);
    const sectionPad =
      parseFloat(sectionStyles.paddingTop) +
      parseFloat(sectionStyles.paddingBottom);
    const sectionHeight = Math.round(
      columnHeight - headHeight - columnGap - sectionPad
    );
    if (sectionHeight < 40) return;
    const sectionEl = section as HTMLElement;
    sectionEl.style.flex = "1 1 auto";
    sectionEl.style.display = "flex";
    sectionEl.style.flexDirection = "column";
    sectionEl.style.minHeight = "0";
    const timelineEl = timeline as HTMLElement;
    timelineEl.style.height = `${sectionHeight}px`;
    timelineEl.style.minHeight = `${sectionHeight}px`;
    timelineEl.style.maxHeight = `${sectionHeight}px`;
    timelineEl.style.flex = "0 0 auto";
  });

  document.documentElement.setAttribute("data-lux-print-ready", "true");
}

function cssVarPx(el: Element, name: string): number | null {
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

function applyFixedBox(el: HTMLElement, heightPx: number) {
  el.style.height = `${heightPx}px`;
  el.style.minHeight = `${heightPx}px`;
  el.style.maxHeight = `${heightPx}px`;
  el.style.flex = "0 0 auto";
  el.style.overflow = "hidden";
}

function lockPrintGridStage() {
  const gridStage = document.querySelector(
    ".lux-print-grid-stage"
  ) as HTMLElement | null;
  if (!gridStage) return;

  const root =
    gridStage.closest(".lux-print-root") ??
    gridStage.closest(".lux-document") ??
    document.documentElement;
  const heightPx = cssVarPx(root, "--lux-print-grid-height");
  if (heightPx) applyFixedBox(gridStage, heightPx);

  const main = gridStage.querySelector(".lux-main") as HTMLElement | null;
  if (main) {
    main.style.height = "100%";
    main.style.minHeight = "100%";
    main.style.display = "flex";
    main.style.flexDirection = "column";
    main.style.overflow = "hidden";
  }

  const daysRow = gridStage.querySelector(
    ".lux-itinerary-days, .lux-days-row"
  ) as HTMLElement | null;
  if (daysRow) {
    daysRow.style.flex = "1 1 auto";
    daysRow.style.height = "100%";
    daysRow.style.minHeight = "100%";
    daysRow.style.maxHeight = "100%";
    daysRow.style.overflow = "hidden";
  }
}

function lockPrintStayReserved() {
  const stay = document.querySelector(
    ".lux-print-stay-reserved"
  ) as HTMLElement | null;
  if (!stay) return;
  const root =
    stay.closest(".lux-print-root") ??
    stay.closest(".lux-document") ??
    document.documentElement;
  const heightPx = cssVarPx(root, "--lux-print-stay-height");
  if (heightPx) applyFixedBox(stay, heightPx);
}

function lockPrintConciergeReserved() {
  const reserved = document.querySelector(
    ".lux-print-concierge-reserved"
  ) as HTMLElement | null;
  if (!reserved) return;
  const root =
    reserved.closest(".lux-print-root") ??
    reserved.closest(".lux-document") ??
    document.documentElement;
  const heightPx = cssVarPx(root, "--lux-print-concierge-footer-height");
  if (heightPx) applyFixedBox(reserved, heightPx);
}
