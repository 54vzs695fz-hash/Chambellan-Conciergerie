"use client";

import { detectItineraryDestinations } from "@/lib/planner/itinerary-destinations";
import type { TripDestinationFields as TripDestinationState } from "@/lib/planner/trip-destinations";
import { formatDestinationsJoin, syncTripDestinationFields } from "@/lib/planner/trip-destinations";
import type { TripWithDays } from "@/lib/types";

interface Props {
  trip: TripWithDays;
  onDestinationFieldsChange: (fields: TripDestinationState) => void;
  onBlur: () => void;
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="adm-field">
      <span className="adm-field-label">{label}</span>
      {children}
    </label>
  );
}

export function TripDestinationFields({
  trip,
  onDestinationFieldsChange,
  onBlur,
}: Props) {
  const detected = detectItineraryDestinations(trip.days);
  const normalized = syncTripDestinationFields(trip);

  const handleFallbackDestinationChange = (value: string) => {
    if (detected.length > 0) return;
    onDestinationFieldsChange(
      syncTripDestinationFields(trip, {
        multi_destination: false,
        destination: value,
        destinations: value.trim() ? [value.trim()] : [],
        destination_region: "",
      })
    );
  };

  return (
    <div className="adm-field adm-field--full">
      {detected.length > 1 ? (
        <div className="adm-auto-destinations">
          <span className="adm-field-label">Detected destinations</span>
          <p className="adm-auto-destinations-value">
            {normalized.destination_region
              ? `${normalized.destination_region} · ${formatDestinationsJoin(detected)}`
              : formatDestinationsJoin(detected)}
          </p>
          <p className="adm-auto-destinations-note">
            Destinations are inferred automatically from your activities. Use
            Override destination on a day only for transfers, yacht, or
            activities without a venue.
          </p>
        </div>
      ) : (
        <Field label="Destination">
          <input
            className="adm-input"
            value={trip.destination}
            onChange={(event) =>
              handleFallbackDestinationChange(event.target.value)
            }
            onBlur={onBlur}
            placeholder="Destination"
          />
          {detected.length === 1 ? (
            <p className="adm-auto-destinations-note">
              Detected from activities: {detected[0]}
            </p>
          ) : null}
        </Field>
      )}
    </div>
  );
}
