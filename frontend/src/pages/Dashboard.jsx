import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { getDashboardSummary } from "../api/dashboard.js";
import DashboardPeriodSelector from "../components/DashboardPeriodSelector.jsx";
import DashboardSummaryCards from "../components/DashboardSummaryCards.jsx";
import OpeningBalanceCard from "../components/OpeningBalanceCard.jsx";
import RecentTransactions from "../components/RecentTransactions.jsx";
import { periodRangeForPreset } from "../utils/dates.js";

const DashboardSpendingTrend = lazy(() => import("../components/DashboardSpendingTrend.jsx"));
const IncomeExpenseChart = lazy(() => import("../components/IncomeExpenseChart.jsx"));
const SpendingByCategoryChart = lazy(() => import("../components/SpendingByCategoryChart.jsx"));

export default function Dashboard() {
  const [preset, setPreset] = useState("this-month");
  const [customRange, setCustomRange] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const range = useMemo(
    () => customRange || periodRangeForPreset(preset),
    [customRange, preset],
  );
  const period = summary?.period || null;

  const refresh = useCallback(() => setRefreshKey((key) => key + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    setSummary(null);
    getDashboardSummary({ date_from: range.dateFrom, date_to: range.dateTo })
      .then((data) => !cancelled && setSummary(data))
      .catch((requestError) => !cancelled && setError(requestError.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [refreshKey, range.dateFrom, range.dateTo]);

  return (
    <>
      <h1>Dashboard</h1>
      <p className="muted">Current position, selected-period activity, and recent financial movements.</p>

      <OpeningBalanceCard onSaved={refresh} />

      <DashboardPeriodSelector
        preset={preset}
        range={range}
        onPresetChange={(nextPreset) => {
          setPreset(nextPreset);
          setCustomRange(null);
        }}
        onCustomChange={(nextRange) => {
          setPreset("custom");
          setCustomRange(nextRange);
        }}
      />

      <DashboardSummaryCards summary={summary} loading={loading} error={error} range={range} />

      {error && (
        <div className="alert error" role="alert">
          {error} <button type="button" className="secondary small-btn" onClick={refresh}>Retry</button>
        </div>
      )}

      <Suspense fallback={<p className="muted">Loading charts…</p>}>
        <IncomeExpenseChart period={period} loading={loading} error={error} />
        <SpendingByCategoryChart period={period} loading={loading} error={error} />
        <DashboardSpendingTrend />
      </Suspense>

      {!loading && !error && period?.observations?.length > 0 && (
        <section className="card">
          <h2>Financial observations</h2>
          <ul className="observation-list">
            {period.observations.map((observation) => (
              <li key={observation.code}>{observation.message}</li>
            ))}
          </ul>
        </section>
      )}

      <RecentTransactions />

      <p className="muted small">
        Savings are shown separately from expenditure and remain part of your total wallet.
      </p>
    </>
  );
}
