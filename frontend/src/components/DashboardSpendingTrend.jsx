// ============================================================
// 1. Load the analytics request and line-chart controls
// ============================================================
import { useEffect, useMemo, useState } from "react";
import { Line, LineChart, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getAnalytics } from "../api/analytics.js";
import { todayISO } from "../utils/dates.js";

const GROUP_OPTIONS = [
  { value: "week", label: "Weekly" },
  { value: "month", label: "Monthly" },
];

function firstDayOfTrailingYear() {
  const date = new Date();
  date.setDate(1);
  date.setMonth(date.getMonth() - 11);
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), "01"].join("-");
}

function formatKobo(value) {
  return `₦${(Number(value || 0) / 100).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function compactKobo(value) {
  return `₦${(Number(value || 0) / 100).toLocaleString("en-NG", {
    notation: "compact",
    maximumFractionDigits: 1,
  })}`;
}

function periodLabel(value, groupBy) {
  const periodDate = new Date(`${value}T12:00:00`);
  return periodDate.toLocaleDateString("en-NG", groupBy === "month"
    ? { month: "short", year: "2-digit" }
    : { day: "numeric", month: "short" });
}

function SpendingTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="analytics-tooltip">
      <strong>{label}</strong>
      <div>Ordinary spending: {formatKobo(payload[0].value)}</div>
    </div>
  );
}

// ============================================================
// 2. Fetch period spending and highlight the backend's peak
// ============================================================
export default function DashboardSpendingTrend() {
  const [groupBy, setGroupBy] = useState("month");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const dateFrom = useMemo(firstDayOfTrailingYear, []);
  const dateTo = useMemo(todayISO, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    getAnalytics({ date_from: dateFrom, date_to: dateTo, group_by: groupBy })
      .then((result) => !cancelled && setData(result))
      .catch((requestError) => !cancelled && setError(requestError.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [dateFrom, dateTo, groupBy]);

  const chartData = useMemo(() => (data?.periods || []).map((period) => ({
    ...period,
    label: periodLabel(period.period_start, groupBy),
  })), [data, groupBy]);
  const peakLabel = data?.highest_spending_period
    ? periodLabel(data.highest_spending_period.period_start, groupBy)
    : "";

  return (
    <section className="card dashboard-trend-card">
      <div className="dashboard-trend-heading">
        <div>
          <h2>Spending trend</h2>
          <p className="muted small">Ordinary spending over the past 12 months. Savings transfers are excluded.</p>
        </div>
        <div className="segmented trend-period-toggle" role="group" aria-label="Spending trend interval">
          {GROUP_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={groupBy === option.value ? "seg active" : "seg"}
              aria-pressed={groupBy === option.value}
              onClick={() => setGroupBy(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {loading && <p className="muted" role="status">Loading spending trend…</p>}
      {error && <div className="alert error" role="alert">{error}</div>}
      {!loading && !error && data?.highest_spending_period && (
        <p className="peak-summary">
          Highest period: <strong>{peakLabel}</strong> · {formatKobo(data.highest_spending_period.expenditure_kobo)}
        </p>
      )}
      {!loading && !error && !data?.highest_spending_period && (
        <p className="muted chart-empty">No ordinary spending recorded in this date range.</p>
      )}

      {!loading && !error && data?.highest_spending_period && (
        <ResponsiveContainer width="100%" height={310}>
          <LineChart data={chartData} margin={{ top: 18, right: 22, bottom: 6, left: 10 }}>
            <XAxis dataKey="label" axisLine={false} tickLine={false} />
            <YAxis tickFormatter={compactKobo} axisLine={false} tickLine={false} width={72} />
            <Tooltip content={<SpendingTooltip />} />
            <Line
              dataKey="expenditure_kobo"
              name="Ordinary spending"
              stroke="#b83a32"
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 6 }}
            />
            <ReferenceDot
              x={peakLabel}
              y={data.highest_spending_period.expenditure_kobo}
              r={6}
              fill="#b83a32"
              stroke="#ffffff"
              strokeWidth={2}
              label={{ value: "Peak", position: "top", fill: "#b83a32", fontSize: 12 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </section>
  );
}
