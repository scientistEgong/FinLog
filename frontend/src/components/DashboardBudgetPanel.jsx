// ============================================================
// 1. Load dependencies and compact-board limits
// ============================================================
import { Link } from "react-router-dom";
import { formatPeriodLabel } from "../utils/dates.js";

const MAX_ROWS = 4;

function rowState(row) {
  if (row.budget_status === "budget_needed") return "needed";
  if (row.overspent_kobo > 0) return "over";
  if (Number(row.utilization_percent) >= 80) return "warn";
  return "ok";
}

function utilization(row) {
  const percent = Number(row.utilization_percent);
  return Number.isFinite(percent) ? Math.round(percent) : 0;
}

// ============================================================
// 2. Show what is left this week against the backend comparison
// ============================================================
export default function DashboardBudgetPanel({ budget, loading, error, periodStart }) {
  const rows = (budget?.comparison || [])
    .filter((row) => row.budget_status === "set")
    .slice(0, MAX_ROWS);
  const hasAllocation = Boolean(budget && budget.total_budget_kobo > 0);
  // The API reports unspent budget and overspending as separate totals, so the
  // panel shows both rather than implying one net figure.
  const overBudgetCategories = (budget?.comparison || []).filter(
    (row) => row.overspent_kobo > 0,
  ).length;

  return (
    <section className="card dash-budget" aria-label="This week's budget">
      <div className="panel-heading">
        <div>
          <h2>What is left this week?</h2>
          <p className="muted small">
            Week of {formatPeriodLabel("week", periodStart)}. Spending excludes savings transfers.
          </p>
        </div>
        <Link className="secondary small-btn" to="/budgets">Open budgets</Link>
      </div>

      {loading && <p className="muted" role="status">Loading this week's budget…</p>}
      {!loading && error && <p className="muted">The weekly budget could not be loaded.</p>}

      {!loading && !error && !hasAllocation && (
        <div className="budget-empty">
          <p className="muted">No weekly budget has been allocated yet.</p>
          <Link className="secondary small-btn" to="/budgets">Set this week's budget</Link>
        </div>
      )}

      {!loading && !error && hasAllocation && (
        <>
          <div className="budget-rows">
            {rows.map((row) => {
              const percent = utilization(row);
              return (
                <div className="budget-row" data-state={rowState(row)} key={row.category_id}>
                  <div className="budget-row-head">
                    <span>{row.category_name}</span>
                    <span className="num">{row.actual_display} of {row.budget_display}</span>
                  </div>
                  <div className="budget-row-track" aria-hidden="true">
                    <i style={{ width: `${Math.min(Math.max(percent, 0), 100)}%` }} />
                  </div>
                  <p className="budget-row-foot">
                    <span>{percent}% used</span>
                    {row.overspent_kobo > 0 && (
                      <span className="budget-row-alert">Overspent {row.overspent_display}</span>
                    )}
                  </p>
                </div>
              );
            })}
          </div>
          <div className="budget-total">
            <span>Left in budget</span>
            <strong className="num">{budget.total_remaining_display}</strong>
          </div>
          {overBudgetCategories > 0 && (
            <p className="budget-total-note">
              {overBudgetCategories} {overBudgetCategories === 1 ? "category is" : "categories are"} already
              over by {budget.total_overspent_display}.
            </p>
          )}
        </>
      )}
    </section>
  );
}
