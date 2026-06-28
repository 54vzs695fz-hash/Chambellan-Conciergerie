"use client";

import type { CSSProperties } from "react";
import { useLayoutEffect, useRef } from "react";
import Image from "next/image";
import type { Activity, TripDay, TripWithDays } from "@/lib/types";
import {
  getFilledConciergeTeam,
  getDocumentArrangementFields,
  getFilledDocumentArrangements,
  formatClientGuestCount,
  getClientItineraryContacts,
  getClientTravelInfoIcon,
  PLANNER_FOOTER,
  PLANNER_BRAND_LOGO,
  PLANNER_DOCUMENT_SUBTITLE,
  type PlannerExportVariant,
} from "@/lib/planner/planner-sheet-model";
import { GuestNameDisplay } from "@/components/planner/GuestNameDisplay";
import {
  applyPlannerHeaderFit,
} from "@/lib/planner/fit-planner-header";
import {
  activityHasDisplayContent,
  getBeachClubDisplayEntries,
  isBeachClubActivity,
} from "@/lib/planner/beach-club";
import {
  dayDestinationLabelMap,
  resolveAutoPlannerDestinationHeader,
} from "@/lib/planner/itinerary-destinations";
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
  sortActivitiesForSection,
  sortLuxuryItineraryActivities,
  sortSectionsByItineraryOrder,
} from "@/lib/planner-utils";
import { getVisibleSections } from "@/lib/planner/day-sections";

const PLANNER_LOGO = PLANNER_BRAND_LOGO;

export interface PlannerLuxuryDocumentProps {
  trip: TripWithDays;
  variant?: PlannerExportVariant;
}

function activityHasVisibleContent(activity: Activity): boolean {
  return activityHasDisplayContent(activity);
}

