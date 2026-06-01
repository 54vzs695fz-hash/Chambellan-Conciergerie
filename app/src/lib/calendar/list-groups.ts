import {
  addDays,
  isThisWeek,
  startOfDay,
  startOfWeekMonday,
  toIsoDate,
  type CalendarProgramme,
} from "@/lib/calendar/programmes";

export type ListGroupKey =
  | "upcoming"
  | "in_stay"
  | "this_week"
  | "next_week"
  | "completed";

export interface ListGroup {
  key: ListGroupKey;
  label: string;
  programmes: CalendarProgramme[];
}

export const LIST_GROUP_LABELS: Record<ListGroupKey, string> = {
  upcoming: "Upcoming arrivals",
  in_stay: "Currently in stay",
  this_week: "This week",
  next_week: "Next week",
  completed: "Completed",
};

export const LIST_GROUP_ORDER: ListGroupKey[] = [
  "in_stay",
  "upcoming",
  "this_week",
  "next_week",
  "completed",
];

function isNextWeek(
  programme: CalendarProgramme,
  today = startOfDay(new Date())
): boolean {
  const nextWeekStart = addDays(startOfWeekMonday(today), 7);
  const nextWeekEnd = addDays(nextWeekStart, 6);
  const weekStart = toIsoDate(nextWeekStart);
  const weekEnd = toIsoDate(nextWeekEnd);
  if (!programme.arrivalDate || !programme.departureDate) return false;
  return (
    programme.departureDate >= weekStart && programme.arrivalDate <= weekEnd
  );
}

function isCompleted(
  programme: CalendarProgramme,
  todayStr: string
): boolean {
  return programme.departureDate < todayStr;
}

function isInStay(programme: CalendarProgramme, todayStr: string): boolean {
  return (
    programme.arrivalDate <= todayStr && programme.departureDate >= todayStr
  );
}

function isUpcomingArrival(
  programme: CalendarProgramme,
  todayStr: string
): boolean {
  return programme.arrivalDate > todayStr;
}

export function belongsToListGroup(
  programme: CalendarProgramme,
  key: ListGroupKey,
  today = startOfDay(new Date())
): boolean {
  const todayStr = toIsoDate(today);
  switch (key) {
    case "completed":
      return isCompleted(programme, todayStr);
    case "in_stay":
      return isInStay(programme, todayStr);
    case "upcoming":
      return isUpcomingArrival(programme, todayStr);
    case "this_week":
      return isThisWeek(programme, today) && !isCompleted(programme, todayStr);
    case "next_week":
      return isNextWeek(programme, today) && !isCompleted(programme, todayStr);
    default:
      return false;
  }
}

export function groupProgrammesForList(
  programmes: CalendarProgramme[],
  today = startOfDay(new Date())
): ListGroup[] {
  const sortByArrival = (a: CalendarProgramme, b: CalendarProgramme) =>
    a.arrivalDate.localeCompare(b.arrivalDate);

  return LIST_GROUP_ORDER.map((key) => ({
    key,
    label: LIST_GROUP_LABELS[key],
    programmes: programmes
      .filter((p) => belongsToListGroup(p, key, today))
      .sort(sortByArrival),
  })).filter((group) => group.programmes.length > 0);
}

export function groupProgrammesByDay(
  weekDays: Date[],
  programmes: CalendarProgramme[]
): { iso: string; date: Date; programmes: CalendarProgramme[] }[] {
  return weekDays.map((date) => {
    const iso = toIsoDate(date);
    const dayProgrammes = programmes
      .filter((p) => iso >= p.arrivalDate && iso <= p.departureDate)
      .sort((a, b) => a.clientName.localeCompare(b.clientName));
    return { iso, date, programmes: dayProgrammes };
  });
}
