import React from "react";
import {
  Document,
  Font,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import path from "path";
import fs from "fs";
import type { Activity, TripWithDays } from "../types";
import { ACTIVITY_TYPE_LABELS } from "../types";
import { LUXURY, PERIOD_ROW_LABELS, PLANNER_PERIODS } from "../planner/constants";
import {
  CONCIERGE_TEAM_FIELDS,
  PLANNER_FOOTER,
  type PlannerExportVariant,
} from "../planner/planner-sheet-model";
import {
  formatDateRangeCompact,
  formatGridDayDate,
  formatGridDayName,
  formatTimeDisplay,
} from "../planner-utils";

Font.register({
  family: "Cormorant",
  fonts: [
    {
      src: path.join(process.cwd(), "public/fonts/cormorant-400.woff"),
      fontWeight: 400,
    },
    {
      src: path.join(process.cwd(), "public/fonts/cormorant-600.woff"),
      fontWeight: 600,
    },
  ],
});

const LABEL_W = 54;
const IVORY = "#fffef9";

const s = StyleSheet.create({
  page: {
    backgroundColor: IVORY,
    padding: 22,
    fontFamily: "Helvetica",
    color: LUXURY.ink,
  },
  header: { alignItems: "center", marginBottom: 8 },
  logoWrap: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 0.5,
    borderColor: LUXURY.beigeDeep,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 5,
  },
  logo: { width: 42, height: 42, objectFit: "contain" },
  brand: {
    fontSize: 5,
    letterSpacing: 2.2,
    color: LUXURY.gold,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  title: {
    fontFamily: "Cormorant",
    fontSize: 17,
    letterSpacing: 1.8,
    color: LUXURY.ink,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderBottomWidth: 0.5,
    borderBottomColor: LUXURY.goldLight,
    paddingBottom: 7,
    marginBottom: 10,
  },
  metaCenter: { flex: 1, alignItems: "center" },
  destination: {
    fontFamily: "Cormorant",
    fontSize: 11.5,
    color: LUXURY.gold,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  dates: {
    fontFamily: "Cormorant",
    fontSize: 8,
    color: LUXURY.goldLight,
    letterSpacing: 0.5,
  },
  clientName: {
    fontFamily: "Cormorant",
    fontSize: 9,
    letterSpacing: 1,
    textTransform: "uppercase",
    textAlign: "right",
    width: 100,
  },
  table: { borderWidth: 0.5, borderColor: LUXURY.beigeDeep, marginBottom: 8 },
  headRow: {
    flexDirection: "row",
    backgroundColor: LUXURY.beige,
    borderBottomWidth: 0.5,
    borderBottomColor: LUXURY.beigeDeep,
  },
  corner: {
    width: LABEL_W,
    borderRightWidth: 0.5,
    borderRightColor: LUXURY.beigeDeep,
  },
  dayHead: {
    flex: 1,
    paddingVertical: 4,
    alignItems: "center",
    borderRightWidth: 0.5,
    borderRightColor: LUXURY.beigeDeep,
  },
  dayHeadLast: { borderRightWidth: 0 },
  dayName: {
    fontFamily: "Cormorant",
    fontSize: 6.5,
    fontWeight: 600,
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  dayDate: {
    fontFamily: "Cormorant",
    fontSize: 7,
    color: LUXURY.gold,
    marginTop: 1,
  },
  bodyRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: LUXURY.beigeDeep,
    minHeight: 44,
  },
  bodyRowLast: { borderBottomWidth: 0 },
  periodLabel: {
    width: LABEL_W,
    padding: 4,
    backgroundColor: LUXURY.cream,
    borderRightWidth: 0.5,
    borderRightColor: LUXURY.beigeDeep,
  },
  periodText: {
    fontSize: 5,
    letterSpacing: 0.7,
    color: LUXURY.gold,
    textTransform: "uppercase",
  },
  eveningMark: { fontSize: 5.5, color: LUXURY.goldLight, marginBottom: 1 },
  cell: {
    flex: 1,
    padding: 3,
    borderRightWidth: 0.5,
    borderRightColor: LUXURY.beigeDeep,
    backgroundColor: IVORY,
  },
  cellLast: { borderRightWidth: 0 },
  cellEmpty: { fontSize: 6, color: LUXURY.faint, fontStyle: "italic" },
  actCard: {
    backgroundColor: LUXURY.cream,
    borderWidth: 0.5,
    borderColor: LUXURY.beigeDeep,
    padding: 3,
    marginBottom: 2,
  },
  actTime: {
    fontFamily: "Cormorant",
    fontSize: 6.5,
    color: LUXURY.gold,
    marginBottom: 1,
  },
  actTitle: {
    fontSize: 5.5,
    fontWeight: 600,
    letterSpacing: 0.25,
    textTransform: "uppercase",
    marginBottom: 0.5,
  },
  actType: {
    fontSize: 4.5,
    color: LUXURY.gold,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  actDetail: { fontSize: 4.5, color: LUXURY.muted, marginTop: 0.5 },
  actAwaiting: {
    fontSize: 4,
    color: LUXURY.goldLight,
    fontStyle: "italic",
    marginTop: 1,
  },
  sectionLabel: {
    fontSize: 5,
    letterSpacing: 1.8,
    color: LUXURY.gold,
    textTransform: "uppercase",
    textAlign: "center",
    marginBottom: 5,
  },
  teamGrid: { flexDirection: "row", gap: 4, marginBottom: 8 },
  teamCard: {
    flex: 1,
    backgroundColor: LUXURY.cream,
    borderWidth: 0.5,
    borderColor: LUXURY.beigeDeep,
    padding: 4,
    alignItems: "center",
  },
  teamRole: {
    fontSize: 4.5,
    letterSpacing: 0.8,
    color: LUXURY.gold,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  teamName: {
    fontFamily: "Cormorant",
    fontSize: 6.5,
    color: LUXURY.ink,
  },
  teamPhone: { fontSize: 5, color: LUXURY.muted, marginTop: 1 },
  notesBox: {
    backgroundColor: LUXURY.cream,
    borderWidth: 0.5,
    borderColor: LUXURY.beigeDeep,
    padding: 5,
    marginBottom: 8,
  },
  notesText: { fontSize: 5.5, color: LUXURY.ink, lineHeight: 1.4 },
  footer: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 0.5,
    borderTopColor: LUXURY.beigeDeep,
    fontSize: 5,
    color: LUXURY.muted,
    textAlign: "center",
    fontStyle: "italic",
    lineHeight: 1.4,
  },
});

function getLogoBase64(): string | null {
  const logoPath = path.join(process.cwd(), "public", "brand", "logo.jpg");
  if (!fs.existsSync(logoPath)) return null;
  return `data:image/jpeg;base64,${fs.readFileSync(logoPath).toString("base64")}`;
}

function PdfActivityCards({ activities }: { activities: Activity[] }) {
  if (!activities.length) {
    return <Text style={s.cellEmpty}>—</Text>;
  }
  return (
    <>
      {activities.map((a) => (
        <View key={a.id} style={s.actCard}>
          {a.time ? (
            <Text style={s.actTime}>{formatTimeDisplay(a.time)}</Text>
          ) : null}
          <Text style={s.actTitle}>{a.title || "—"}</Text>
          <Text style={s.actType}>{ACTIVITY_TYPE_LABELS[a.activity_type]}</Text>
          {a.details ? <Text style={s.actDetail}>{a.details}</Text> : null}
          {a.status === "awaiting" ? (
            <Text style={s.actAwaiting}>Awaiting confirmation</Text>
          ) : null}
        </View>
      ))}
    </>
  );
}

function PlannerPdfPage({
  trip,
  variant,
}: {
  trip: TripWithDays;
  variant: PlannerExportVariant;
}) {
  const logo = getLogoBase64();
  const dayCount = trip.days.length;
  const showTeam = variant === "concierge";

  return (
    <Page size="A4" orientation="landscape" style={s.page}>
      <View style={s.header}>
        {logo ? (
          <View style={s.logoWrap}>
            <Image src={logo} style={s.logo} />
          </View>
        ) : null}
        <Text style={s.brand}>Chambellan Conciergerie</Text>
        <Text style={s.title}>Weekly Planner</Text>
      </View>

      <View style={s.metaRow}>
        <View style={{ width: 80 }} />
        <View style={s.metaCenter}>
          <Text style={s.destination}>
            {trip.destination || "Destination"}
          </Text>
          <Text style={s.dates}>
            {formatDateRangeCompact(trip.arrival_date, trip.departure_date)}
          </Text>
        </View>
        <Text style={s.clientName}>{trip.client_name || "Client"}</Text>
      </View>

      {dayCount > 0 ? (
        <View style={s.table}>
          <View style={s.headRow}>
            <View style={s.corner} />
            {trip.days.map((day, i) => (
              <View
                key={day.id}
                style={[s.dayHead, i === dayCount - 1 ? s.dayHeadLast : {}]}
              >
                <Text style={s.dayName}>{formatGridDayName(day.date)}</Text>
                <Text style={s.dayDate}>{formatGridDayDate(day.date)}</Text>
              </View>
            ))}
          </View>
          {PLANNER_PERIODS.map((period, pi) => (
            <View
              key={period}
              style={[
                s.bodyRow,
                pi === PLANNER_PERIODS.length - 1 ? s.bodyRowLast : {},
              ]}
            >
              <View style={s.periodLabel}>
                {period === "evening" ? (
                  <Text style={s.eveningMark}>☽</Text>
                ) : null}
                <Text style={s.periodText}>{PERIOD_ROW_LABELS[period]}</Text>
              </View>
              {trip.days.map((day, di) => {
                const acts = day.activities.filter((a) => a.period === period);
                return (
                  <View
                    key={`${day.id}-${period}`}
                    style={[s.cell, di === dayCount - 1 ? s.cellLast : {}]}
                  >
                    <PdfActivityCards activities={acts} />
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      ) : null}

      {showTeam ? (
        <View>
          <Text style={s.sectionLabel}>Concierge Team</Text>
          <View style={s.teamGrid}>
            {CONCIERGE_TEAM_FIELDS.map((row) => (
              <View key={row.key} style={s.teamCard}>
                <Text style={s.teamRole}>{row.label}</Text>
                <Text style={s.teamName}>
                  {String(trip[row.nameField] || "—")}
                </Text>
                {row.phoneField && trip[row.phoneField] ? (
                  <Text style={s.teamPhone}>
                    {String(trip[row.phoneField])}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {trip.notes ? (
        <View>
          <Text style={s.sectionLabel}>Notes</Text>
          <View style={s.notesBox}>
            <Text style={s.notesText}>{trip.notes}</Text>
          </View>
        </View>
      ) : null}

      <Text style={s.footer}>{PLANNER_FOOTER}</Text>
    </Page>
  );
}

export async function generatePlannerPdf(
  trip: TripWithDays,
  mode: PlannerExportVariant
): Promise<Buffer> {
  return renderToBuffer(
    <Document>
      <PlannerPdfPage trip={trip} variant={mode} />
    </Document>
  );
}
