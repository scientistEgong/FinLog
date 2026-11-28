// ============================================================
// 1. Load dependencies and compact-board limits
// ============================================================
import { Link } from "react-router-dom";

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
  const overspent = (budget?.total_overspent_kobo || 0) > 0;

  return (
    <section className="card dash-budget" aria-label="This week's budget">
      <div className="panel-heading">
        <div>
          <h2>What is left this week?</h2>
          <p className="muted small">Week starting {periodStart}. Spending excludes savings transfers.</p>
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
            <span>{overspent ? "Over budget this week" : "Left this week"}</span>
            <strong className={`num${overspent ? " is-expense" : ""}`}>
              {overspent ? budget.total_overspent_display : budget.total_remaining_display}
            </strong>
          </div>
        </>
      )}
    </section>
  );
}
