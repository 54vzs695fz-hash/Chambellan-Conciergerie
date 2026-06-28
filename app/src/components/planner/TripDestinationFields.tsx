"use client";

import {
  memo,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import {
  detectItineraryDestinations,
  inferDestinationRegion,
} from "@/lib/planner/itinerary-destinations";
import {
  dedupeDestinations,
  destinationsMatch,
} from "@/lib/planner/destination-matching";
import type { TripDestinationFields as TripDestinationState } from "@/lib/planner/trip-destinations";
import { syncTripDestinationFields } from "@/lib/planner/trip-destinations";
import type { TripWithDays } from "@/lib/types";

interface Props {
  trip: TripWithDays;
  onDestinationFieldsChange: (fields: TripDestinationState) => void;
  onBlur: () => void;
}

type DestinationRow = {
  id: string;
  draft: string;
};

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

function destinationsSignature(values: string[]): string {
  return dedupeDestinations(values).join("\0");
}

function reconcileRowsToValues(
  rows: DestinationRow[],
  values: string[],
  nextId: () => string
): DestinationRow[] {
  const usedIds = new Set<string>();

  return values.map((value) => {
    const existing = rows.find(
      (row) =>
        !usedIds.has(row.id) &&
        (destinationsMatch(row.draft, value) || row.draft.trim() === value.trim())
    );

    if (existing) {
      usedIds.add(existing.id);
      return { id: existing.id, draft: value };
    }

    return { id: nextId(), draft: value };
  });
}

const DestinationRowInput = memo(function DestinationRowInput({
  rowId,
  value,
  autoFocus,
  onDraftChange,
  onFocus,
  onBlurCommit,
  onRemove,
}: {
  rowId: string;
  value: string;
  autoFocus: boolean;
  onDraftChange: (rowId: string, draft: string) => void;
  onFocus: (rowId: string) => void;
  onBlurCommit: (rowId: string) => void;
  onRemove: (rowId: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
    }
  }, [autoFocus, rowId]);

  return (
    <li className="adm-detected-dest-row">
      <input
        ref={inputRef}
        className="adm-input"
        value={value}
        onChange={(event) => onDraftChange(rowId, event.target.value)}
        onFocus={() => onFocus(rowId)}
        onBlur={() => onBlurCommit(rowId)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            inputRef.current?.blur();
          }
        }}
        enterKeyHint="done"
        placeholder="City"
        aria-label="Detected destination"
      />
      <button
        type="button"
        className="adm-detected-dest-remove"
        onClick={() => onRemove(rowId)}
        aria-label={`Remove ${value || "destination"}`}
      >
        Remove
      </button>
    </li>
  );
});

export function TripDestinationFields({
  trip,
  onDestinationFieldsChange,
  onBlur,
}: Props) {
  const reactId = useId();
  const idCounterRef = useRef(0);
  const editingCountRef = useRef(0);
  const lastSyncedSigRef = useRef("");

  const nextRowId = useCallback(() => {
    idCounterRef.current += 1;
    return `${reactId}-dest-${idCounterRef.current}`;
  }, [reactId]);

  const normalized = syncTripDestinationFields(trip);
  const detected = detectItineraryDestinations(trip.days);
  const multiOn = normalized.multi_destination;

  const [rows, setRows] = useState<DestinationRow[]>([]);
  const [focusRowId, setFocusRowId] = useState<string | null>(null);

  const syncRowsToTrip = useCallback(
    (nextRows: DestinationRow[]) => {
      const deduped = dedupeDestinations(nextRows.map((row) => row.draft));
      lastSyncedSigRef.current = destinationsSignature(deduped);
      onDestinationFieldsChange(
        syncTripDestinationFields(trip, {
          destinations: deduped,
          destination_region: inferDestinationRegion(deduped),
        })
      );
      return reconcileRowsToValues(nextRows, deduped, nextRowId);
    },
    [nextRowId, onDestinationFieldsChange, trip]
  );

  const flushDestinations = useCallback(() => {
    if (!multiOn) return;
    setRows((prev) => syncRowsToTrip(prev));
  }, [multiOn, syncRowsToTrip]);

  useEffect(() => {
    if (!multiOn) {
      setRows([]);
      lastSyncedSigRef.current = "";
      return;
    }

    if (editingCountRef.current > 0) return;

    const external = dedupeDestinations(normalized.destinations);
    const sig = destinationsSignature(external);
    if (sig === lastSyncedSigRef.current) return;

    setRows((prev) => reconcileRowsToValues(prev, external, nextRowId));
    lastSyncedSigRef.current = sig;
  }, [multiOn, normalized.destinations, nextRowId]);

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
      setRows([]);
      lastSyncedSigRef.current = "";
      return;
    }

    const initialDestinations = dedupeDestinations(
      normalized.destinations.length > 0 ? normalized.destinations : detected
    );

    const initialRows = initialDestinations.map((value) => ({
      id: nextRowId(),
      draft: value,
    }));

    setRows(initialRows);
    lastSyncedSigRef.current = destinationsSignature(initialDestinations);

    onDestinationFieldsChange(
      syncTripDestinationFields(trip, {
        multi_destination: true,
        destinations: initialDestinations,
        destination_region: inferDestinationRegion(initialDestinations),
      })
    );
  };

  const handleDraftChange = useCallback((rowId: string, draft: string) => {
    setRows((prev) =>
      prev.map((row) => (row.id === rowId ? { ...row, draft } : row))
    );
  }, []);

  const handleRowFocus = useCallback((_rowId: string) => {
    editingCountRef.current += 1;
  }, []);

  const handleRowBlurCommit = useCallback(
    (rowId: string) => {
      editingCountRef.current = Math.max(0, editingCountRef.current - 1);
      setFocusRowId((current) => (current === rowId ? null : current));

      setRows((prev) => {
        let next = prev;
        const row = prev.find((entry) => entry.id === rowId);
        if (row && !row.draft.trim()) {
          next = prev.filter((entry) => entry.id !== rowId);
        }
        return syncRowsToTrip(next);
      });
    },
    [syncRowsToTrip]
  );

  const handleRemoveDestination = useCallback(
    (rowId: string) => {
      setRows((prev) => syncRowsToTrip(prev.filter((row) => row.id !== rowId)));
    },
    [syncRowsToTrip]
  );

  const handleAddDestination = useCallback(() => {
    const newId = nextRowId();
    setFocusRowId(newId);
    setRows((prev) => [...prev, { id: newId, draft: "" }]);
  }, [nextRowId]);

  const handlePersistBlur = useCallback(() => {
    flushDestinations();
    onBlur();
  }, [flushDestinations, onBlur]);

  return (
    <div className="adm-trip-destinations adm-field--full">
      <Field label="Planner Destination">
        <input
          className="adm-input"
          value={trip.destination}
          onChange={(event) =>
            handleManualDestinationChange(event.target.value)
          }
          onBlur={handlePersistBlur}
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
        <div
          className="adm-detected-destinations"
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
              flushDestinations();
            }
          }}
        >
          <span className="adm-field-label">Detected destinations</span>
          <p className="adm-auto-destinations-note">
            Cities inferred from your itinerary. Edit or remove any entry — the
            planner destination above stays as the main title.
          </p>
          <ul className="adm-detected-destinations-list">
            {rows.map((row) => (
              <DestinationRowInput
                key={row.id}
                rowId={row.id}
                value={row.draft}
                autoFocus={focusRowId === row.id}
                onDraftChange={handleDraftChange}
                onFocus={handleRowFocus}
                onBlurCommit={handleRowBlurCommit}
                onRemove={handleRemoveDestination}
              />
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
