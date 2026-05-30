"use client";

import type { CSSProperties } from "react";
import { useLayoutEffect, useRef } from "react";
import Image from "next/image";
import type { Activity, TripDay, TripWithDays } from "@/lib/types";
import {
  getFilledConciergeTeam,
  getDocumentArrangementFields,
  getFilledDocumentArrangements,
  getClientItineraryContacts,
  getClientTravelInfoIcon,
  PLANNER_FOOTER,
  PLANNER_BRAND_LOGO,
  PLANNER_DOCUMENT_SUBTITLE,
  type PlannerExportVariant,
} from "@/lib/planner/planner-sheet-model";
import {
  formatDateRange,
  formatHeaderTravelDates,
  formatGridDayDate,
  formatLuxuryDayDate,
  formatGridDayName,
  getLuxuryCategoryDisplay,
  formatTimeDisplay,
  groupActivitiesByLuxuryPeriod,
  isGenericActivityNote,
  LUXURY_DISPLAY_PERIOD_ORDER,
  LUXURY_ITINERARY_PERIOD_TITLES,
  sortSectionsByItineraryOrder,
} from "@/lib/planner-utils";
import { getVisibleSections } from "@/lib/planner/day-sections";

const PLANNER_LOGO = PLANNER_BRAND_LOGO;

export interface PlannerLuxuryDocumentProps {
  trip: TripWithDays;
  variant?: PlannerExportVariant;
}

function sortActivities(activities: Activity[]): Activity[] {
  return [...activities].sort(
    (a, b) => a.sort_order - b.sort_order || a.id - b.id
  );
}

function activityHasVisibleContent(activity: Activity): boolean {
  return Boolean(
    activity.time || activity.title?.trim() || activity.details?.trim()
  );
}

function countSectionActivities(day: TripDay, sectionId: string): number {
  return day.activities.filter(
    (a) => a.period === sectionId && activityHasVisibleContent(a)
  ).length;
}

function isSparseTimelineDay(day: TripDay): boolean {
  return (
    countSectionActivities(day, "afternoon") === 1 &&
    countSectionActivities(day, "evening") === 1
  );
}

function LuxuryVenueName({ name }: { name: string }) {
  const ref = useRef<HTMLParagraphElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    el.style.fontSize = "";
    const computed = getComputedStyle(el);
    let sizePx = parseFloat(computed.fontSize);
    const lineHeight =
      parseFloat(computed.lineHeight) || sizePx * 1.18;
    const maxHeight = lineHeight * 2 + 0.5;
    const minSize = sizePx * 0.72;

    while (el.scrollHeight > maxHeight && sizePx > minSize) {
      sizePx -= 0.25;
      el.style.fontSize = `${sizePx}px`;
    }
  }, [name]);

  return (
    <p ref={ref} className="lux-travel-venue">
      {name}
    </p>
  );
}

function ClientTravelCard({
  activity,
  sectionLabel,
}: {
  activity: Activity;
  sectionLabel: string;
}) {
  const hasContent =
    activity.time || activity.title?.trim() || activity.details?.trim();
  if (!hasContent) return null;

  const detail = activity.details?.trim() || "";
  const showDetail = detail && !isGenericActivityNote(detail);
  const category = getLuxuryCategoryDisplay(sectionLabel);

  return (
    <article className="lux-travel-card">
      {activity.time ? (
        <time className="lux-travel-time">
          {formatTimeDisplay(activity.time)}
        </time>
      ) : null}
      {activity.title?.trim() ? (
        <LuxuryVenueName name={activity.title.trim()} />
      ) : null}
      {category.label ? (
        <span className="lux-travel-category">
          {category.icon ? (
            <span className="lux-travel-category-icon" aria-hidden>
              {category.icon}
            </span>
          ) : null}
          {category.label}
        </span>
      ) : null}
      {showDetail ? <p className="lux-travel-note">{detail}</p> : null}
    </article>
  );
}

function ClientPeriodBlock({
  period,
  periodItems,
}: {
  period: (typeof LUXURY_DISPLAY_PERIOD_ORDER)[number];
  periodItems: { activity: Activity; sectionLabel: string }[];
}) {
  if (periodItems.length === 0) return null;

  return (
    <div className={`lux-period-block lux-period-block--${period}`}>
      <h3 className="lux-period-title">
        {LUXURY_ITINERARY_PERIOD_TITLES[period]}
      </h3>
      {periodItems.map(({ activity, sectionLabel }) => (
        <ClientTravelCard
          key={activity.id}
          activity={activity}
          sectionLabel={sectionLabel}
        />
      ))}
    </div>
  );
}

