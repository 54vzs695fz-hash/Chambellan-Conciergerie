export function resolveReferenceDate(
  departureDate: string,
  closedAt: string
): string {
  const departure = departureDate.trim();
  if (departure) return departure;
  if (!closedAt) return "";
  return closedAt.slice(0, 10);
}

export function isDateWithinRange(
  date: string,
  range: { start: string; end: string }
): boolean {
  const value = date.trim();
  if (!value) return false;
  return value >= range.start && value <= range.end;
}

export function formatMoney(amount: number): string {
  return `€${amount.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}
