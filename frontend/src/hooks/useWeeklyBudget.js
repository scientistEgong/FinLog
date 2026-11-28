// ============================================================
// 1. Load the current canonical week's budget snapshot
// ============================================================
import { useCallback, useEffect, useMemo, useState } from "react";
import { listBudgets } from "../api/budgets.js";
import { periodStartISO, todayISO } from "../utils/dates.js";

// The dashboard shows what is left this week, so it asks the same budget
// endpoint the Budgets page uses. All allocation, spend and remaining values
// stay server-calculated; this hook only carries them to the page.
export default function useWeeklyBudget() {
  const periodStart = useMemo(() => periodStartISO(todayISO(), "week"), []);
  const [budget, setBudget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const reload = useCallback(() => setRefreshKey((key) => key + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    listBudgets({ period_type: "week", period_start: periodStart })
      .then((result) => !cancelled && setBudget(result))
      .catch((requestError) => !cancelled && setError(requestError.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [periodStart, refreshKey]);

  return { budget, loading, error, periodStart, reload };
}
