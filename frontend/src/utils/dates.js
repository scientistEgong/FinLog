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

// ============================================================
// 3. Describe a selected range with one readable label
// ============================================================
// Noon parsing avoids the day shifting when the browser is west of UTC.
export function formatDateRange(dateFrom, dateTo) {
  const from = new Date(`${dateFrom}T12:00:00`);
  const to = new Date(`${dateTo}T12:00:00`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return `${dateFrom} to ${dateTo}`;

  const sameMonth = from.getMonth() === to.getMonth() && from.getFullYear() === to.getFullYear();
  if (sameMonth) {
    const month = to.toLocaleDateString("en-NG", { month: "short" });
    return `${from.getDate()}–${to.getDate()} ${month} ${to.getFullYear()}`;
  }

  const fromLabel = from.toLocaleDateString("en-NG", { day: "numeric", month: "short" });
  const toLabel = to.toLocaleDateString("en-NG", { day: "numeric", month: "short" });
  return `${fromLabel} – ${toLabel} ${to.getFullYear()}`;
}

// ============================================================
// 4. Human-readable dates for lists and period captions
// ============================================================
// Stored and API dates stay ISO; only presentation changes. Parsing at noon
// keeps the calendar day stable in every timezone.
export function formatDisplayDate(isoDate) {
  if (!isoDate) return "";
  const date = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}

export function formatPeriodLabel(periodType, periodStart) {
  if (!periodStart) return "";
  const start = new Date(`${periodStart}T12:00:00`);
  if (Number.isNaN(start.getTime())) return periodStart;

  if (periodType === "month") {
    return start.toLocaleDateString("en-NG", { month: "long", year: "numeric" });
  }

  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const startLabel = start.toLocaleDateString("en-NG", { day: "numeric", month: "short" });
  const endLabel = end.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
  return `${startLabel} – ${endLabel}`;
}
