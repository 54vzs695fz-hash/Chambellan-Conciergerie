"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PaymentStatusBadge } from "@/components/status/PaymentStatusBadge";
import { ProgrammeStatusBadge } from "@/components/status/ProgrammeStatusBadge";
import type { DashboardProgrammeFollowUpCard } from "@/lib/types";

interface Props {
  initialProgrammes: DashboardProgrammeFollowUpCard[];
  embedded?: boolean;
}

const TONE_CARD_CLASS: Record<
  DashboardProgrammeFollowUpCard["tone"],
  string
> = {
  urgent: "dash-card--prog-urgent",
  payment: "dash-card--prog-payment",
  arrival: "dash-card--prog-arrival",
  complete: "dash-card--prog-complete",
};

function progressPercent(completed: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((completed / total) * 100);
}

export function DashboardFollowUpSummary({
  initialProgrammes,
  embedded = false,
}: Props) {
  const [programmes, setProgrammes] =
    useState<DashboardProgrammeFollowUpCard[]>(initialProgrammes);

  useEffect(() => {
    const refresh = async () => {
      const res = await fetch("/api/dashboard/follow-up");
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) {
        setProgrammes(data as DashboardProgrammeFollowUpCard[]);
      }
    };
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  if (!embedded && programmes.length === 0) return null;

  const listContent =
    programmes.length === 0 ? (
      <p className="dash-accordion-empty text-sm text-muted">
        No clients require follow-up right now.
      </p>
    ) : (
      <ul className="dash-follow-up-list">
        {programmes.map((programme) => {
          const percent = progressPercent(
            programme.tasks_completed,
            programme.tasks_total
          );

          return (
            <li key={programme.key}>
              <Link
                href={programme.href}
                className={`dash-follow-up-programme dash-card ${TONE_CARD_CLASS[programme.tone]}`}
              >
                <div className="dash-follow-up-programme-head">
                  <div className="dash-follow-up-programme-title">
                    <p className="dash-follow-up-client">
                      {programme.client_name}
                      <span className="dash-follow-up-sep">·</span>
                      {programme.destination}
                    </p>
                    {programme.arrival_countdown ? (
                      <p className="dash-follow-up-countdown">
                        {programme.arrival_countdown}
                      </p>
                    ) : null}
                  </div>
                  <span className="dash-follow-up-programme-chevron" aria-hidden>
                    ›
                  </span>
                </div>

                <div className="dash-follow-up-badges">
                  <ProgrammeStatusBadge
                    status={programme.follow_up_status}
                    showDot
                    arrivalDate={programme.arrival_date}
                  />
                  <PaymentStatusBadge
                    status={programme.payment_status}
                    arrivalDate={programme.arrival_date}
                    detail={programme.payment_detail}
                  />
                </div>

                <div className="dash-follow-up-progress">
                  <div className="dash-follow-up-progress-head">
                    <span className="dash-follow-up-progress-label">
                      Progress
                    </span>
                    <span className="dash-follow-up-progress-count">
                      {programme.tasks_completed} / {programme.tasks_total}{" "}
                      completed
                    </span>
                  </div>
                  <div
                    className="dash-follow-up-progress-bar"
                    role="progressbar"
                    aria-valuenow={percent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${programme.tasks_completed} of ${programme.tasks_total} tasks completed`}
                  >
                    <span
                      className="dash-follow-up-progress-fill"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>

                {programme.outstanding_tasks.length > 0 ? (
                  <div className="dash-follow-up-outstanding">
                    <p className="dash-follow-up-outstanding-label">
                      Outstanding tasks
                    </p>
                    <ul className="dash-follow-up-outstanding-list">
                      {programme.outstanding_tasks.map((task) => (
                        <li key={task}>{task}</li>
                      ))}
                    </ul>
                  </div>
                ) : programme.tone === "complete" ? (
                  <p className="dash-follow-up-all-clear">
                    All tasks completed
                  </p>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    );

  if (embedded) {
    return (
      <div className="dash-embedded-section dash-follow-up-embedded">
        <div className="dash-embedded-head">
          <Link href="/calendar" className="btn-ghost">
            Calendar
          </Link>
        </div>
        {listContent}
      </div>
    );
  }

  return (
    <section className="dash-follow-up mb-10" data-section="planner">
      <div className="dash-follow-up-head">
        <h2 className="section-title">Follow-up</h2>
        <Link href="/calendar" className="btn-ghost">
          Calendar
        </Link>
      </div>
      {listContent}
    </section>
  );
}
