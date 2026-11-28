// ============================================================
// 1. Shared chart presentation for the Analytics page
// ============================================================
import { useState } from "react";
import { Link } from "react-router-dom";
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
import { compactKobo, formatKobo, formatPercent } from "../utils/money.js";

export const ANALYTICS_COLORS = [
  "#1f4e79",
  "#1c7c54",
  "#b83a32",
  "#b9770e",
  "#7656a5",
  "#258c9b",
];

const PERCENT_FIELDS = new Set([
  "savings_rate_percent",
  "percentage_of_total",
  "utilization_percent",
  "change_from_previous_period_percent",
]);

export function ChartCard({
  title,
  purpose,
  children,
  hasData = true,
  emptyMessage = "No matching records in this date range.",
  tableData = [],
  tableColumns = [],
}) {
  const [showTable, setShowTable] = useState(false);

  return (
    <section className="card analytics-card">
      <h2>{title}</h2>
      <p className="muted small">{purpose}</p>
      {tableColumns.length > 0 && hasData && (
        <button
          type="button"
          className="secondary small-btn chart-view-toggle"
          aria-pressed={showTable}
          onClick={() => setShowTable((visible) => !visible)}
        >
          {showTable ? "View chart" : "View as table"}
        </button>
      )}
      {!hasData ? <p className="empty muted chart-empty">{emptyMessage}</p> : showTable ? (
        <div className="chart-table-wrap">
          <table className="chart-data-table">
            <thead><tr>{tableColumns.map((column) => <th key={column.key}>{column.label}</th>)}</tr></thead>
            <tbody>
              {tableData.map((row, index) => (
                <tr key={row.id ?? `${row.period_start ?? row.label ?? "row"}-${index}`}>
                  {tableColumns.map((column) => (
                    <td key={column.key} data-label={column.label}>
                      {column.render ? column.render(row[column.key], row) : row[column.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : children}
    </section>
  );
}

function tooltipValue(item) {
  if (PERCENT_FIELDS.has(item.dataKey)) return formatPercent(item.value);
  if (item.dataKey.includes("count")) return item.value;
  return formatKobo(item.value);
}

export function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload || {};

  return (
    <div className="analytics-tooltip">
      <strong>{label || row.label || ""}</strong>
      {payload.map((item) => (
        <div key={item.dataKey}>
          <span style={{ color: item.color }}>{item.name}: </span>
          {tooltipValue(item)}
        </div>
      ))}
      {row.percentage_of_total !== undefined && (
        <div>Share of selected total: {formatPercent(row.percentage_of_total)}</div>
      )}
      {row.remaining_kobo !== undefined && (
        <div>
          {row.remaining_kobo < 0 ? "Over budget by" : "Remaining"}: {formatKobo(Math.abs(row.remaining_kobo))}
        </div>
      )}
      {row.utilization_percent !== undefined && (
        row.utilization_percent !== null && <div>Budget used: {formatPercent(row.utilization_percent)}</div>
      )}
      {row.transaction_date && (
        <div className="tooltip-meta">{row.category_name} · {row.transaction_date}</div>
      )}
    </div>
  );
}

// ============================================================
// 2. Charts added by the analytics enhancement
// ============================================================
export function SavingsRateChart({ periods }) {
  const hasData = periods.some(
    (period) => period.savings_rate_percent !== null && period.savings_rate_percent !== undefined,
  );

  return (
    <ChartCard
      title="Savings rate trend"
      purpose="Retained income after ordinary spending and savings contributions, shown as a share of income."
      hasData={hasData}
      emptyMessage="Savings rates are unavailable when periods have no income."
      tableData={periods}
      tableColumns={[
        { key: "label", label: "Period" },
        { key: "savings_rate_percent", label: "Savings rate", render: (value) => formatPercent(value) },
      ]}
    >
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={periods} margin={{ top: 12, right: 16, bottom: 4, left: 8 }}>
          <XAxis dataKey="label" axisLine={false} tickLine={false} />
          <YAxis tickFormatter={formatPercent} axisLine={false} tickLine={false} width={62} />
          <Tooltip content={<ChartTooltip />} />
          <Line
            dataKey="savings_rate_percent"
            name="Savings rate"
            stroke={ANALYTICS_COLORS[1]}
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 5 }}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function BudgetComparisonChart({ rows, groupBy }) {
  const data = rows.map((row) => ({
    ...row,
    label: `${row.category_name} · ${row.period_start}`,
  }));

  return (
    <ChartCard
      title="Budget versus actual spending"
      purpose="Compare ordinary expenditure with category budgets for complete weekly or monthly periods."
      hasData={data.length > 0}
      tableData={data}
      tableColumns={[
        { key: "label", label: "Category and period" },
        { key: "budget_kobo", label: "Budget", render: formatKobo },
        { key: "actual_kobo", label: "Spent", render: formatKobo },
        { key: "remaining_kobo", label: "Remaining", render: (value) => formatKobo(value) },
        { key: "overspent_kobo", label: "Overspent", render: formatKobo },
      ]}
      emptyMessage={
        groupBy === "year"
          ? "Budgets are weekly or monthly; choose Weekly or Monthly to compare."
          : "No complete budget periods fall inside this date range."
      }
    >
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} layout="vertical" margin={{ left: 12, right: 20 }}>
          <XAxis type="number" tickFormatter={compactKobo} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="label" width={150} axisLine={false} tickLine={false} />
          <Tooltip content={<ChartTooltip />} />
          <Legend />
          <Bar dataKey="budget_kobo" name="Budget" fill={ANALYTICS_COLORS[0]} />
          <Bar dataKey="actual_kobo" name="Actual ordinary spending" fill={ANALYTICS_COLORS[2]} />
        </BarChart>
      </ResponsiveContainer>
      <ul className="detail-list budget-comparison-list">
        {rows.map((row) => (
          <li key={`${row.period_start}-${row.category_id}`}>
            <span>
              <strong>{row.category_name}</strong> · {row.period_start}
            </span>
            <span>
              {row.budget_kobo === 0
                ? `${row.budget_display} · Budget needed`
                : `${row.budget_display} planned`} ·{" "}
              {row.actual_display} actual ·{" "}
              {row.budget_kobo === 0
                ? `Budget needed · ${formatKobo(row.overspent_kobo)} overspent`
                : row.overspent_kobo > 0
                  ? `Over budget by ${formatKobo(row.overspent_kobo)}`
                  : `${row.remaining_display} remaining`}
              {row.utilization_percent !== null && ` · ${formatPercent(row.utilization_percent)} used`}
            </span>
          </li>
        ))}
      </ul>
    </ChartCard>
  );
}

export function TopExpensesChart({ expenses }) {
  const data = expenses.map((expense) => ({
    ...expense,
    label: expense.description || expense.category_name,
  }));

  return (
    <ChartCard
      title="Largest individual expenses"
      purpose="Rank the highest ordinary expense transactions in the selected date range."
      hasData={data.length > 0}
      tableData={data}
      tableColumns={[
        { key: "label", label: "Expense" },
        { key: "category_name", label: "Category" },
        { key: "transaction_date", label: "Date" },
        { key: "amount_display", label: "Amount" },
      ]}
    >
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} layout="vertical" margin={{ left: 12, right: 20 }}>
          <XAxis type="number" tickFormatter={compactKobo} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="label" width={150} axisLine={false} tickLine={false} />
          <Tooltip content={<ChartTooltip />} />
          <Bar dataKey="amount_kobo" name="Amount" fill={ANALYTICS_COLORS[3]} />
        </BarChart>
      </ResponsiveContainer>
      <ul className="detail-list top-expense-list">
        {expenses.map((expense) => (
          <li key={expense.id}>
            <Link to={`/transactions?id=${expense.id}`}>
              {expense.description || "Untitled expense"}
            </Link>
            <span>
              {expense.category_name} · {expense.transaction_date} · {expense.amount_display}
            </span>
          </li>
        ))}
      </ul>
    </ChartCard>
  );
}
