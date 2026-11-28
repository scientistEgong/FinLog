// ============================================================
// 1. Load budget workflows, category data, and date helpers
// ============================================================
import { useEffect, useMemo, useState } from "react";
import { createBudget, listBudgets, removeBudget, updateBudget } from "../api/budgets.js";
import useCategories from "../hooks/useCategories.js";
import { periodStartISO, todayISO } from "../utils/dates.js";

const EMPTY_FORM = { categoryId: "", amount: "" };

// ============================================================
// 2. Select a period and coordinate budget operations
// ============================================================
export default function Budgets() {
  const [periodType, setPeriodType] = useState("week");
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [data, setData] = useState({
    items: [],
    comparison: [],
    total_budget_display: "₦0.00",
    total_actual_display: "₦0.00",
    total_remaining_display: "₦0.00",
    total_overspent_display: "₦0.00",
    total_overspent_kobo: 0,
    is_partial_period: false,
    actual_through: null,
  });
  const [form, setForm] = useState(EMPTY_FORM);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [refreshKey, setRefreshKey] = useState(0);
  const { categories, error: categoryError, reload: reloadCategories } = useCategories();
  const spendingCategories = categories.filter((category) => !category.is_savings);
  const excludedSavingsBudgets = data.items.filter((budget) => {
    const category = categories.find((item) => item.id === budget.category_id);
    return category?.is_savings;
  });
  const periodStart = useMemo(() => periodStartISO(selectedDate, periodType), [selectedDate, periodType]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    listBudgets({ period_type: periodType, period_start: periodStart })
      .then((result) => !cancelled && setData(result))
      .catch((requestError) => !cancelled && setError(requestError.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [periodType, periodStart, refreshKey]);

  function resetForm() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFieldErrors({});
  }

  function beginEdit(budget) {
    setEditing(budget);
    setForm({ categoryId: String(budget.category_id), amount: budget.amount_input });
    setFieldErrors({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setFieldErrors({});
    if (!form.categoryId) {
      setFieldErrors({ category_id: "Choose a category." });
      return;
    }

    const body = {
      period_type: periodType,
      period_start: periodStart,
      category_id: Number(form.categoryId),
      amount: form.amount,
    };

    setSaving(true);
    try {
      if (editing) {
        await updateBudget(editing.id, body);
      } else {
        await createBudget(body);
      }
      resetForm();
      setRefreshKey((key) => key + 1);
    } catch (requestError) {
      setError(requestError.message);
      setFieldErrors(requestError.fields || {});
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(budget) {
    if (!window.confirm(`Delete the ${budget.category_name} budget for this period?`)) return;
    setError("");
    try {
      await removeBudget(budget.id);
      if (editing?.id === budget.id) resetForm();
      setRefreshKey((key) => key + 1);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  const periodLabel = periodType === "week" ? "Week starting Sunday" : "Month starting on the first";

  // The backend owns budget totals; this page only presents returned values.
  return (
    <div className="page page-budgets">
      <h1>Budgets</h1>
      <section className="card period-controls" aria-label="Budget period">
        <div className="segmented" role="group" aria-label="Budget period type">
          {["week", "month"].map((type) => (
            <button
              key={type}
              type="button"
              className={periodType === type ? "seg active" : "seg"}
              aria-pressed={periodType === type}
              onClick={() => {
                resetForm();
                setPeriodType(type);
              }}
            >
              {type === "week" ? "Week" : "Month"}
            </button>
          ))}
        </div>
        <label className="field period-date">
          <span>{periodLabel}</span>
          <input
            type="date"
            value={selectedDate}
            onChange={(event) => {
              if (!event.target.value) return;
              resetForm();
              setSelectedDate(event.target.value);
            }}
            required
          />
        </label>
        <p className="muted small">Showing period starting {periodStart}</p>
      </section>

      <section className="card budget-summary" aria-label="Budget position for this period">
        <div>
          <span>Allocated</span>
          <strong className="num">{loading ? "—" : data.total_budget_display}</strong>
        </div>
        <div>
          <span>{data.is_partial_period ? "Spent so far" : "Spent"}</span>
          <strong className="num">{loading ? "—" : data.total_actual_display}</strong>
        </div>
        <div>
          <span>{data.total_overspent_kobo > 0 ? "Over budget" : "Left"}</span>
          <strong className={`num${data.total_overspent_kobo > 0 ? " is-expense" : ""}`}>
            {loading ? "—" : data.total_overspent_kobo > 0
              ? data.total_overspent_display
              : data.total_remaining_display}
          </strong>
        </div>
        <div>
          <span>Categories</span>
          <strong className="num">{loading ? "—" : data.items.length}</strong>
        </div>
        {!loading && data.is_partial_period && (
          <p className="muted small budget-summary-note">
            This period is still in progress. Spending is counted up to {data.actual_through}.
          </p>
        )}
      </section>

      <form className="card" onSubmit={handleSubmit}>
        <h2>{editing ? "Edit budget" : "Add a category budget"}</h2>
        <div className="budget-form">
          <label className="field">
            <span>Category</span>
            <select
              value={form.categoryId}
              onChange={(event) => setForm((current) => ({ ...current, categoryId: event.target.value }))}
              required
            >
              <option value="">Choose a category</option>
              {spendingCategories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
            {fieldErrors.category_id && <small className="field-error">{fieldErrors.category_id}</small>}
          </label>
          <label className="field">
            <span>Budget amount (₦)</span>
            <input
              value={form.amount}
              onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
              inputMode="decimal"
              placeholder="0.00"
              required
            />
            {form.amount.trim() !== "" && Number(form.amount) === 0 && (
              <small className="muted">Budget needed. Zero is a placeholder; spending will still appear as overspent.</small>
            )}
            {fieldErrors.amount && <small className="field-error">{fieldErrors.amount}</small>}
          </label>
        </div>
        {categoryError && (
          <div className="alert error" role="alert">
            {categoryError} <button type="button" className="secondary small-btn" onClick={reloadCategories}>Retry categories</button>
          </div>
        )}
        {error && (
          <div className="alert error" role="alert">
            {error} <button type="button" className="secondary small-btn" onClick={() => setRefreshKey((key) => key + 1)}>Retry</button>
          </div>
        )}
        <div className="form-actions">
          <button type="submit" disabled={saving || Boolean(categoryError)}>
            {saving ? "Saving…" : editing ? "Save changes" : "Add budget"}
          </button>
          {editing && <button type="button" className="secondary" onClick={resetForm}>Cancel</button>}
        </div>
      </form>

      <section className="card">
        <div className="budget-heading">
          <h2>Category breakdown</h2>
          <strong>{loading ? "Loading…" : data.is_partial_period ? "So far" : "Period total"}</strong>
        </div>
        {loading ? (
          <p className="muted">Loading budgets…</p>
        ) : data.comparison.length === 0 ? (
          <p className="empty muted">No budgets for this period yet.</p>
        ) : (
          <table className="budget-table">
            <thead>
              <tr><th>Category</th><th>Budget</th><th>Spent</th><th>Remaining / overspent</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {data.comparison.map((row) => {
                const budget = data.items.find((item) => item.category_id === row.category_id);
                return (
                <tr key={row.category_id}>
                  <td data-label="Category">{row.category_name}</td>
                  <td data-label="Budget" className="num">
                    {row.budget_kobo === 0 ? "Budget needed" : row.budget_display}
                  </td>
                  <td data-label="Spent" className="num">{row.actual_display}</td>
                  <td data-label="Remaining / overspent" className="num">
                    {row.overspent_kobo > 0
                      ? `Overspent ${row.overspent_display}`
                      : `${row.remaining_display} remaining`}
                  </td>
                  <td data-label="Actions" className="actions">
                    {budget && <button type="button" className="secondary small-btn" onClick={() => beginEdit(budget)}>Edit</button>}
                    {budget && <button type="button" className="danger small-btn" onClick={() => handleDelete(budget)}>Delete</button>}
                  </td>
                </tr>
              );})}
              <tr className="budget-total-row">
                <th scope="row">Total {data.is_partial_period && "so far"}</th>
                <td data-label="Budget" className="num">{data.total_budget_display}</td>
                <td data-label="Spent" className="num">{data.total_actual_display}</td>
                <td data-label="Remaining / overspent" className="num">
                  {data.total_overspent_kobo > 0
                    ? `Overspent ${data.total_overspent_display}`
                    : `${data.total_remaining_display} remaining`}
                </td>
                <td data-label="Actions" />
              </tr>
            </tbody>
          </table>
        )}
        {excludedSavingsBudgets.length > 0 && (
          <div className="muted small savings-budget-note">
            Existing savings-category budget rows are retained and excluded from spending comparisons:
            {" "}{excludedSavingsBudgets.map((budget) => `${budget.category_name} (${budget.amount_display})`).join(", ")}.
          </div>
        )}
      </section>
    </div>
  );
}
