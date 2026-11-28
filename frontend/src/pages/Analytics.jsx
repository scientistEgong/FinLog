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
import {
  ANALYTICS_COLORS,
  BudgetComparisonChart,
  ChartCard,
  ChartTooltip,
  SavingsRateChart,
  TopExpensesChart,
} from "../components/AnalyticsCharts.jsx";
import { periodRangeForPreset, REPORTING_PRESETS } from "../utils/dates.js";
import { compactKobo, formatKobo, formatPercent } from "../utils/money.js";

const DEFAULT_PRESET = "this-month";
const DEFAULT_RANGE = periodRangeForPreset(DEFAULT_PRESET);

const GROUP_OPTIONS = [
  { value: "week", label: "Weekly" },
  { value: "month", label: "Monthly" },
  { value: "year", label: "Yearly" },
];

function periodLabel(value, groupBy) {
  const date = new Date(`${value}T12:00:00`);
  if (groupBy === "year") return String(date.getFullYear());
  return date.toLocaleDateString("en-NG", groupBy === "month"
    ? { month: "short", year: "2-digit" }
    : { day: "numeric", month: "short" });
}

// ============================================================
// 2. Fetch one filtered response for every analytical view
// ============================================================
export default function Analytics() {
  const [preset, setPreset] = useState(DEFAULT_PRESET);
  const [dateFrom, setDateFrom] = useState(DEFAULT_RANGE.dateFrom);
  const [dateTo, setDateTo] = useState(DEFAULT_RANGE.dateTo);
  const [groupBy, setGroupBy] = useState("month");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

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
  }, [dateFrom, dateTo, groupBy, refreshKey]);

  function applyPreset(value) {
    const range = periodRangeForPreset(value);
    setPreset(value);
    setDateFrom(range.dateFrom);
    setDateTo(range.dateTo);
  }

  function changeDate(field, value) {
    if (!value) return;
    if (field === "dateFrom" && value > dateTo) return;
    if (field === "dateTo" && value < dateFrom) return;
    setPreset("custom");
    if (field === "dateFrom") setDateFrom(value);
    else setDateTo(value);
  }

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
  const noTransactions = data && (
    data.summary.income_kobo === 0
    && data.summary.expenditure_kobo === 0
    && data.summary.savings_kobo === 0
  );

  // ============================================================
  // 3. Present the controls, summary, and analytical chart collection
  // ============================================================
  return (
    <div className="page page-analytics">
      <h1>Analytics</h1>
      <p className="muted">Explore income, spending, savings, and transaction patterns.</p>

      <section className="card analytics-controls" aria-label="Analytics filters">
        <div className="analytics-preset-control">
          <span className="field-label">Reporting period</span>
          <div className="segmented analytics-preset-toggle" role="group" aria-label="Reporting period preset">
            {REPORTING_PRESETS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={preset === option.value ? "seg active" : "seg"}
                aria-pressed={preset === option.value}
                onClick={() => applyPreset(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
          {preset === "custom" && <p className="muted small">Using a custom date range.</p>}
        </div>
        <label className="field">
          <span>From</span>
          <input
            type="date"
            value={dateFrom}
            max={dateTo}
            required
            onChange={(event) => changeDate("dateFrom", event.target.value)}
          />
        </label>
        <label className="field">
          <span>To</span>
          <input
            type="date"
            value={dateTo}
            min={dateFrom}
            required
            onChange={(event) => changeDate("dateTo", event.target.value)}
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
      {error && (
        <div className="alert error" role="alert">
          {error} <button type="button" className="secondary small-btn" onClick={() => setRefreshKey((key) => key + 1)}>Retry</button>
        </div>
      )}
      {!loading && !error && noTransactions && (
        <p className="card empty muted">No transactions were recorded in this date range.</p>
      )}

      {!loading && !error && data && (
        <>
          {!noTransactions && (
            <>
          <section className="card analytics-summary" aria-label="Selected period totals">
            <div>
              <span>Income</span>
              <strong>{formatKobo(data.summary.income_kobo)}</strong>
            </div>
            <div>
              <span>Ordinary expenditure</span>
              <strong>{formatKobo(data.summary.expenditure_kobo)}</strong>
            </div>
            <div>
              <span>Savings contributions</span>
              <strong>{formatKobo(data.summary.savings_kobo)}</strong>
            </div>
            <div>
              <span>Savings rate</span>
              <strong>{formatPercent(data.summary.savings_rate_percent)}</strong>
            </div>
          </section>

          <div className="analytics-grid">
            <ChartCard
              title="Income, spending, and savings"
              purpose="Compare period income with ordinary expenditure and savings contributions."
              tableData={periods}
              tableColumns={[
                { key: "label", label: "Period" },
                { key: "income_kobo", label: "Income", render: formatKobo },
                { key: "expenditure_kobo", label: "Ordinary spending", render: formatKobo },
                { key: "savings_kobo", label: "Savings", render: formatKobo },
              ]}
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
                    stroke={ANALYTICS_COLORS[1]}
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    dataKey="expenditure_kobo"
                    name="Ordinary spending"
                    stroke={ANALYTICS_COLORS[2]}
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    dataKey="savings_kobo"
                    name="Savings set aside"
                    stroke={ANALYTICS_COLORS[4]}
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
              tableData={periods}
              tableColumns={[
                { key: "label", label: "Period" },
                { key: "available_change_kobo", label: "Available balance change", render: formatKobo },
              ]}
            >
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={periods} margin={{ top: 12, right: 16, bottom: 4, left: 8 }}>
                  <XAxis dataKey="label" axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={compactKobo} axisLine={false} tickLine={false} width={68} />
                  <Tooltip content={<ChartTooltip />} />
                  <Line
                    dataKey="available_change_kobo"
                    name="Available balance change"
                    stroke={ANALYTICS_COLORS[0]}
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <SavingsRateChart periods={periods} />

            <ChartCard
              title="Highest spending categories"
              purpose="Rank ordinary expenditure categories from highest to lowest for this date range."
              hasData={topSpendingCategories.length > 0}
              tableData={topSpendingCategories}
              tableColumns={[
                { key: "category_name", label: "Category" },
                { key: "amount_kobo", label: "Ordinary spending", render: formatKobo },
              ]}
            >
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={topSpendingCategories} layout="vertical" margin={{ left: 12, right: 20 }}>
                  <XAxis type="number" tickFormatter={compactKobo} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="category_name" width={110} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="amount_kobo" name="Ordinary spending" fill={ANALYTICS_COLORS[0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard
              title="Spending by category over time"
              purpose="See which of your five largest categories drive changes in ordinary spending."
              hasData={categoryTrendNames.length > 0}
              tableData={categoryTrendData.map((row) => ({
                ...row,
                ...Object.fromEntries(categoryTrendNames.map((category) => [category, formatKobo(row[category])])),
              }))}
              tableColumns={[
                { key: "label", label: "Period" },
                ...categoryTrendNames.map((category) => ({ key: category, label: category })),
              ]}
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
                      stroke={ANALYTICS_COLORS[index % ANALYTICS_COLORS.length]}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <BudgetComparisonChart rows={data.budget_comparison || []} groupBy={groupBy} />

            <TopExpensesChart expenses={data.top_expenses || []} />

            <ChartCard
              title="Savings contributions"
              purpose="Track expenses assigned to savings categories, separately from ordinary expenditure."
              hasData={periods.some((period) => period.savings_kobo > 0)}
              tableData={periods}
              tableColumns={[
                { key: "label", label: "Period" },
                { key: "savings_kobo", label: "Savings contributions", render: formatKobo },
              ]}
            >
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={periods} margin={{ top: 12, right: 16, bottom: 4, left: 8 }}>
                  <XAxis dataKey="label" axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={compactKobo} axisLine={false} tickLine={false} width={68} />
                  <Tooltip content={<ChartTooltip />} />
                  <Line
                    dataKey="savings_kobo"
                    name="Savings set aside"
                    stroke={ANALYTICS_COLORS[4]}
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
              tableData={data.income_by_category}
              tableColumns={[
                { key: "category_name", label: "Income source" },
                { key: "amount_kobo", label: "Income", render: formatKobo },
              ]}
            >
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.income_by_category} layout="vertical" margin={{ left: 12, right: 20 }}>
                  <XAxis type="number" tickFormatter={compactKobo} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="category_name" width={110} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="amount_kobo" name="Income" fill={ANALYTICS_COLORS[1]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard
              title="Average spending per calendar weekday occurrence"
              purpose="Includes every occurrence of each weekday in the selected range, including days with no spending."
              hasData={periods.some((period) => period.expenditure_kobo > 0)}
              tableData={data.spending_by_weekday}
              tableColumns={[
                { key: "weekday_name", label: "Weekday" },
                { key: "average_amount_kobo", label: "Average per occurrence", render: formatKobo },
              ]}
            >
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.spending_by_weekday}>
                  <XAxis dataKey="weekday_name" axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={compactKobo} axisLine={false} tickLine={false} width={68} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="average_amount_kobo" name="Average ordinary spending" fill={ANALYTICS_COLORS[3]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard
              title="Purchase frequency and average size"
              purpose="Distinguish periods with many smaller expenses from periods with fewer larger ones."
              hasData={periods.some((period) => period.ordinary_expense_count > 0)}
              tableData={periods}
              tableColumns={[
                { key: "label", label: "Period" },
                { key: "ordinary_expense_count", label: "Expense count" },
                { key: "average_expense_kobo", label: "Average expense", render: formatKobo },
              ]}
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
                    stroke={ANALYTICS_COLORS[0]}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    yAxisId="amount"
                    dataKey="average_expense_kobo"
                    name="Average expense"
                    stroke={ANALYTICS_COLORS[2]}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
            </>
          )}
          {noTransactions && (
            <BudgetComparisonChart rows={data.budget_comparison || []} groupBy={groupBy} />
          )}
        </>
      )}
    </div>
  );
}
