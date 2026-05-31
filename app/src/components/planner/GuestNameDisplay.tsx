"use client";

import { formatGuestName } from "@/lib/planner/format-guest-name";

export function GuestNameDisplay({ name }: { name: string }) {
  const { firstLine, secondLine } = formatGuestName(name);

  if (!firstLine) return null;

  return (
    <div className="lux-client-name">
      <p className="lux-client lux-client-line">{firstLine}</p>
      {secondLine ? (
        <p className="lux-client lux-client-line lux-client-line--last">
          {secondLine}
        </p>
      ) : null}
    </div>
  );
}
