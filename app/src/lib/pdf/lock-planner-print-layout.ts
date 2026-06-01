/** Locks timeline column heights before PDF capture or browser print. */
export function lockPlannerPrintLayout(): void {
  try {
    applyCenteredPlannerLayout();
  } catch (err) {
    console.error("lockPlannerPrintLayout", err);
  }
}

const PLANNER_GAP_PX = 24;
const PLANNER_GAP_COMPACT_PX = 16;
const DAY_MIN_PX = 140;

function unlockDayLayout(doc: HTMLElement) {
  doc.classList.remove("lux-document--compact");
  doc.style.removeProperty("--lux-day-card-height");
  doc.style.setProperty("--lux-planner-gap", `${PLANNER_GAP_PX}px`);

  const nodes = doc.querySelectorAll<HTMLElement>(
    ".lux-itinerary-days, .lux-days-row, .lux-day-card, .lux-day-column, .lux-print-grid-stage, [data-lux-timeline]"
  );

  nodes.forEach((node) => {
    node.style.height = "";
    node.style.minHeight = "";
    node.style.maxHeight = "";
    node.style.overflow = "";
    node.style.display = "";
    node.style.gridTemplateRows = "";
    node.style.flex = "";
  });
}

function measureMaxDayScrollHeight(doc: HTMLElement): number {
  let max = DAY_MIN_PX;
  doc
    .querySelectorAll<HTMLElement>(".lux-day-card, .lux-day-column")
    .forEach((card) => {
      card.style.height = "auto";
      card.style.minHeight = "0";
      card.style.maxHeight = "none";
      card.style.overflow = "visible";
      max = Math.max(max, Math.ceil(card.scrollHeight));
    });
  return max;
}

function readPlannerContentOffset(): number {
  const block = document.querySelector(
    ".lux-print-root .lux-print-planner-block"
  );
  if (!block) return 0;
  const style = getComputedStyle(block);
  return parseFloat(style.marginTop) || 0;
}

function applyCenteredPlannerLayout() {
  const doc = document.querySelector(
    ".lux-print-root .lux-document"
  ) as HTMLElement | null;
  if (!doc) return;

  const header = doc.querySelector(".lux-header");
  const footer = doc.querySelector(".lux-footer");
  const stay = doc.querySelector(".lux-print-stay-reserved") as HTMLElement | null;
  const concierge = doc.querySelector(
    ".lux-print-concierge-reserved"
  ) as HTMLElement | null;
  const gridStage = doc.querySelector(
    ".lux-print-grid-stage"
  ) as HTMLElement | null;

  unlockDayLayout(doc);

  const docHeight = doc.getBoundingClientRect().height;
  const headerH = header?.getBoundingClientRect().height ?? 0;
  const footerH = footer?.getBoundingClientRect().height ?? 0;
  const contentArea = Math.max(200, Math.round(docHeight - headerH - footerH));

  resetAncillaryHeights(stay, concierge);

  const stayH = stay ? Math.ceil(stay.getBoundingClientRect().height) : 0;
  const conciergeH = concierge
    ? Math.ceil(concierge.getBoundingClientRect().height)
    : 0;
  const gapCount =
    (stay ? 1 : 0) + (concierge && (stay || gridStage) ? 1 : 0);
  const ancillaryH = stayH + conciergeH + gapCount * PLANNER_GAP_PX;

  const contentOffset = readPlannerContentOffset();
  const availableForDays = Math.max(
    DAY_MIN_PX,
    contentArea - ancillaryH - 8 - contentOffset
  );
  let maxContent = measureMaxDayScrollHeight(doc);

  if (maxContent > availableForDays) {
    doc.classList.add("lux-document--compact");
    doc.style.setProperty("--lux-planner-gap", `${PLANNER_GAP_COMPACT_PX}px`);
    maxContent = measureMaxDayScrollHeight(doc);
  }

  const dayH = Math.max(DAY_MIN_PX, maxContent);

  doc.style.setProperty("--lux-content-area-height", `${contentArea}px`);
  doc.style.setProperty("--lux-day-card-height", `${dayH}px`);
  if (!doc.classList.contains("lux-document--compact")) {
    doc.style.setProperty("--lux-planner-gap", `${PLANNER_GAP_PX}px`);
  }

  if (gridStage) {
    gridStage.style.height = `${dayH}px`;
    gridStage.style.minHeight = `${dayH}px`;
    gridStage.style.maxHeight = `${dayH}px`;
    gridStage.style.flex = "0 0 auto";
    gridStage.style.overflow = "visible";
  }

  lockDayRows(dayH);
  applyTimelineLayout();
  resetAncillaryHeights(stay, concierge);
}

function resetAncillaryHeights(
  stay: HTMLElement | null,
  concierge: HTMLElement | null
) {
  for (const el of [stay, concierge]) {
    if (!el) continue;
    el.style.height = "auto";
    el.style.minHeight = "0";
    el.style.maxHeight = "none";
    el.style.flex = "0 0 auto";
  }
}

function lockDayRows(dayH: number) {
  document
    .querySelectorAll(".lux-itinerary-days, .lux-days-row")
    .forEach((row) => {
      const el = row as HTMLElement;
      el.style.height = `${dayH}px`;
      el.style.minHeight = `${dayH}px`;
      el.style.maxHeight = `${dayH}px`;
      el.style.flex = "0 0 auto";
      el.style.overflow = "visible";
      row.querySelectorAll(".lux-day-card, .lux-day-column").forEach((col) => {
        const card = col as HTMLElement;
        card.style.height = `${dayH}px`;
        card.style.minHeight = `${dayH}px`;
        card.style.maxHeight = `${dayH}px`;
        card.style.overflow = "visible";
      });
    });
}

function applyTimelineLayout() {
  document.querySelectorAll("[data-lux-timeline]").forEach((timeline) => {
    const el = timeline as HTMLElement;
    el.style.height = "auto";
    el.style.minHeight = "0";
    el.style.maxHeight = "none";
    el.style.display = "grid";
    el.style.gridTemplateRows = "auto auto auto";
    el.style.overflow = "visible";
    el.style.gap = "0";
  });
}
