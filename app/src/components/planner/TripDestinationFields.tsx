"use client";

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
  const isMulti = normalized.multi_destination;

  const applyPatch = (patch: Partial<TripDestinationState>) => {
    onDestinationFieldsChange(syncTripDestinationFields(trip, patch));
  };

  const handleToggleMulti = (checked: boolean) => {
    if (checked) {
      const seed = normalized.destinations.length
        ? normalized.destinations
        : normalized.destination.trim()
          ? [normalized.destination.trim()]
          : [""];
      applyPatch({
        multi_destination: true,
        destinations: seed,
      });
      return;
    }

    const first =
      normalized.destinations.find((item) => item.trim()) ??
      normalized.destination.trim();
    applyPatch({
      multi_destination: false,
      destination: first,
      destinations: first ? [first] : [],
      destination_region: "",
    });
  };

  const handleSingleDestinationChange = (value: string) => {
    applyPatch({
      multi_destination: false,
      destination: value,
      destinations: value.trim() ? [value.trim()] : [],
      destination_region: "",
    });
  };

  const handleRegionChange = (value: string) => {
    applyPatch({ destination_region: value });
  };

  const handleDestinationChange = (index: number, value: string) => {
    const next = [...normalized.destinations];
    next[index] = value;
    applyPatch({ destinations: next, multi_destination: true });
  };

  const handleAddDestination = () => {
    applyPatch({
      destinations: [...normalized.destinations, ""],
      multi_destination: true,
    });
  };

  const handleRemoveDestination = (index: number) => {
    const next = normalized.destinations.filter((_, i) => i !== index);
    applyPatch({
      destinations: next.length > 0 ? next : [""],
      multi_destination: true,
    });
  };

  return (
    <div className="adm-field adm-field--full">
      <label className="adm-checkbox adm-checkbox--inline">
        <input
          type="checkbox"
          checked={isMulti}
          onChange={(event) => handleToggleMulti(event.target.checked)}
        />
        <span>Multi-destination</span>
      </label>

      {!isMulti ? (
        <Field label="Destination">
          <input
            className="adm-input"
            value={trip.destination}
            onChange={(event) =>
              handleSingleDestinationChange(event.target.value)
            }
            onBlur={onBlur}
            placeholder="Destination"
          />
        </Field>
      ) : (
        <div className="adm-multi-destinations">
          <Field label="Region title (optional)">
            <input
              className="adm-input"
              value={trip.destination_region ?? ""}
              onChange={(event) => handleRegionChange(event.target.value)}
              onBlur={onBlur}
              placeholder="e.g. Côte d&apos;Azur"
            />
          </Field>

          <div className="adm-multi-destinations-list">
            <span className="adm-field-label">Destinations</span>
            {normalized.destinations.map((value, index) => (
              <div key={index} className="adm-multi-destination-row">
                <input
                  className="adm-input"
                  value={value}
                  onChange={(event) =>
                    handleDestinationChange(index, event.target.value)
                  }
                  onBlur={onBlur}
                  placeholder={`Destination ${index + 1}`}
                  aria-label={`Destination ${index + 1}`}
                />
                {normalized.destinations.length > 1 ? (
                  <button
                    type="button"
                    className="adm-multi-destination-remove"
                    onClick={() => handleRemoveDestination(index)}
                    aria-label={`Remove destination ${index + 1}`}
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            ))}
            <button
              type="button"
              className="adm-multi-destination-add"
              onClick={handleAddDestination}
            >
              Add destination
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
