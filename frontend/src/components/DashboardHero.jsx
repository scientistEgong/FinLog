// ============================================================
// 1. Load display helpers
// ============================================================
import { Link } from "react-router-dom";
import { formatDateRange } from "../utils/dates.js";

// ============================================================
// 2. Present the balance, period totals, and the weekly budget gauge
// ============================================================
// Every amount is the API's own display string. The only arithmetic here is
// the gauge percentage, which is presentation, not an authoritative balance.
export default function DashboardHero({ summary, period, range, budget, loading, error }) {
  const balanceText = loading ? "—" : error ? "Unavailable" : summary?.available_balance_display || "—";
  // The API reports unspent budget and overspending separately, so the hero
  // shows what is still available and the panel explains any overspending.
  const hasAllocation = Boolean(budget && budget.total_budget_kobo > 0);
  const budgetText = hasAllocation
    ? budget.total_remaining_display
    : loading
      ? "Loading…"
      : "Not set";
  const ringPercent = hasAllocation
    ? Math.round((budget.total_actual_kobo / budget.total_budget_kobo) * 100)
    : null;

  return (
    <section className="dash-hero" aria-label="Financial position" aria-busy={loading ? "true" : "false"}>
      <div className="hero-head">
        <div className="hero-balance-block">
          <p className="hero-label">Available balance</p>
          <p className="hero-balance">{balanceText}</p>
          <p className="hero-context">
            <span>{formatDateRange(range.dateFrom, range.dateTo)}</span>
            <span>
              Total wallet <strong>{summary?.total_wallet_display || "—"}</strong>
            </span>
            <span>
              Opening balance <strong>{summary?.opening_balance_display || "—"}</strong>
            </span>
          </p>
        </div>

        <div className="hero-side">
          {ringPercent !== null && (
            <div
              className="hero-ring"
              style={{ "--ring-progress": Math.min(ringPercent, 100) }}
              role="img"
              aria-label={`${ringPercent} percent of this week's budget used`}
            >
              <span className="hero-ring-value">
                {ringPercent}%
                <small>used</small>
              </span>
            </div>
          )}
          <Link className="hero-action" to="/transactions?new=1">Add transaction</Link>
        </div>
      </div>

      <dl className="hero-kpis">
        <div>
          <dt>Income</dt>
          <dd>{period?.income_display || "—"}</dd>
        </div>
        <div>
          <dt>Spent</dt>
          <dd>{period?.expenditure_display || "—"}</dd>
        </div>
        <div>
          <dt>Saved</dt>
          <dd>{period?.savings_display || "—"}</dd>
        </div>
        <div>
          <dt>Budget left</dt>
          <dd>{budgetText}</dd>
        </div>
      </dl>
    </section>
  );
}
