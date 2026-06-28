export function getYearRange(today = new Date()): {
  start: string;
  end: string;
  label: string;
} {
  const year = today.getFullYear();
  return {
    start: `${year}-01-01`,
    end: `${year}-12-31`,
    label: `${year}`,
  };
}
