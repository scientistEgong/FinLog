// ============================================================
// 1. Build stable local calendar date strings
// ============================================================
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
