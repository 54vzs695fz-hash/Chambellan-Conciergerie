/** Locks timeline column heights before PDF capture or browser print. */
export function lockPlannerPrintLayout(): void {
  try {
    applyCenteredPlannerLayout();
  } catch (err) {
    console.error("lockPlannerPrintLayout", err);
  }
  document.documentElement.setAttribute("data-lux-print-ready", "true");
}

const PLANNER_GAP_PX = 24;
const DAY_MAX_RATIO = 0.52;
const DAY_MIN_PX = 140;

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

  const maxDayH = Math.round(contentArea * DAY_MAX_RATIO);
  const dayH = Math.max(
    DAY_MIN_PX,
    Math.min(maxDayH, contentArea - ancillaryH - 8)
  );

  doc.style.setProperty("--lux-content-area-height", `${contentArea}px`);
  doc.style.setProperty("--lux-day-card-height", `${dayH}px`);
  doc.style.setProperty("--lux-planner-gap", `${PLANNER_GAP_PX}px`);

  if (gridStage) {
    gridStage.style.height = `${dayH}px`;
    gridStage.style.minHeight = `${dayH}px`;
    gridStage.style.maxHeight = `${dayH}px`;
    gridStage.style.flex = "0 0 auto";
    gridStage.style.overflow = "visible";
  }

  lockDayRows(dayH);
  lockTimelineZones();
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
        (col as HTMLElement).style.height = `${dayH}px`;
        (col as HTMLElement).style.minHeight = `${dayH}px`;
        (col as HTMLElement).style.maxHeight = `${dayH}px`;
      });
    });
}

function lockTimelineZones() {
  document.querySelectorAll("[data-lux-timeline]").forEach((timeline) => {
    const card = timeline.closest(".lux-day-card, .lux-day-column");
    if (!card) return;

    const head = card.querySelector(".lux-day-card-head, .lux-day-column-head");
    const section = timeline.closest(".lux-day-section");
    let bodyH: number;

    if (timeline.closest(".lux-day-card")) {
      bodyH = Math.round(
        card.getBoundingClientRect().height -
          (head?.getBoundingClientRect().height ?? 0)
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
          (head?.getBoundingClientRect().height ?? 0) -
          columnGap -
          sectionPad
      );
    }

    if (bodyH < 40) return;

    const el = timeline as HTMLElement;
    el.style.height = `${bodyH}px`;
    el.style.minHeight = `${bodyH}px`;
    el.style.display = "grid";
    el.style.gridTemplateRows = "1fr 1fr 1fr";
    el.style.overflow = "visible";
  });
}
