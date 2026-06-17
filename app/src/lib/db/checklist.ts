import { prisma } from "@/lib/prisma";
import {
  CHECKLIST_CATEGORY_ORDER,
  DEFAULT_CHECKLIST_ITEMS,
} from "@/lib/planner/checklist-defaults";
import type {
  ChecklistCategory,
  ChecklistItem,
  ChecklistItemStatus,
  PendingChecklistItem,
} from "@/lib/types";
import type { TripChecklistItem as PrismaChecklistItem } from "@/generated/prisma/client";
import { toIsoDate, startOfDay } from "@/lib/calendar/programmes";
import type { ActivityType } from "@/lib/types";
import type { TripProgrammeContext } from "@/lib/dashboard/checklist-follow-up-eligibility";

function mapChecklistItem(row: PrismaChecklistItem): ChecklistItem {
  return {
    id: row.id,
    trip_id: row.trip_id,
    category: row.category as ChecklistCategory,
    title: row.title,
    status: row.status as ChecklistItemStatus,
    notes: row.notes,
    due_date: row.due_date,
    reminder_date: row.reminder_date,
    sort_order: row.sort_order,
  };
}

export async function listChecklistItems(
  tripId: number
): Promise<ChecklistItem[]> {
  const rows = await prisma.tripChecklistItem.findMany({
    where: { trip_id: tripId },
    orderBy: [{ category: "asc" }, { sort_order: "asc" }, { id: "asc" }],
  });
  return rows.map(mapChecklistItem);
}

export async function ensureChecklistSeeded(tripId: number): Promise<void> {
  const count = await prisma.tripChecklistItem.count({
    where: { trip_id: tripId },
  });
  if (count > 0) return;

  const data: {
    trip_id: number;
    category: string;
    title: string;
    sort_order: number;
  }[] = [];

  for (const category of CHECKLIST_CATEGORY_ORDER) {
    DEFAULT_CHECKLIST_ITEMS[category].forEach((title, index) => {
      data.push({ trip_id: tripId, category, title, sort_order: index });
    });
  }

  await prisma.tripChecklistItem.createMany({ data });
}

export async function addChecklistItem(
  tripId: number,
  category: ChecklistCategory,
  title = "New item"
): Promise<ChecklistItem> {
  const maxOrder = await prisma.tripChecklistItem.aggregate({
    where: { trip_id: tripId, category },
    _max: { sort_order: true },
  });
  const sortOrder = (maxOrder._max.sort_order ?? -1) + 1;
  const row = await prisma.tripChecklistItem.create({
    data: { trip_id: tripId, category, title, sort_order: sortOrder },
  });
  return mapChecklistItem(row);
}

export async function updateChecklistItem(
  id: number,
  fields: Partial<
    Pick<
      ChecklistItem,
      | "category"
      | "title"
      | "status"
      | "notes"
      | "due_date"
      | "reminder_date"
      | "sort_order"
    >
  >
): Promise<ChecklistItem | undefined> {
  try {
    const row = await prisma.tripChecklistItem.update({
      where: { id },
      data: fields,
    });
    return mapChecklistItem(row);
  } catch {
    return undefined;
  }
}

