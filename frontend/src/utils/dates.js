// ============================================================
// 1. Build stable local calendar date strings
// ============================================================
export const REPORTING_PRESETS = [
  { value: "this-week", label: "This week" },
  { value: "this-month", label: "This month" },
  { value: "last-month", label: "Last month" },
  { value: "last-3-months", label: "Last 3 months" },
  { value: "last-6-months", label: "Last 6 months" },
  { value: "this-year", label: "This year" },
];

export function todayISO() {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

// ============================================================
// 2. Convert selected dates to canonical API period boundaries
// ============================================================
export function periodStartISO(dateValue, periodType) {
  const [year, month, day] = dateValue.split("-").map(Number);
  const selectedDate = new Date(year, month - 1, day, 12);

  if (periodType === "week") {
    selectedDate.setDate(selectedDate.getDate() - selectedDate.getDay());
  } else {
    selectedDate.setDate(1);
  }

  const startYear = selectedDate.getFullYear();
  const startMonth = String(selectedDate.getMonth() + 1).padStart(2, "0");
  const startDay = String(selectedDate.getDate()).padStart(2, "0");
  return `${startYear}-${startMonth}-${startDay}`;
}

function toISODate(value) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function periodRangeForPreset(preset, today = new Date()) {
  const current = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12);

  if (preset === "this-week") {
    const start = new Date(current);
    start.setDate(start.getDate() - start.getDay());
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return { dateFrom: toISODate(start), dateTo: toISODate(end) };
  }

  if (preset === "this-month") {
    const start = new Date(current.getFullYear(), current.getMonth(), 1, 12);
    const end = new Date(current.getFullYear(), current.getMonth() + 1, 0, 12);
    return { dateFrom: toISODate(start), dateTo: toISODate(end) };
  }

  if (preset === "last-month") {
    const start = new Date(current.getFullYear(), current.getMonth() - 1, 1, 12);
    const end = new Date(current.getFullYear(), current.getMonth(), 0, 12);
    return { dateFrom: toISODate(start), dateTo: toISODate(end) };
  }

  if (preset === "last-3-months" || preset === "last-6-months") {
    const monthsBack = preset === "last-3-months" ? 2 : 5;
    const start = new Date(current.getFullYear(), current.getMonth() - monthsBack, 1, 12);
    return { dateFrom: toISODate(start), dateTo: toISODate(current) };
  }

  if (preset === "this-year") {
    const start = new Date(current.getFullYear(), 0, 1, 12);
    return { dateFrom: toISODate(start), dateTo: toISODate(current) };
  }

  return periodRangeForPreset("this-month", today);
}
