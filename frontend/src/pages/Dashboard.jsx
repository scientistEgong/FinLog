// ============================================================
// 1. Load dashboard data and reusable display components
// ============================================================
import { useCallback, useEffect, useState } from "react";
import { getDashboardSummary } from "../api/dashboard.js";
import OpeningBalanceCard from "../components/OpeningBalanceCard.jsx";

const SUMMARY_CARDS = [
  { key: "opening_balance", label: "Opening balance" },
  { key: "total_income", label: "Total income", tone: "income" },
  { key: "total_expenditure", label: "Total expenditure", tone: "expense" },
  { key: "total_savings", label: "Total savings" },
  { key: "available_balance", label: "Available balance" },
  { key: "total_wallet", label: "Total wallet", tone: "wallet" },
];

// ============================================================
// 2. Fetch the authoritative summary and render its API values
// ============================================================
export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((key) => key + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    getDashboardSummary()
      .then((data) => !cancelled && setSummary(data))
      .catch((requestError) => !cancelled && setError(requestError.message))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  return (
    <>
      <h1>Dashboard</h1>
      <p className="muted">All-time financial summary</p>

      <OpeningBalanceCard onSaved={refresh} />

      <section className="summary-grid" aria-label="Financial summary">
        {SUMMARY_CARDS.map((card) => (
          <article className={`card summary-card ${card.tone || ""}`} key={card.key}>
            <h2>{card.label}</h2>
            {loading ? (
              <p className="summary-value muted">Loading…</p>
            ) : error ? (
              <p className="summary-value muted">Unavailable</p>
            ) : (
              <p className="summary-value">{summary[`${card.key}_display`]}</p>
            )}
          </article>
        ))}
      </section>

      {error && (
        <div className="alert error" role="alert">
          {error} <button type="button" className="secondary small-btn" onClick={refresh}>Retry</button>
        </div>
      )}

      <p className="muted small">
        Savings are shown separately from expenditure and remain part of your total wallet.
      </p>
    </>
  );
}