export async function deleteChecklistItem(id: number): Promise<boolean> {
  try {
    await prisma.tripChecklistItem.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

export async function copyChecklistItems(
  sourceTripId: number,
  targetTripId: number
): Promise<void> {
  const items = await listChecklistItems(sourceTripId);
  if (!items.length) {
    await ensureChecklistSeeded(targetTripId);
    return;
  }
  await prisma.tripChecklistItem.createMany({
    data: items.map((item) => ({
      trip_id: targetTripId,
      category: item.category,
      title: item.title,
      status: item.status,
      notes: item.notes,
      due_date: item.due_date,
      reminder_date: item.reminder_date,
      sort_order: item.sort_order,
    })),
  });
}

function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return toIsoDate(d);
}

function isActiveProgramme(
  arrivalDate: string,
  departureDate: string,
  todayStr: string
): boolean {
  if (departureDate && departureDate < todayStr) return false;
  if (arrivalDate && arrivalDate > todayStr) return true;
  return true;
}

function itemPriority(
  item: ChecklistItem,
  todayStr: string,
  arrivalDate: string
): number {
  if (item.reminder_date && item.reminder_date <= todayStr) return 0;
  if (item.due_date && item.due_date < todayStr) return 1;
  if (item.due_date && item.due_date === todayStr) return 2;
  if (item.due_date && item.due_date <= addDaysIso(todayStr, 3)) return 3;
  if (item.status === "in_progress") return 4;
  if (item.due_date && item.due_date <= addDaysIso(todayStr, 7)) return 5;
  if (
    item.status === "todo" &&
    arrivalDate &&
    arrivalDate <= addDaysIso(todayStr, 7)
  ) {
    return 6;
  }
  return 99;
}

function isImportantPending(
  item: ChecklistItem,
  todayStr: string,
  arrivalDate: string,
  departureDate: string
): boolean {
  if (item.status === "done") return false;
  if (!isActiveProgramme(arrivalDate, departureDate, todayStr)) return false;

  if (item.reminder_date && item.reminder_date <= todayStr) return true;
  if (item.due_date && item.due_date <= addDaysIso(todayStr, 7)) return true;
  if (item.status === "in_progress") return true;
  if (
    item.status === "todo" &&
    arrivalDate &&
    arrivalDate <= addDaysIso(todayStr, 14)
  ) {
    return true;
  }
  return false;
}

export async function listPendingChecklistItems(
  today = startOfDay(new Date())
): Promise<PendingChecklistItem[]> {
  const todayStr = toIsoDate(today);
  const rows = await prisma.tripChecklistItem.findMany({
    where: { status: { not: "done" } },
    include: {
      trip: {
        select: {
          id: true,
          client_name: true,
          destination: true,
          arrival_date: true,
          departure_date: true,
        },
      },
    },
    orderBy: [{ trip_id: "asc" }, { sort_order: "asc" }],
  });

  const pending = rows
    .map((row) => {
      const item = mapChecklistItem(row);
      const { trip } = row;
      if (
        !isImportantPending(
          item,
          todayStr,
          trip.arrival_date,
          trip.departure_date
        )
      ) {
        return null;
      }
      return {
        ...item,
        client_name: trip.client_name,
        destination: trip.destination,
        arrival_date: trip.arrival_date,
        departure_date: trip.departure_date,
        planner_href: `/planner/${trip.id}`,
      } satisfies PendingChecklistItem;
    })
    .filter(Boolean) as PendingChecklistItem[];

  pending.sort((a, b) => {
    const pa = itemPriority(a, todayStr, a.arrival_date);
    const pb = itemPriority(b, todayStr, b.arrival_date);
    if (pa !== pb) return pa - pb;
    return a.due_date.localeCompare(b.due_date) || a.title.localeCompare(b.title);
  });

  return pending.slice(0, 30);
}

export async function listOpenChecklistItems(): Promise<ChecklistItem[]> {
  const rows = await prisma.tripChecklistItem.findMany({
    where: { status: { not: "done" } },
    orderBy: [{ trip_id: "asc" }, { sort_order: "asc" }, { id: "asc" }],
  });
  return rows.map(mapChecklistItem);
}

async function listTripProgrammeContextByTripId(): Promise<
  Map<number, TripProgrammeContext>
> {
  const rows = await prisma.activity.findMany({
    select: {
      activity_type: true,
      trip_day: { select: { trip_id: true } },
    },
  });

  const map = new Map<number, TripProgrammeContext>();

  for (const row of rows) {
    const tripId = row.trip_day.trip_id;
    let context = map.get(tripId);
    if (!context) {
      context = { activityTypes: new Set<ActivityType>(), transferCount: 0 };
      map.set(tripId, context);
    }
    const activityType = row.activity_type as ActivityType;
    context.activityTypes.add(activityType);
    if (activityType === "transfer") {
      context.transferCount += 1;
    }
  }

  return map;
}

export async function listDashboardFollowUpItems() {
  const { buildDashboardFollowUpSummary } = await import(
    "@/lib/dashboard/follow-up-summary"
  );
  const { listTrips } = await import("@/lib/db/trips");
  const [trips, checklistItems, programmeContextByTripId] = await Promise.all([
    listTrips(),
    listOpenChecklistItems(),
    listTripProgrammeContextByTripId(),
  ]);
  return buildDashboardFollowUpSummary(
    trips,
    checklistItems,
    programmeContextByTripId
  );
}
