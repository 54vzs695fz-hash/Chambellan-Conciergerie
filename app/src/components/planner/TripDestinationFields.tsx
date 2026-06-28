"use client";

import {
  detectItineraryDestinations,
  inferDestinationRegion,
} from "@/lib/planner/itinerary-destinations";
import type { TripDestinationFields as TripDestinationState } from "@/lib/planner/trip-destinations";
import { syncTripDestinationFields } from "@/lib/planner/trip-destinations";
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
  const normalized = syncTripDestinationFields(trip);
  const detected = detectItineraryDestinations(trip.days);
  const multiOn = normalized.multi_destination;

  const handleManualDestinationChange = (value: string) => {
    onDestinationFieldsChange(
      syncTripDestinationFields(trip, {
        destination: value,
        ...(multiOn
          ? {}
          : {
              multi_destination: false,
              destinations: value.trim() ? [value.trim()] : [],
              destination_region: "",
            }),
      })
    );
  };

  const handleMultiToggle = (checked: boolean) => {
    if (!checked) {
      const manual = normalized.destination.trim();
      onDestinationFieldsChange(
        syncTripDestinationFields(trip, {
          multi_destination: false,
          destinations: manual ? [manual] : [],
          destination_region: "",
        })
      );
      return;
    }

    const initialDestinations =
      normalized.destinations.length > 0 ? normalized.destinations : detected;

    onDestinationFieldsChange(
      syncTripDestinationFields(trip, {
        multi_destination: true,
        destinations: initialDestinations,
        destination_region: inferDestinationRegion(initialDestinations),
      })
    );
  };

  const handleDestinationItemChange = (index: number, value: string) => {
    const next = [...normalized.destinations];
    next[index] = value;
    onDestinationFieldsChange(
      syncTripDestinationFields(trip, { destinations: next })
    );
  };

  const handleRemoveDestination = (index: number) => {
    const next = normalized.destinations.filter((_, i) => i !== index);
    onDestinationFieldsChange(
      syncTripDestinationFields(trip, {
        destinations: next,
        destination_region: inferDestinationRegion(next),
      })
    );
  };

  const handleAddDestination = () => {
    onDestinationFieldsChange(
      syncTripDestinationFields(trip, {
        destinations: [...normalized.destinations, ""],
      })
    );
  };

  return (
    <div className="adm-trip-destinations adm-field--full">
      <Field label="Planner Destination">
        <input
          className="adm-input"
          value={trip.destination}
          onChange={(event) =>
            handleManualDestinationChange(event.target.value)
          }
          onBlur={onBlur}
          placeholder="Saint Tropez"
        />
      </Field>

      <label className="adm-checkbox--inline adm-trip-destinations-multi">
        <input
          type="checkbox"
          checked={multiOn}
          onChange={(event) => handleMultiToggle(event.target.checked)}
        />
        Multi Destination Stay
      </label>

      {multiOn ? (
        <div className="adm-detected-destinations">
          <span className="adm-field-label">Detected destinations</span>
          <p className="adm-auto-destinations-note">
            Cities inferred from your itinerary. Edit or remove any entry — the
            planner destination above stays as the main title.
          </p>
          <ul className="adm-detected-destinations-list">
            {normalized.destinations.map((city, index) => (
              <li key={`${index}-${city}`} className="adm-detected-dest-row">
                <input
                  className="adm-input"
                  value={city}
                  onChange={(event) =>
                    handleDestinationItemChange(index, event.target.value)
                  }
                  onBlur={onBlur}
                  placeholder="City"
                  aria-label={`Destination ${index + 1}`}
                />
                <button
                  type="button"
                  className="adm-detected-dest-remove"
                  onClick={() => handleRemoveDestination(index)}
                  aria-label={`Remove ${city || "destination"}`}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="adm-detected-dest-add"
            onClick={handleAddDestination}
          >
            Add destination
          </button>
        </div>
      ) : null}
    </div>
  );
}