function ClientDayCard({ day }: { day: TripDay }) {
  const sections = getVisibleSections(day);

  const orderedSections = sortSectionsByItineraryOrder(
    sections.filter((s) =>
      day.activities.some(
        (a) =>
          a.period === s.id &&
          (a.time || a.title?.trim() || a.details?.trim())
      )
    )
  );

  const items = orderedSections.flatMap((section) =>
    sortActivities(
      day.activities.filter(
        (a) =>
          a.period === section.id &&
          (a.time || a.title?.trim() || a.details?.trim())
      )
    ).map((activity) => ({ activity, sectionLabel: section.label }))
  );

  if (items.length === 0) return null;

  const periodGroups = groupActivitiesByLuxuryPeriod(items);
  const sparseDay = isSparseTimelineDay(day);
  const afternoonItems = periodGroups.get("afternoon") ?? [];
  const eveningItems = periodGroups.get("evening") ?? [];
  const splitTimeline =
    afternoonItems.length > 0 && eveningItems.length > 0;

  return (
    <article
      className={`lux-day-card${sparseDay ? " lux-day-card--sparse" : ""}`}
    >
      <header className="lux-day-card-head">
        <span className="lux-day-card-name">{formatGridDayName(day.date)}</span>
        <span className="lux-day-card-date">{formatLuxuryDayDate(day.date)}</span>
      </header>
      {splitTimeline ? (
        <div
          className="lux-day-card-body lux-day-card-body--timeline"
          data-lux-timeline
        >
          <div className="lux-timeline-band lux-timeline-band--space-top" aria-hidden="true" />
          <div className="lux-timeline-band lux-timeline-band--afternoon">
            <ClientPeriodBlock period="afternoon" periodItems={afternoonItems} />
          </div>
          <div className="lux-timeline-band lux-timeline-band--space-mid" aria-hidden="true" />
          <div className="lux-timeline-band lux-timeline-band--evening">
            <ClientPeriodBlock period="evening" periodItems={eveningItems} />
          </div>
          <div className="lux-timeline-band lux-timeline-band--space-bottom" aria-hidden="true" />
        </div>
      ) : (
        <div className="lux-day-card-body">
          {LUXURY_DISPLAY_PERIOD_ORDER.map((period) => (
            <ClientPeriodBlock
              key={period}
              period={period}
              periodItems={periodGroups.get(period) ?? []}
            />
          ))}
        </div>
      )}
    </article>
  );
}

function ConciergeActivityCard({
  activity,
  sectionLabel,
}: {
  activity: Activity;
  sectionLabel?: string;
}) {
  const hasContent =
    activity.time || activity.title?.trim() || activity.details?.trim();
  if (!hasContent) return null;

  const detail = activity.details?.trim() || "";
  const showDetail = detail && !/^confirmed$/i.test(detail);

  return (
    <div className="lux-activity-card lux-activity-card--itinerary">
      {activity.time ? (
        <span className="lux-activity-time">
          {formatTimeDisplay(activity.time)}
        </span>
      ) : null}
      {activity.title?.trim() ? (
        <p className="lux-activity-venue">{activity.title}</p>
      ) : null}
      {sectionLabel?.trim() ? (
        <p className="lux-activity-category">{sectionLabel}</p>
      ) : null}
      {showDetail ? (
        <p className="lux-activity-desc">{detail}</p>
      ) : null}
      {activity.status === "awaiting" ? (
        <p className="lux-activity-awaiting">Awaiting confirmation</p>
      ) : null}
    </div>
  );
}

function ConciergeSectionBlock({
  section,
  acts,
}: {
  section: { id: string; label: string };
  acts: Activity[];
}) {
  if (acts.length === 0) return null;

  return (
    <div className={`lux-itinerary-block lux-itinerary-block--${section.id}`}>
      <p className="lux-itinerary-section-title lux-itinerary-section-title--concierge">
        {section.label}
      </p>
      {acts.map((activity) => (
        <ConciergeActivityCard
          key={activity.id}
          activity={activity}
          sectionLabel={section.label}
        />
      ))}
    </div>
  );
}

