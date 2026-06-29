import { Fragment } from "react";
import type { TripDestinationFields } from "@/lib/planner/trip-destinations";
import { resolvePlannerDestinationTitleLines } from "@/lib/planner/trip-destinations";

interface Props {
  trip: Partial<TripDestinationFields>;
}

export function PlannerDestinationTitle({ trip }: Props) {
  const lines = resolvePlannerDestinationTitleLines(trip);

  if (lines.length === 0) return null;

  if (lines.length === 1) {
    return <h1 className="lux-destination">{lines[0]}</h1>;
  }

  const densityClass =
    lines.length > 3 ? " lux-destination-stack--dense" : "";

  return (
    <div
      className={`lux-destination-stack${densityClass}`}
      role="group"
      aria-label="Destinations"
    >
      {lines.map((line, index) => (
        <Fragment key={`dest-${index}`}>
          {index > 0 ? (
            <span className="lux-destination-bullet" aria-hidden>
              •
            </span>
          ) : null}
          <p className="lux-destination lux-destination-line">{line}</p>
        </Fragment>
      ))}
    </div>
  );
}
