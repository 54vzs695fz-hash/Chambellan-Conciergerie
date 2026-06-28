"use client";

import type { EstablishmentInput } from "@/lib/types";
import {
  COMMISSION_BASIS_LABELS,
  COMMISSION_BASIS_OPTIONS,
  COMMISSION_ELIGIBILITY_LABELS,
  formatEstablishmentCommissionSummary,
  type CommissionBasis,
  type CommissionEligibility,
} from "@/lib/establishments/commission";
import type { EstablishmentSeasonProgress } from "@/lib/establishments/seasonal-commission";

const ELIGIBILITY_OPTIONS: CommissionEligibility[] = [
  "none",
  "minimum_total_bill",
  "minimum_premium_drinks",
  "custom",
];

interface Props {
  form: EstablishmentInput;
  seasonProgress?: EstablishmentSeasonProgress | null;
  onChange: <K extends keyof EstablishmentInput>(
    key: K,
    value: EstablishmentInput[K]
  ) => void;
}

export function EstablishmentCommissionSection({
  form,
  seasonProgress = null,
  onChange,
}: Props) {
  const summary = formatEstablishmentCommissionSummary(form);

  return (
    <section className="est-commission-section space-y-5">
      <div>
        <h2 className="section-title">Commission</h2>
        <p className="text-sm text-muted mt-1">
          Simple percentage rules — the app calculates commission automatically
          when closing a stay.
        </p>
      </div>

      <fieldset className="est-commission-fieldset">
        <legend className="field-label">Commission available</legend>
        <div className="est-commission-radio-group">
          <label className="est-commission-radio min-h-[44px]">
            <input
              type="radio"
              name="commission_available"
              checked={form.commission_available === true}
              onChange={() => onChange("commission_available", true)}
            />
            <span>Yes</span>
          </label>
          <label className="est-commission-radio min-h-[44px]">
            <input
              type="radio"
              name="commission_available"
              checked={form.commission_available === false}
              onChange={() => onChange("commission_available", false)}
            />
            <span>No</span>
          </label>
        </div>
      </fieldset>

      {form.commission_available ? (
        <>
          <div>
            <label className="field-label" htmlFor="est-commission-percentage">
              Commission %
            </label>
            <input
              id="est-commission-percentage"
              className="field-input min-h-[44px]"
              value={form.commission_percentage}
              onChange={(event) =>
                onChange("commission_percentage", event.target.value)
              }
              placeholder="e.g. 10"
              inputMode="decimal"
            />
          </div>

          <div>
            <label className="field-label" htmlFor="est-commission-basis">
              Commission basis
            </label>
            <select
              id="est-commission-basis"
              className="field-input min-h-[44px]"
              value={form.commission_basis}
              onChange={(event) =>
                onChange("commission_basis", event.target.value as CommissionBasis)
              }
            >
              {COMMISSION_BASIS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {COMMISSION_BASIS_LABELS[option]}
                </option>
              ))}
            </select>
          </div>

          {form.commission_basis === "custom" ? (
            <div>
              <label className="field-label" htmlFor="est-commission-basis-custom">
                Custom basis
              </label>
              <input
                id="est-commission-basis-custom"
                className="field-input min-h-[44px]"
                value={form.commission_basis_custom}
                onChange={(event) =>
                  onChange("commission_basis_custom", event.target.value)
                }
                placeholder="Describe the commission basis"
              />
            </div>
          ) : null}

          <div>
            <label className="field-label" htmlFor="est-commission-eligibility">
              Eligibility rule
            </label>
            <select
              id="est-commission-eligibility"
              className="field-input min-h-[44px]"
              value={form.commission_eligibility}
              onChange={(event) =>
                onChange(
                  "commission_eligibility",
                  event.target.value as CommissionEligibility
                )
              }
            >
              {ELIGIBILITY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {COMMISSION_ELIGIBILITY_LABELS[option]}
                </option>
              ))}
            </select>
          </div>

          {form.commission_eligibility === "custom" ? (
            <div>
              <label
                className="field-label"
                htmlFor="est-commission-eligibility-custom"
              >
                Custom eligibility
              </label>
              <input
                id="est-commission-eligibility-custom"
                className="field-input min-h-[44px]"
                value={form.commission_eligibility_custom}
                onChange={(event) =>
                  onChange("commission_eligibility_custom", event.target.value)
                }
                placeholder="Describe the eligibility rule"
              />
            </div>
          ) : null}

          {form.commission_eligibility !== "none" ? (
            <div>
              <label className="field-label" htmlFor="est-commission-threshold">
                Threshold amount
              </label>
              <input
                id="est-commission-threshold"
                className="field-input min-h-[44px]"
                value={form.commission_threshold_amount}
                onChange={(event) =>
                  onChange("commission_threshold_amount", event.target.value)
                }
                placeholder="e.g. 2500 or €2500"
              />
            </div>
          ) : null}

          <div className="est-seasonal-commission">
            <h3 className="adm-subsection-title">Optional season target</h3>
            <p className="text-sm text-muted mb-3">
              Some partners only pay commission after reaching a seasonal client
              spend target.
            </p>

            <label className="est-commission-radio min-h-[44px]">
              <input
                type="checkbox"
                checked={form.seasonal_commission_enabled}
                onChange={(event) =>
                  onChange("seasonal_commission_enabled", event.target.checked)
                }
              />
              <span>Season target enabled</span>
            </label>

            {form.seasonal_commission_enabled ? (
              <div className="mt-3">
                <label className="field-label" htmlFor="est-season-target">
                  Season target amount
                </label>
                <input
                  id="est-season-target"
                  className="field-input min-h-[44px]"
                  value={form.seasonal_commission_target}
                  onChange={(event) =>
                    onChange("seasonal_commission_target", event.target.value)
                  }
                  placeholder="e.g. 250000"
                />

                {seasonProgress ? (
                  <div className="est-season-progress mt-4">
                    <div className="est-season-progress-row">
                      <span className="text-sm text-muted">Season progress</span>
                      <strong>{seasonProgress.current_spend_label}</strong>
                    </div>
                    <div
                      className="est-season-progress-bar-wrap"
                      role="progressbar"
                      aria-valuenow={seasonProgress.progress_percent}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <div
                        className="est-season-progress-bar"
                        style={{ width: `${seasonProgress.progress_percent}%` }}
                      />
                    </div>
                    <div className="est-season-progress-row">
                      <span className="text-sm text-muted">Remaining</span>
                      <span>{seasonProgress.remaining_label}</span>
                    </div>
                    {seasonProgress.target_reached ? (
                      <span className="est-season-target-badge">Target reached</span>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </>
      ) : null}

      <p className="est-commission-summary" aria-live="polite">
        {summary}
      </p>
    </section>
  );
}
