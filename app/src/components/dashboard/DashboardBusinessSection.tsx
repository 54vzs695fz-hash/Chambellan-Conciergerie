"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BUSINESS_DASHBOARD_FILTER_LABELS,
  type BusinessDashboardFilter,
} from "@/lib/dashboard/business-season";
import type { BusinessDashboardSummary } from "@/lib/dashboard/business-commissions";

interface Props {
  embedded?: boolean;
}

function formatRankAmount(amount: number): string {
  return `€${amount.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function RankList({
  title,
  items,
  emptyLabel,
}: {
  title: string;
  items: BusinessDashboardSummary["top_clients"];
  emptyLabel: string;
}) {
  return (
    <div className="dash-business-rank-card">
      <h3 className="dash-business-rank-title">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-muted">{emptyLabel}</p>
      ) : (
        <ol className="dash-business-rank-list">
          {items.map((item, index) => (
            <li key={item.key}>
              <span className="dash-business-rank-index">{index + 1}</span>
              <span className="dash-business-rank-label">{item.label}</span>
              <strong className="dash-business-rank-value">
                {formatRankAmount(item.amount)}
              </strong>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export function DashboardBusinessSection({ embedded = false }: Props) {
  const [filter, setFilter] = useState<BusinessDashboardFilter>("current_season");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [summary, setSummary] = useState<BusinessDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingEntryId, setUpdatingEntryId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({ filter });
    if (filter === "custom") {
      params.set("from", customFrom);
      params.set("to", customTo);
    }

    try {
      const res = await fetch(`/api/dashboard/business?${params}`);
      if (!res.ok) {
        throw new Error("Could not load business dashboard");
      }
      const data = (await res.json()) as BusinessDashboardSummary;
      setSummary(data);
    } catch {
      setError("Could not load business dashboard.");
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [filter, customFrom, customTo]);

  useEffect(() => {
    if (filter === "custom" && (!customFrom || !customTo)) {
      setLoading(false);
      return;
    }
    void load();
  }, [filter, customFrom, customTo, load]);

  const markReceived = async (entryId: number) => {
    setUpdatingEntryId(entryId);
    setError(null);

    const res = await fetch(`/api/dashboard/business/commissions/${entryId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ received: true }),
    });

    setUpdatingEntryId(null);

    if (!res.ok) {
      setError("Could not mark commission as received.");
      return;
    }

    void load();
  };

  const content = (
    <div className="dash-business">
      <div className="dash-business-filters" role="tablist" aria-label="Business filters">
        {(Object.keys(BUSINESS_DASHBOARD_FILTER_LABELS) as BusinessDashboardFilter[]).map(
          (option) => (
            <button
              key={option}
              type="button"
              role="tab"
              aria-selected={filter === option}
              className={`dash-business-filter${filter === option ? " dash-business-filter--active" : ""}`}
              onClick={() => setFilter(option)}
            >
              {BUSINESS_DASHBOARD_FILTER_LABELS[option]}
            </button>
          )
        )}
      </div>

      {filter === "custom" ? (
        <div className="dash-business-custom-range">
          <label className="dash-business-date-field">
            <span className="field-label">From</span>
            <input
              type="date"
              className="field-input"
              value={customFrom}
              onChange={(event) => setCustomFrom(event.target.value)}
            />
          </label>
          <label className="dash-business-date-field">
            <span className="field-label">To</span>
            <input
              type="date"
              className="field-input"
              value={customTo}
              onChange={(event) => setCustomTo(event.target.value)}
            />
          </label>
        </div>
      ) : null}

      {summary ? (
        <p className="dash-business-range-label text-sm text-muted">
          {summary.range.label} · {summary.range.start} – {summary.range.end}
        </p>
      ) : null}

      {error ? (
        <p className="text-sm text-red-700 mb-3" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted py-4">Loading business metrics…</p>
      ) : summary ? (
        <>
          <div className="dash-business-metrics">
            <div className="dash-business-metric dash-card dash-card--follow-up">
              <span className="dash-business-metric-label">Today&apos;s expected</span>
              <strong>{summary.metrics_labels.todays_expected}</strong>
            </div>
            <div className="dash-business-metric dash-card dash-card--confirmed">
              <span className="dash-business-metric-label">Season commissions</span>
              <strong>{summary.metrics_labels.season_total}</strong>
            </div>
            <div className="dash-business-metric dash-card dash-card--payments">
              <span className="dash-business-metric-label">Outstanding</span>
              <strong>{summary.metrics_labels.outstanding}</strong>
            </div>
            <div className="dash-business-metric dash-card dash-card--library">
              <span className="dash-business-metric-label">Received</span>
              <strong>{summary.metrics_labels.received}</strong>
            </div>
          </div>

          <div className="dash-business-ranks">
            <RankList
              title="Top clients"
              items={summary.top_clients}
              emptyLabel="No commission data for this period."
            />
            <RankList
              title="Top establishments"
              items={summary.top_establishments}
              emptyLabel="No establishment data for this period."
            />
            <RankList
              title="Top commission partners"
              items={summary.top_commission_partners}
              emptyLabel="No partner commissions for this period."
            />
            <RankList
              title="Top destinations"
              items={summary.top_destinations}
              emptyLabel="No destination data for this period."
            />
          </div>

          {summary.outstanding_entries.length > 0 ? (
            <div className="dash-business-outstanding">
              <h3 className="dash-business-rank-title">Outstanding commissions</h3>
              <ul className="dash-business-outstanding-list">
                {summary.outstanding_entries.map((entry) => (
                  <li key={entry.entry_id} className="dash-business-outstanding-item">
                    <div>
                      <strong>{entry.establishment_name}</strong>
                      <p className="text-sm text-muted">
                        {entry.client_name} · {entry.destination} ·{" "}
                        {entry.reference_date}
                      </p>
                    </div>
                    <div className="dash-business-outstanding-actions">
                      <span>{entry.commission_label}</span>
                      <button
                        type="button"
                        className="dash-business-received-btn min-h-[44px]"
                        onClick={() => void markReceived(entry.entry_id)}
                        disabled={updatingEntryId === entry.entry_id}
                      >
                        {updatingEntryId === entry.entry_id
                          ? "Saving…"
                          : "Mark received"}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      ) : filter === "custom" && (!customFrom || !customTo) ? (
        <p className="text-sm text-muted py-4">
          Select a start and end date to view custom business metrics.
        </p>
      ) : (
        <p className="text-sm text-muted py-4">
          No commission data yet. Close stays in the planner to populate this dashboard.
        </p>
      )}
    </div>
  );

  if (embedded) {
    return <div className="dash-embedded-section dash-business-embedded">{content}</div>;
  }

  return (
    <section className="dash-business-section mb-10" data-section="business">
      <h2 className="section-title mb-4">Business dashboard</h2>
      {content}
    </section>
  );
}
