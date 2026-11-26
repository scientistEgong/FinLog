// ============================================================
// 1. Load chart components, API data, and date controls
// ============================================================
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getAnalytics } from "../api/analytics.js";
import { todayISO } from "../utils/dates.js";

const CHART_COLORS = ["#1f4e79", "#1c7c54", "#b83a32", "#b9770e", "#7656a5", "#258c9b"];
const GROUP_OPTIONS = [
  { value: "week", label: "Weekly" },
  { value: "month", label: "Monthly" },
  { value: "year", label: "Yearly" },
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
  const date = new Date(`${value}T12:00:00`);
  if (groupBy === "year") return String(date.getFullYear());
  return date.toLocaleDateString("en-NG", groupBy === "month"
    ? { month: "short", year: "2-digit" }
    : { day: "numeric", month: "short" });
}

function ChartCard({ title, purpose, children, hasData = true }) {
  return (
    <section className="card analytics-card">
      <h2>{title}</h2>
      <p className="muted small">{purpose}</p>
      {hasData ? children : <p className="empty muted chart-empty">No matching records in this date range.</p>}
    </section>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="analytics-tooltip">
      <strong>{label}</strong>
      {payload.map((item) => (
        <div key={item.dataKey}>
          <span style={{ color: item.color }}>{item.name}: </span>
          {item.dataKey.includes("count") ? item.value : formatKobo(item.value)}
        </div>
      ))}
    </div>
  );
}

