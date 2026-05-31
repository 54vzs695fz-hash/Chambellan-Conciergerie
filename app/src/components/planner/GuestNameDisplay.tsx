"use client";

import { useCallback, useEffect, useRef } from "react";
import { formatGuestName } from "@/lib/planner/format-guest-name";

function applyGuestNameFit(block: HTMLElement) {
  block.classList.remove(
    "lux-client-name--tight",
    "lux-client-name--compact",
    "lux-client-name--min"
  );

  const lines = block.querySelectorAll<HTMLElement>(".lux-client-line");
  if (!lines.length) return;

  const fits = () => {
    const width = block.clientWidth;
    return [...lines].every((line) => line.scrollWidth <= width + 1);
  };

  if (fits()) return;

  block.classList.add("lux-client-name--tight");
  if (fits()) return;

  block.classList.add("lux-client-name--compact");
  if (fits()) return;

  block.classList.add("lux-client-name--min");
}

export function GuestNameDisplay({ name }: { name: string }) {
  const blockRef = useRef<HTMLDivElement>(null);
  const { firstLine, secondLine } = formatGuestName(name);

  const fit = useCallback(() => {
    if (blockRef.current) applyGuestNameFit(blockRef.current);
  }, [firstLine, secondLine]);

  useEffect(() => {
    fit();
    const block = blockRef.current;
    if (!block) return;

    const observer = new ResizeObserver(() => fit());
    observer.observe(block);

    if (block.parentElement) {
      observer.observe(block.parentElement);
    }

    document.fonts?.ready.then(() => fit()).catch(() => fit());

    return () => observer.disconnect();
  }, [fit]);

  if (!firstLine) return null;

  return (
    <div ref={blockRef} className="lux-client-name">
      <p className="lux-client lux-client-line">{firstLine}</p>
      {secondLine ? (
        <p className="lux-client lux-client-line lux-client-line--last">
          {secondLine}
        </p>
      ) : null}
    </div>
  );
}

export { applyGuestNameFit };
