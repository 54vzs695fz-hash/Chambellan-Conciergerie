const HEADER_FIT_CLASSES = [
  "lux-header-fit--tight",
  "lux-header-fit--compact",
  "lux-header-fit--min",
  "lux-header-fit--wrap",
] as const;

function clearHeaderFit(el: HTMLElement) {
  for (const cls of HEADER_FIT_CLASSES) {
    el.classList.remove(cls);
  }
}

function columnInnerWidth(col: HTMLElement) {
  const style = getComputedStyle(col);
  const padding =
    parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
  return Math.max(0, col.clientWidth - padding);
}

function elementFits(el: HTMLElement, maxWidth: number) {
  return el.scrollWidth <= maxWidth + 1;
}

function applyHeaderFitToElement(
  el: HTMLElement,
  maxWidth: number,
  allowWrap = true
) {
  clearHeaderFit(el);
  if (maxWidth <= 0 || elementFits(el, maxWidth)) return;

  el.classList.add("lux-header-fit--tight");
  if (elementFits(el, maxWidth)) return;

  el.classList.add("lux-header-fit--compact");
  if (elementFits(el, maxWidth)) return;

  el.classList.add("lux-header-fit--min");
  if (elementFits(el, maxWidth)) return;

  if (allowWrap) {
    el.classList.add("lux-header-fit--wrap");
  }
}

/** Scale header content to fit column width without clipping. */
export function applyPlannerHeaderFit(meta: HTMLElement | null) {
  if (!meta) return;

  const leftCol = meta.querySelector<HTMLElement>(".lux-meta-left");
  const rightCol = meta.querySelector<HTMLElement>(".lux-meta-right");
  const centerCol = meta.querySelector<HTMLElement>(".lux-meta-center");
  const destination = centerCol?.querySelector<HTMLElement>(".lux-destination");
  const leftWidth = leftCol ? columnInnerWidth(leftCol) : 0;
  const rightWidth = rightCol ? columnInnerWidth(rightCol) : 0;
  const centerWidth = centerCol ? columnInnerWidth(centerCol) : 0;

  if (leftCol && leftWidth > 0) {
    leftCol
      .querySelectorAll<HTMLElement>(
        ".lux-header-dates-start, .lux-header-dates-end"
      )
      .forEach((line) => applyHeaderFitToElement(line, leftWidth));
  }

  if (rightCol && rightWidth > 0) {
    const nameBlock = rightCol.querySelector<HTMLElement>(".lux-client-name");
    if (nameBlock) {
      nameBlock.style.maxWidth = `${rightWidth}px`;
      nameBlock
        .querySelectorAll<HTMLElement>(".lux-client-line")
        .forEach((line) => applyHeaderFitToElement(line, rightWidth));
    }

    const guests = rightCol.querySelector<HTMLElement>(".lux-client-guests");
    if (guests) {
      guests.style.maxWidth = `${rightWidth}px`;
      applyHeaderFitToElement(guests, rightWidth);
    }
  }

  if (destination && centerWidth > 0) {
    applyHeaderFitToElement(destination, centerWidth, true);
  }

  const destinationSub = centerCol?.querySelector<HTMLElement>(
    ".lux-destination-sub"
  );
  if (destinationSub && centerWidth > 0) {
    applyHeaderFitToElement(destinationSub, centerWidth, true);
  }
}

export { clearHeaderFit, applyHeaderFitToElement, columnInnerWidth };