// ============================================================
// 2. Fetch one filtered response for all eight analytical views
// ============================================================
export default function Analytics() {
  const [dateFrom, setDateFrom] = useState(firstDayOfTrailingYear);
  const [dateTo, setDateTo] = useState(todayISO);
  const [groupBy, setGroupBy] = useState("month");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  const periods = useMemo(() => (data?.periods || []).map((period) => ({
    ...period,
    label: periodLabel(period.period_start, groupBy),
  })), [data, groupBy]);

  const categoryTrendData = useMemo(() => {
    const categories = [...new Set((data?.category_trends || []).map((item) => item.category_name))];
    return periods.map((period) => {
      const row = { ...period };
      for (const category of categories) {
        row[category] = data.category_trends.find(
          (item) => item.period_start === period.period_start && item.category_name === category,
        )?.amount_kobo || 0;
      }
      return row;
    });
  }, [data, periods]);
  const categoryTrendNames = useMemo(
    () => [...new Set((data?.category_trends || []).map((item) => item.category_name))],
    [data],
  );

  const topSpendingCategories = (data?.spending_by_category || []).slice(0, 10);
  const noTransactions = data && data.periods.every((period) => (
    period.income_kobo === 0 && period.expenditure_kobo === 0 && period.savings_kobo === 0
  ));

  // ============================================================
  // 3. Present the date controls and analytical chart collection
  // ============================================================
  return (
    <>
      <h1>Analytics</h1>
      <p className="muted">Explore income, spending, savings, and transaction patterns.</p>

      <section className="card analytics-controls" aria-label="Analytics filters">
        <label className="field">
          <span>From</span>
          <input
            type="date"
            value={dateFrom}
            max={dateTo}
            required
            onChange={(event) => event.target.value && setDateFrom(event.target.value)}
          />
        </label>
        <label className="field">
          <span>To</span>
          <input
            type="date"
            value={dateTo}
            min={dateFrom}
            required
            onChange={(event) => event.target.value && setDateTo(event.target.value)}
          />
        </label>
        <div className="segmented" role="group" aria-label="Trend interval">
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
      </section>

      {loading && <p className="muted" role="status">Loading analytics…</p>}
      {error && <div className="alert error" role="alert">{error}</div>}
      {!loading && !error && noTransactions && (
        <p className="card empty muted">No transactions were recorded in this date range.</p>
      )}

      {!loading && !error && data && !noTransactions && (
        <div className="analytics-grid">
          <ChartCard
            title="Income, spending, and savings"
            purpose="Compare period income with ordinary expenditure and savings contributions."
          >
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={periods} margin={{ top: 12, right: 16, bottom: 4, left: 8 }}>
                <XAxis dataKey="label" axisLine={false} tickLine={false} />
                <YAxis tickFormatter={compactKobo} axisLine={false} tickLine={false} width={68} />
                <Tooltip content={<ChartTooltip />} />
                <Legend />
                <Line
                  dataKey="income_kobo"
                  name="Income"
                  stroke={CHART_COLORS[1]}
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 5 }}
                />
                <Line
                  dataKey="expenditure_kobo"
                  name="Ordinary spending"
                  stroke={CHART_COLORS[2]}
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 5 }}
                />
                <Line
                  dataKey="savings_kobo"
                  name="Savings set aside"
                  stroke={CHART_COLORS[4]}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="Change in available balance"
            purpose="Income minus ordinary spending and savings set aside; opening balance is excluded."
          >
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={periods} margin={{ top: 12, right: 16, bottom: 4, left: 8 }}>
                <XAxis dataKey="label" axisLine={false} tickLine={false} />
                <YAxis tickFormatter={compactKobo} axisLine={false} tickLine={false} width={68} />
                <Tooltip content={<ChartTooltip />} />
                <Line
                  dataKey="available_change_kobo"
                  name="Available balance change"
                  stroke={CHART_COLORS[0]}
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="Highest spending categories"
            purpose="Rank ordinary expenditure categories from highest to lowest for this date range."
            hasData={topSpendingCategories.length > 0}
          >
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={topSpendingCategories} layout="vertical" margin={{ left: 12, right: 20 }}>
                <XAxis type="number" tickFormatter={compactKobo} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="category_name" width={110} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="amount_kobo" name="Ordinary spending" fill={CHART_COLORS[0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="Spending by category over time"
            purpose="See which of your five largest categories drive changes in ordinary spending."
            hasData={categoryTrendNames.length > 0}
          >
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={categoryTrendData} margin={{ top: 12, right: 16, bottom: 4, left: 8 }}>
                <XAxis dataKey="label" axisLine={false} tickLine={false} />
                <YAxis tickFormatter={compactKobo} axisLine={false} tickLine={false} width={68} />
                <Tooltip content={<ChartTooltip />} />
                <Legend />
                {categoryTrendNames.map((category, index) => (
                  <Line
                    key={category}
                    type="monotone"
                    dataKey={category}
                    stroke={CHART_COLORS[index % CHART_COLORS.length]}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="Savings contributions"
            purpose="Track expenses assigned to savings categories, separately from ordinary expenditure."
            hasData={periods.some((period) => period.savings_kobo > 0)}
          >
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={periods} margin={{ top: 12, right: 16, bottom: 4, left: 8 }}>
                <XAxis dataKey="label" axisLine={false} tickLine={false} />
                <YAxis tickFormatter={compactKobo} axisLine={false} tickLine={false} width={68} />
                <Tooltip content={<ChartTooltip />} />
                <Line
                  dataKey="savings_kobo"
                  name="Savings set aside"
                  stroke={CHART_COLORS[4]}
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="Income sources"
            purpose="Rank income categories by the amount recorded during this date range."
            hasData={data.income_by_category.length > 0}
          >
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.income_by_category} layout="vertical" margin={{ left: 12, right: 20 }}>
                <XAxis type="number" tickFormatter={compactKobo} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="category_name" width={110} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="amount_kobo" name="Income" fill={CHART_COLORS[1]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="Average spending by weekday"
            purpose="Compare ordinary spending per occurrence of each weekday in the selected range."
            hasData={periods.some((period) => period.expenditure_kobo > 0)}
          >
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.spending_by_weekday}>
                <XAxis dataKey="weekday_name" axisLine={false} tickLine={false} />
                <YAxis tickFormatter={compactKobo} axisLine={false} tickLine={false} width={68} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="average_amount_kobo" name="Average ordinary spending" fill={CHART_COLORS[3]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="Purchase frequency and average size"
            purpose="Distinguish periods with many smaller expenses from periods with fewer larger ones."
            hasData={periods.some((period) => period.ordinary_expense_count > 0)}
          >
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={periods} margin={{ top: 12, right: 16, bottom: 4, left: 8 }}>
                <XAxis dataKey="label" axisLine={false} tickLine={false} />
                <YAxis yAxisId="count" allowDecimals={false} axisLine={false} tickLine={false} width={44} />
                <YAxis
                  yAxisId="amount"
                  orientation="right"
                  tickFormatter={compactKobo}
                  axisLine={false}
                  tickLine={false}
                  width={68}
                />
                <Tooltip content={<ChartTooltip />} />
                <Legend />
                <Line
                  yAxisId="count"
                  dataKey="ordinary_expense_count"
                  name="Expense count"
                  stroke={CHART_COLORS[0]}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 5 }}
                />
                <Line
                  yAxisId="amount"
                  dataKey="average_expense_kobo"
                  name="Average expense"
                  stroke={CHART_COLORS[2]}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}
    </>
  );
}
