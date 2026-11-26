import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { compactKobo, formatKobo } from "../utils/money.js";

function ComparisonTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="analytics-tooltip">
      <strong>{label}</strong>
      <div>{formatKobo(payload[0].value)}</div>
    </div>
  );
}

export default function IncomeExpenseChart({ period, loading, error }) {
  if (loading) {
    return (
      <section className="card analytics-card">
        <h2>Income, spending, and savings</h2>
        <p className="muted" role="status">Loading comparison…</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="card analytics-card">
        <h2>Income, spending, and savings</h2>
        <p className="muted">Unavailable</p>
      </section>
    );
  }

  if (!period) {
    return (
      <section className="card analytics-card">
        <h2>Income, spending, and savings</h2>
        <p className="muted">No period data available.</p>
      </section>
    );
  }

  const hasData = period.income_kobo > 0 || period.expenditure_kobo > 0 || period.savings_kobo > 0;
  const data = [
    { name: "Income", amount_kobo: period.income_kobo, color: "#1c7c54" },
    { name: "Expenditure", amount_kobo: period.expenditure_kobo, color: "#b83a32" },
    { name: "Savings", amount_kobo: period.savings_kobo, color: "#1f4e79" },
    { name: "Retained", amount_kobo: period.available_change_kobo, color: "#b9770e" },
  ];

  return (
    <section className="card analytics-card">
      <h2>Income, spending, and savings</h2>
      <p className="muted small">Compare money received with ordinary spending, savings allocations, and retained income.</p>
      {hasData ? (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} margin={{ top: 18, right: 18, bottom: 6, left: 8 }}>
            <XAxis dataKey="name" axisLine={false} tickLine={false} />
            <YAxis tickFormatter={compactKobo} axisLine={false} tickLine={false} width={72} />
            <Tooltip content={<ComparisonTooltip />} />
            <Bar dataKey="amount_kobo" name="Amount">
              {data.map((item) => (
                <Cell key={item.name} fill={item.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <p className="muted empty chart-empty">No income or spending recorded in this period.</p>
      )}
    </section>
  );
}