function BeachClubSchedule({ activity }: { activity: Activity }) {
  const entries = getBeachClubDisplayEntries(activity);
  if (entries.length === 0) return null;

  return (
    <div className="lux-beach-club-schedule">
      {entries.map((entry) => (
        <div key={entry.part} className="lux-beach-club-entry">
          <span className="lux-beach-club-part">
            <span className="lux-beach-club-part-icon" aria-hidden>
              {entry.icon}
            </span>
            {entry.label}
          </span>
          {entry.time ? (
            <time className="lux-beach-club-time">
              {formatTimeDisplay(entry.time)}
            </time>
          ) : null}
        </div>
      ))}
    </div>
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
  if (!activityHasVisibleContent(activity)) return null;

  const detail = activity.details?.trim() || "";
  const showDetail = detail && !isGenericActivityNote(detail);
  const category = getLuxuryCategoryDisplay(sectionLabel);
  const beachClub = isBeachClubActivity(activity);
  const beachEntries = beachClub ? getBeachClubDisplayEntries(activity) : [];

  return (
    <article className="lux-travel-card">
      {!beachClub && activity.time ? (
        <time className="lux-travel-time">
          {formatTimeDisplay(activity.time)}
        </time>
      ) : null}
      {activity.title?.trim() ? (
        <LuxuryVenueName name={activity.title.trim()} />
      ) : null}
      {beachClub ? <BeachClubSchedule activity={activity} /> : null}
      {!beachClub && category.label ? (
        <span className="lux-travel-category">
          {category.icon ? (
            <span className="lux-travel-category-icon" aria-hidden>
              {category.icon}
            </span>
          ) : null}
          {category.label}
        </span>
      ) : null}
      {beachClub && beachEntries.length === 0 && category.label ? (
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

function DayDestinationLabel({ label }: { label: string }) {
  return <p className="lux-day-destination-label">{label}</p>;
}

function ClientDayCard({
  day,
  destinationLabel,
}: {
  day: TripDay;
  destinationLabel?: string;
}) {
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
    sortActivitiesForSection(
      day.activities.filter(
        (a) =>
          a.period === section.id &&
          (a.time || a.title?.trim() || a.details?.trim())
      ),
      section.id,
      section.label
    ).map((activity) => ({
      activity,
      sectionLabel: section.label,
      sectionId: section.id,
    }))
  );

  if (items.length === 0) return null;

  const periodGroups = groupActivitiesByLuxuryPeriod(items);
  for (const period of LUXURY_DISPLAY_PERIOD_ORDER) {
    periodGroups.set(
      period,
      sortLuxuryItineraryActivities(periodGroups.get(period) ?? [], period)
    );
  }
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
        {destinationLabel ? (
          <DayDestinationLabel label={destinationLabel} />
        ) : null}
      </header>
      {splitTimeline ? (
        <div
          className="lux-day-card-body lux-day-card-body--timeline"
          data-lux-timeline
        >
          <div className="lux-timeline-zone lux-timeline-zone--upper">
            <ClientPeriodBlock period="afternoon" periodItems={afternoonItems} />
          </div>
          <div className="lux-timeline-zone lux-timeline-zone--middle" aria-hidden="true" />
          <div className="lux-timeline-zone lux-timeline-zone--lower">
            <ClientPeriodBlock period="evening" periodItems={eveningItems} />
          </div>
        </div>
      ) : (
        <div className="lux-day-card-body lux-day-card-body--centered">
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
  if (!activityHasVisibleContent(activity)) return null;

  const detail = activity.details?.trim() || "";
  const showDetail = detail && !/^confirmed$/i.test(detail);
  const beachClub = isBeachClubActivity(activity);

  return (
    <div className="lux-activity-card lux-activity-card--itinerary">
      {!beachClub && activity.time ? (
        <span className="lux-activity-time">
          {formatTimeDisplay(activity.time)}
        </span>
      ) : null}
      {activity.title?.trim() ? (
        <p className="lux-activity-venue">{activity.title}</p>
      ) : null}
      {beachClub ? <BeachClubSchedule activity={activity} /> : null}
      {!beachClub && sectionLabel?.trim() ? (
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

function ConciergeDayColumn({
  day,
  destinationLabel,
}: {
  day: TripDay;
  destinationLabel?: string;
}) {
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

  const sectionActs = (sectionId: string, sectionLabel: string) =>
    sortActivitiesForSection(
      day.activities.filter(
        (a) =>
          a.period === sectionId &&
          (a.time || a.title?.trim() || a.details?.trim())
      ),
      sectionId,
      sectionLabel
    );

  return (
    <div className={`lux-day-column${sparseDay ? " lux-day-column--sparse" : ""}`}>
      <div className="lux-day-column-head">
        <span className="lux-day-name">{formatGridDayName(day.date)}</span>
        <span className="lux-day-date">{formatGridDayDate(day.date)}</span>
        {destinationLabel ? (
          <DayDestinationLabel label={destinationLabel} />
        ) : null}
      </div>

      <div className={`lux-day-section${splitTimeline ? " lux-day-section--timeline" : ""}`}>
        {splitTimeline ? (
          <div className="lux-section-body lux-section-body--timeline" data-lux-timeline>
            <div className="lux-timeline-zone lux-timeline-zone--upper">
              {afternoonSection ? (
                <ConciergeSectionBlock
                  section={afternoonSection}
                  acts={sectionActs(afternoonSection.id, afternoonSection.label)}
                />
              ) : null}
            </div>
            <div className="lux-timeline-zone lux-timeline-zone--middle">
              {middleSections.map((section) => (
                <ConciergeSectionBlock
                  key={section.id}
                  section={section}
                  acts={sectionActs(section.id, section.label)}
                />
              ))}
            </div>
            <div className="lux-timeline-zone lux-timeline-zone--lower">
              {eveningSection ? (
                <ConciergeSectionBlock
                  section={eveningSection}
                  acts={sectionActs(eveningSection.id, eveningSection.label)}
                />
              ) : null}
            </div>
          </div>
        ) : (
          <div className="lux-section-body lux-section-body--centered">
            {orderedSections.map((section) => (
              <ConciergeSectionBlock
                key={section.id}
                section={section}
                acts={sectionActs(section.id, section.label)}
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
  const stayContacts = getClientItineraryContacts(trip);
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
  const clientGuestCount = formatClientGuestCount(trip.tailored_for);
  const showClientIdentity =
    Boolean(trip.client_name?.trim()) || Boolean(clientGuestCount);
  const destinationHeader = resolveAutoPlannerDestinationHeader(trip);
  const dayDestinationLabels = dayDestinationLabelMap(trip.days);
  const metaRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const meta = metaRef.current;
    if (!meta) return;

    const runFit = () => applyPlannerHeaderFit(meta);
    runFit();

    const observer = new ResizeObserver(() => runFit());
    observer.observe(meta);
    const left = meta.querySelector(".lux-meta-left");
    const right = meta.querySelector(".lux-meta-right");
    const center = meta.querySelector(".lux-meta-center");
    if (left) observer.observe(left);
    if (right) observer.observe(right);
    if (center) observer.observe(center);

    document.fonts?.ready.then(runFit).catch(() => runFit());

    return () => observer.disconnect();
  }, [
    trip.client_name,
    trip.tailored_for,
    trip.arrival_date,
    trip.departure_date,
    trip.days,
    destinationHeader.mainTitle,
    destinationHeader.subtitle,
    variant,
    showHeaderDates,
    showClientIdentity,
  ]);

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

        <div ref={metaRef} className="lux-meta lux-meta--travel">
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
            {destinationHeader.mainTitle ? (
              <h1 className="lux-destination">{destinationHeader.mainTitle}</h1>
            ) : null}
            {destinationHeader.subtitle ? (
              <p className="lux-destination-sub">{destinationHeader.subtitle}</p>
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
            {showClientIdentity ? (
              <div className="lux-client-identity">
                {trip.client_name?.trim() ? (
                  <GuestNameDisplay name={trip.client_name} />
                ) : null}
                {clientGuestCount ? (
                  <p className="lux-client-guests">{clientGuestCount}</p>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <div className="lux-print-body">
        <div className="lux-print-planner-block">
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
                    <ClientDayCard
                      key={day.id}
                      day={day}
                      destinationLabel={dayDestinationLabels.get(day.id)}
                    />
                  ))}
                </div>
              ) : (
                <div
                  className={`lux-days-row${wideDays ? " lux-days-row--wide" : ""}`}
                  style={{ "--lux-days": dayCount } as CSSProperties}
                >
                  {trip.days.map((day) => (
                    <ConciergeDayColumn
                      key={day.id}
                      day={day}
                      destinationLabel={dayDestinationLabels.get(day.id)}
                    />
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

          {stayContacts.length > 0 ? (
            <div
              className={[
                "lux-print-stay-reserved",
                stayContacts.length > 4 ? "lux-print-stay-reserved--dense" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <section className="lux-travel-info">
                <h2 className="lux-travel-info-heading">Your Stay</h2>
                <div className="lux-travel-info-grid">
                  {stayContacts.map((contact) => (
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
                      {contact.detail ? (
                        <span className="lux-travel-info-phone">{contact.detail}</span>
                      ) : null}
                    </div>
                  ))}
                </div>
              </section>
            </div>
          ) : null}
        </div>
      </div>

      <footer className="lux-footer">{PLANNER_FOOTER}</footer>
    </div>
  );
}
