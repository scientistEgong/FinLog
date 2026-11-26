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
  const [data, setData] = useState({ items: [], total_budget_display: "₦0.00" });
  const [form, setForm] = useState(EMPTY_FORM);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [refreshKey, setRefreshKey] = useState(0);
  const { categories, error: categoryError } = useCategories();
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
    <>
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
              {categories.map((category) => (
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
            {fieldErrors.amount && <small className="field-error">{fieldErrors.amount}</small>}
          </label>
        </div>
        {categoryError && <div className="alert error">{categoryError}</div>}
        {error && <div className="alert error" role="alert">{error}</div>}
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
          <strong>Total: {loading ? "Loading…" : data.total_budget_display}</strong>
        </div>
        {error && <div className="alert error" role="alert">{error}</div>}
        {loading ? (
          <p className="muted">Loading budgets…</p>
        ) : data.items.length === 0 ? (
          <p className="empty muted">No budgets for this period yet.</p>
        ) : (
          <table className="budget-table">
            <thead>
              <tr><th>Category</th><th>Budget</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {data.items.map((budget) => (
                <tr key={budget.id}>
                  <td data-label="Category">{budget.category_name}</td>
                  <td data-label="Budget" className="num">{budget.amount_display}</td>
                  <td data-label="Actions" className="actions">
                    <button type="button" className="secondary small-btn" onClick={() => beginEdit(budget)}>Edit</button>
                    <button type="button" className="danger small-btn" onClick={() => handleDelete(budget)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
