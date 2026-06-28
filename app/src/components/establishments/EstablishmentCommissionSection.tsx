"use client";

import type { EstablishmentInput } from "@/lib/types";
import {
  COMMISSION_BASIS_LABELS,
  COMMISSION_BASIS_OPTIONS,
  COMMISSION_CALCULATION_LABELS,
  COMMISSION_CALCULATION_OPTIONS,
  COMMISSION_ELIGIBILITY_LABELS,
  COMMISSION_ELIGIBILITY_OPTIONS,
  formatEstablishmentCommissionSummary,
  type CommissionBasis,
  type CommissionCalculationType,
  type CommissionEligibility,
} from "@/lib/establishments/commission";

interface Props {
  form: EstablishmentInput;
  onChange: <K extends keyof EstablishmentInput>(
    key: K,
    value: EstablishmentInput[K]
  ) => void;
}

export function EstablishmentCommissionSection({ form, onChange }: Props) {
  const summary = formatEstablishmentCommissionSummary(form);

  return (
    <section className="est-commission-section space-y-5">
      <div>
        <h2 className="section-title">Commission</h2>
        <p className="text-sm text-muted mt-1">
          Define how commission is calculated and when it applies for this
          establishment.
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
            <label className="field-label" htmlFor="est-commission-calc">
              Commission calculation
            </label>
            <select
              id="est-commission-calc"
              className="field-input min-h-[44px]"
              value={form.commission_calc_type}
              onChange={(event) =>
                onChange(
                  "commission_calc_type",
                  event.target.value as CommissionCalculationType
                )
              }
            >
              {COMMISSION_CALCULATION_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {COMMISSION_CALCULATION_LABELS[option]}
                </option>
              ))}
            </select>
          </div>

          {form.commission_calc_type === "percentage" ? (
            <div>
              <label className="field-label" htmlFor="est-commission-percentage">
                Commission percentage
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
          ) : null}

          {form.commission_calc_type === "fixed_amount" ? (
            <div>
              <label className="field-label" htmlFor="est-commission-fixed">
                Commission fixed amount
              </label>
              <input
                id="est-commission-fixed"
                className="field-input min-h-[44px]"
                value={form.commission_fixed_amount}
                onChange={(event) =>
                  onChange("commission_fixed_amount", event.target.value)
                }
                placeholder="e.g. €500"
              />
            </div>
          ) : null}

          {form.commission_calc_type === "custom" ? (
            <div>
              <label className="field-label" htmlFor="est-commission-calc-custom">
                Custom calculation
              </label>
              <textarea
                id="est-commission-calc-custom"
                className="field-input min-h-[72px]"
                rows={2}
                value={form.commission_calc_custom}
                onChange={(event) =>
                  onChange("commission_calc_custom", event.target.value)
                }
                placeholder="Describe the custom commission rule"
              />
            </div>
          ) : null}

          <div>
            <label className="field-label" htmlFor="est-commission-basis">
              Commission basis
            </label>
            <select
              id="est-commission-basis"
              className="field-input min-h-[44px]"
              value={form.commission_basis}
              onChange={(event) =>
                onChange(
                  "commission_basis",
                  event.target.value as CommissionBasis
                )
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
              Eligibility rules
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
              {COMMISSION_ELIGIBILITY_OPTIONS.map((option) => (
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
                Custom eligibility rule
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
        </>
      ) : null}

      <p className="est-commission-summary" aria-live="polite">
        {summary}
      </p>
    </section>
  );
}
