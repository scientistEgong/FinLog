import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { compactKobo, formatKobo, formatPercent } from "../utils/money.js";

const CATEGORY_COLORS = ["#1f4e79", "#2f6b94", "#4a83a8", "#6a9bbb", "#8bb2c9"];

// ============================================================
// 1. Explain category amounts and their share of spending
// ============================================================
function CategoryTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const category = payload[0].payload;
  return (
    <div className="analytics-tooltip">
      <strong>{category.category_name}</strong>
      <div>{formatKobo(category.amount_kobo)}</div>
      <div>{formatPercent(category.percentage_of_expenditure)} of ordinary expenditure</div>
    </div>
  );
}

// ============================================================
// 2. Rank and present ordinary spending categories
// ============================================================
export default function SpendingByCategoryChart({ period, loading, error }) {
  const heading = (
    <div className="budget-heading">
      <div>
        <h2>Spending by category</h2>
        <p className="muted small">Leading ordinary expenditure categories in the selected period.</p>
      </div>
      <Link className="secondary small-btn" to="/analytics">Full analysis</Link>
    </div>
  );

  if (loading) {
    return (
      <section className="card analytics-card">
        {heading}
        <p className="muted" role="status">Loading categories…</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="card analytics-card">
        {heading}
        <p className="muted">Unavailable</p>
      </section>
    );
  }

  const categories = (period?.spending_by_category || []).slice(0, 8);

  return (
    <section className="card analytics-card">
      {heading}
      {categories.length > 0 ? (
        <ResponsiveContainer width="100%" height={Math.max(220, categories.length * 44)}>
          <BarChart
            data={categories}
            layout="vertical"
            margin={{ top: 8, right: 18, bottom: 8, left: 8 }}
          >
            <XAxis type="number" tickFormatter={compactKobo} axisLine={false} tickLine={false} />
            <YAxis
              type="category"
              dataKey="category_name"
              width={150}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12 }}
            />
            <Tooltip content={<CategoryTooltip />} />
            <Bar dataKey="amount_kobo" name="Ordinary expenditure">
              {categories.map((category, index) => (
                <Cell key={category.category_id} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <p className="muted empty chart-empty">No ordinary expenditure recorded in this period.</p>
      )}
    </section>
  );
}
