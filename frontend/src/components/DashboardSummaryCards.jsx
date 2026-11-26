import { formatPercent } from "../utils/money.js";

const ALL_TIME_CARDS = [
  { key: "opening_balance", label: "Opening balance" },
  { key: "available_balance", label: "Available balance" },
  { key: "total_wallet", label: "Total wallet", tone: "wallet" },
];

const PERIOD_CARDS = [
  { key: "income", label: "Income", tone: "income" },
  { key: "expenditure", label: "Ordinary expenditure", tone: "expense" },
  { key: "savings", label: "Savings contributions" },
  { key: "savings_rate", label: "Savings rate" },
];

function SummaryCard({ label, value, tone, loading, error }) {
  return (
    <article className={`card summary-card ${tone || ""}`}>
      <h2>{label}</h2>
      {loading ? (
        <p className="summary-value muted">Loading…</p>
      ) : error ? (
        <p className="summary-value muted">Unavailable</p>
      ) : (
        <p className="summary-value">{value}</p>
      )}
    </article>
  );
}

export default function DashboardSummaryCards({ summary, loading, error, range }) {
  const period = summary?.period;

  function periodValue(key) {
    if (!period) return "Unavailable";
    if (key === "savings_rate") return formatPercent(period.savings_rate_percent);
    return period[`${key}_display`];
  }

  return (
    <>
      <p className="muted small">Current position · all-time</p>
      <section className="summary-grid" aria-label="All-time financial position">
        {ALL_TIME_CARDS.map((card) => (
          <SummaryCard
            key={card.key}
            label={card.label}
            tone={card.tone}
            loading={loading}
            error={error}
            value={summary?.[`${card.key}_display`] || "Unavailable"}
          />
        ))}
      </section>

      <p className="muted small">Selected period · {range.dateFrom} to {range.dateTo}</p>
      <section className="summary-grid" aria-label="Selected period financial activity">
        {PERIOD_CARDS.map((card) => (
          <SummaryCard
            key={card.key}
            label={card.label}
            tone={card.tone}
            loading={loading}
            error={error}
            value={periodValue(card.key)}
          />
        ))}
      </section>
    </>
  );
}
