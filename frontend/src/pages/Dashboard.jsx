// ============================================================
// 1. Load dashboard data, the weekly budget, and chart components
// ============================================================
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { getDashboardSummary } from "../api/dashboard.js";
import DashboardBudgetPanel from "../components/DashboardBudgetPanel.jsx";
import DashboardHero from "../components/DashboardHero.jsx";
import DashboardPeriodSelector from "../components/DashboardPeriodSelector.jsx";
import OpeningBalanceCard from "../components/OpeningBalanceCard.jsx";
import RecentTransactions from "../components/RecentTransactions.jsx";
import useWeeklyBudget from "../hooks/useWeeklyBudget.js";
import { periodRangeForPreset } from "../utils/dates.js";

const DashboardSpendingTrend = lazy(() => import("../components/DashboardSpendingTrend.jsx"));
const IncomeExpenseChart = lazy(() => import("../components/IncomeExpenseChart.jsx"));
const SpendingByCategoryChart = lazy(() => import("../components/SpendingByCategoryChart.jsx"));

// ============================================================
// 2. Coordinate the selected reporting period and all-time position
// ============================================================
export default function Dashboard() {
  const [preset, setPreset] = useState("this-month");
  const [customRange, setCustomRange] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const {
    budget,
    loading: budgetLoading,
    error: budgetError,
    periodStart,
  } = useWeeklyBudget();

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

  // ============================================================
  // 3. Lead with the balance, then this week's budget and movement
  // ============================================================
  // Order follows the approved prototype: position and choices first, then the
  // weekly budget, then analysis, then the raw transaction ledger.
  return (
    <div className="page page-dashboard">
      <h1 className="visually-hidden">Dashboard</h1>

      <DashboardHero
        summary={summary}
        period={period}
        range={range}
        budget={budget}
        loading={loading}
        error={error}
      />

      {error && (
        <div className="alert error" role="alert">
          {error} <button type="button" className="secondary small-btn" onClick={refresh}>Retry</button>
        </div>
      )}

      <div className="dashboard-toolbar">
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
      </div>

      <div className="dashboard-main">
        <div className="dashboard-column">
          <DashboardBudgetPanel
            budget={budget}
            loading={budgetLoading}
            error={budgetError}
            periodStart={periodStart}
          />

          <Suspense fallback={<p className="muted">Loading charts…</p>}>
            <IncomeExpenseChart period={period} loading={loading} error={error} />
            <SpendingByCategoryChart period={period} loading={loading} error={error} />
            <DashboardSpendingTrend />
          </Suspense>

          {!loading && !error && period?.observations?.length > 0 && (
            <section className="card dash-observations">
              <h2>What the numbers say</h2>
              <ul className="observation-list">
                {period.observations.map((observation) => (
                  <li key={observation.code}>{observation.message}</li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <RecentTransactions />
      </div>

      <div className="dashboard-settings">
        <OpeningBalanceCard onSaved={refresh} />
      </div>

      <p className="page-footnote muted small">
        Savings are shown separately from expenditure and remain part of your total wallet.
      </p>
    </div>
  );
}