function ConciergeDayColumn({ day }: { day: TripDay }) {
  const sections = getVisibleSections(day);

  const orderedSections = sortSectionsByItineraryOrder(
    sections.filter((s) =>
      day.activities.some(
        (a) =>
          a.period === s.id &&
          (a.time || a.title?.trim() || a.details?.trim())
      )
    )
  );

  if (orderedSections.length === 0) return null;

  const hasAfternoon = orderedSections.some((s) => s.id === "afternoon");
  const hasEvening = orderedSections.some((s) => s.id === "evening");
  const splitTimeline = hasAfternoon && hasEvening;
  const sparseDay = isSparseTimelineDay(day);

  const afternoonSection = orderedSections.find((s) => s.id === "afternoon");
  const eveningSection = orderedSections.find((s) => s.id === "evening");
  const middleSections = orderedSections.filter(
    (s) => s.id !== "afternoon" && s.id !== "evening"
  );

  const sectionActs = (sectionId: string) =>
    sortActivities(
      day.activities.filter(
        (a) =>
          a.period === sectionId &&
          (a.time || a.title?.trim() || a.details?.trim())
      )
    );

  return (
    <div className={`lux-day-column${sparseDay ? " lux-day-column--sparse" : ""}`}>
      <div className="lux-day-column-head">
        <span className="lux-day-name">{formatGridDayName(day.date)}</span>
        <span className="lux-day-date">{formatGridDayDate(day.date)}</span>
      </div>

      <div className={`lux-day-section${splitTimeline ? " lux-day-section--timeline" : ""}`}>
        {splitTimeline ? (
          <div className="lux-section-body lux-section-body--timeline" data-lux-timeline>
            <div className="lux-timeline-band lux-timeline-band--space-top" aria-hidden="true" />
            <div className="lux-timeline-band lux-timeline-band--afternoon">
              {afternoonSection ? (
                <ConciergeSectionBlock
                  section={afternoonSection}
                  acts={sectionActs(afternoonSection.id)}
                />
              ) : null}
            </div>
            <div className="lux-timeline-band lux-timeline-band--space-mid">
              {middleSections.map((section) => (
                <ConciergeSectionBlock
                  key={section.id}
                  section={section}
                  acts={sectionActs(section.id)}
                />
              ))}
            </div>
            <div className="lux-timeline-band lux-timeline-band--evening">
              {eveningSection ? (
                <ConciergeSectionBlock
                  section={eveningSection}
                  acts={sectionActs(eveningSection.id)}
                />
              ) : null}
            </div>
            <div className="lux-timeline-band lux-timeline-band--space-bottom" aria-hidden="true" />
          </div>
        ) : (
          <div className="lux-section-body">
            {orderedSections.map((section) => (
              <ConciergeSectionBlock
                key={section.id}
                section={section}
                acts={sectionActs(section.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function PlannerLuxuryDocument({
  trip,
  variant = "client",
}: PlannerLuxuryDocumentProps) {
  const isClientItinerary = variant === "client";
  const clientContacts = isClientItinerary
    ? getClientItineraryContacts(trip)
    : [];
  const filledTeam = getFilledConciergeTeam(trip);
  const showTeam = variant === "concierge" && filledTeam.length > 0;
  const arrangementFields = getDocumentArrangementFields(variant);
  const filledArrangements = getFilledDocumentArrangements(trip, variant);
  const showServices =
    variant === "concierge" && filledArrangements.length > 0;
  const showNotes =
    variant === "concierge" && Boolean(trip.notes?.trim());
  const dayCount = trip.days.length;
  const gridExpanded = dayCount > 0 && !showTeam && !showServices;
  const wideDays = dayCount >= 3 && dayCount <= 5;
  const headerDates = formatHeaderTravelDates(
    trip.arrival_date,
    trip.departure_date
  );
  const showHeaderDates =
    isClientItinerary && Boolean(headerDates.start);

  return (
    <div
      className={`lux-document${gridExpanded ? " lux-document--grid-expanded" : ""}${isClientItinerary ? " lux-document--client lux-document--travel" : " lux-document--preview"}`}
    >
      <header className="lux-header lux-header--travel">
        <div className="lux-logo-wrap">
          <Image
            src={PLANNER_LOGO}
            alt="Chambellan Conciergerie"
            width={320}
            height={420}
            className="lux-logo-unified"
            priority
            unoptimized
          />
        </div>

        <div className="lux-meta lux-meta--travel">
          <div className="lux-meta-left">
            {showHeaderDates ? (
              <div className="lux-header-dates">
                <p className="lux-header-dates-start">{headerDates.start}</p>
                {headerDates.end ? (
                  <>
                    <p className="lux-header-dates-sep" aria-hidden>
                      —
                    </p>
                    <p className="lux-header-dates-end">{headerDates.end}</p>
                  </>
                ) : null}
              </div>
            ) : null}
          </div>
          <div className="lux-meta-center">
            {trip.destination?.trim() ? (
              <h1 className="lux-destination">{trip.destination}</h1>
            ) : null}
            <p className="lux-subtitle">{PLANNER_DOCUMENT_SUBTITLE}</p>
            {!isClientItinerary &&
            (trip.arrival_date || trip.departure_date) ? (
              <p className="lux-dates">
                {formatDateRange(trip.arrival_date, trip.departure_date)}
              </p>
            ) : null}
          </div>
          <div className="lux-meta-right">
            {trip.client_name?.trim() ? (
              <p className="lux-client">{trip.client_name}</p>
            ) : null}
          </div>
        </div>
      </header>

      <div className="lux-print-grid-stage">
        <div className="lux-main">
          {showServices ? (
            <section
              className={`lux-services${filledArrangements.length === 1 ? " lux-services--solo" : ""}`}
            >
              <div className="lux-services-grid">
                {arrangementFields.map((field) => {
                  const value = String(trip[field.tripField] ?? "").trim();
                  if (!value) return null;
                  return (
                    <div key={field.key} className="lux-service-item">
                      <span className="lux-service-label">{field.label}</span>
                      <span className="lux-service-value">{value}</span>
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}

          {dayCount === 0 ? (
            <p className="lux-grid-empty">No programme scheduled.</p>
          ) : isClientItinerary ? (
            <div
              className={`lux-itinerary-days${wideDays ? " lux-itinerary-days--wide" : ""}`}
              style={{ "--lux-days": dayCount } as CSSProperties}
            >
              {trip.days.map((day) => (
                <ClientDayCard key={day.id} day={day} />
              ))}
            </div>
          ) : (
            <div
              className={`lux-days-row${wideDays ? " lux-days-row--wide" : ""}`}
              style={{ "--lux-days": dayCount } as CSSProperties}
            >
              {trip.days.map((day) => (
                <ConciergeDayColumn key={day.id} day={day} />
              ))}
            </div>
          )}
        </div>
      </div>

      {showTeam || showNotes ? (
        <div className="lux-print-concierge-reserved">
          {showTeam ? (
            <section className="lux-team">
              <h2 className="lux-section-label">Concierge Team</h2>
              <div
                className="lux-team-grid"
                style={{ "--team-count": filledTeam.length } as CSSProperties}
              >
                {filledTeam.map((r) => (
                  <div key={r.key} className="lux-team-card">
                    <span className="lux-team-role">{r.label}</span>
                    <span className="lux-team-name">{r.name}</span>
                    {r.phone ? (
                      <span className="lux-team-phone">{r.phone}</span>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {showNotes ? (
            <section className="lux-notes">
              <h2 className="lux-section-label">Notes</h2>
              <p className="lux-notes-text">{trip.notes}</p>
            </section>
          ) : null}
        </div>
      ) : null}

      {isClientItinerary && clientContacts.length > 0 ? (
        <div
          className={[
            "lux-print-stay-reserved",
            clientContacts.length > 4 ? "lux-print-stay-reserved--dense" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <section className="lux-travel-info">
            <h2 className="lux-travel-info-heading">Your Stay</h2>
            <div className="lux-travel-info-grid">
              {clientContacts.map((contact) => (
                <div key={contact.key} className="lux-travel-info-item">
                  <span className="lux-travel-info-label">
                    <span className="lux-travel-info-icon" aria-hidden>
                      {getClientTravelInfoIcon(contact.key)}
                    </span>
                    {contact.label}
                  </span>
                  {contact.name ? (
                    <span className="lux-travel-info-name">{contact.name}</span>
                  ) : null}
                  {contact.phone ? (
                    <span className="lux-travel-info-phone">{contact.phone}</span>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      <footer className="lux-footer">{PLANNER_FOOTER}</footer>
    </div>
  );
}
