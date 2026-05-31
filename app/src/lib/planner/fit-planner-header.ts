const HEADER_FIT_CLASSES = [
  "lux-header-fit--tight",
  "lux-header-fit--compact",
  "lux-header-fit--min",
] as const;

function clearHeaderFit(el: HTMLElement) {
  for (const cls of HEADER_FIT_CLASSES) {
    el.classList.remove(cls);
  }
}

function elementFits(el: HTMLElement, maxWidth: number) {
  return el.scrollWidth <= maxWidth + 1;
}

function applyHeaderFitToElement(el: HTMLElement, maxWidth: number) {
  clearHeaderFit(el);
  if (maxWidth <= 0 || elementFits(el, maxWidth)) return;

  el.classList.add("lux-header-fit--tight");
  if (elementFits(el, maxWidth)) return;

  el.classList.add("lux-header-fit--compact");
  if (elementFits(el, maxWidth)) return;

  el.classList.add("lux-header-fit--min");
}

/** Scale header side content to fit column width without clipping. */
export function applyPlannerHeaderFit(meta: HTMLElement | null) {
  if (!meta) return;

  const leftCol = meta.querySelector<HTMLElement>(".lux-meta-left");
  const rightCol = meta.querySelector<HTMLElement>(".lux-meta-right");
  const leftWidth = leftCol?.clientWidth ?? 0;
  const rightWidth = rightCol?.clientWidth ?? 0;

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
}

export { clearHeaderFit, applyHeaderFitToElement };
