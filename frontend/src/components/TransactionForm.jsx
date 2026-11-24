// Form state uses editable strings; the API validates and converts money into integer kobo.
import { useEffect, useState } from "react";
import { createCategory } from "../api/categories.js";
import { createTransaction, updateTransaction } from "../api/transactions.js";
import { todayISO } from "../utils/dates.js";

const PAYMENT_SUGGESTIONS = ["Cash", "Bank transfer", "Card", "POS", "Mobile money"];

const blank = () => ({
  type: "expense",
  amount: "",
  transaction_date: todayISO(),
  category_id: "",
  description: "",
  payment_method: "",
  notes: "",
});

export default function TransactionForm({ categories, editing, onSaved, onCancel, onCategoryAdded }) {
  const [form, setForm] = useState(blank);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [newCategory, setNewCategory] = useState("");

  useEffect(() => {
    if (editing) {
      setForm({
        type: editing.type,
        amount: editing.amount_input,
        transaction_date: editing.transaction_date,
        category_id: String(editing.category_id),
        description: editing.description,
        payment_method: editing.payment_method || "",
        notes: editing.notes || "",
      });
      setErrors({});
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      setForm(blank());
    }
  }, [editing]);

  const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }));
  const selectedCategory = categories.find((c) => String(c.id) === form.category_id);

  async function handleSubmit(event) {
    event.preventDefault();
    setErrors({});
    if (form.category_id === "") {
      setErrors({ category_id: "Choose a category." });
      return;
    }
    // Send the API's expected naira string and normalize empty optional fields to null.
    const body = {
      type: form.type,
      amount: form.amount,
      transaction_date: form.transaction_date,
      category_id: Number(form.category_id),
      description: form.description,
      payment_method: form.payment_method || null,
      notes: form.notes || null,
    };
    setSaving(true);
    try {
      if (editing) {
        await updateTransaction(editing.id, body);
      } else {
        await createTransaction(body);
        // Keep type, date and category so several entries in a row are quick.
        setForm((f) => ({ ...blank(), type: f.type, transaction_date: f.transaction_date, category_id: f.category_id }));
      }
      onSaved();
    } catch (err) {
      setErrors({ ...err.fields, general: err.message });
    } finally {
      setSaving(false);
    }
  }

  async function handleAddCategory() {
    if (!newCategory.trim()) return;
    try {
      const created = await createCategory(newCategory);
      setNewCategory("");
      await onCategoryAdded();
      setForm((f) => ({ ...f, category_id: String(created.id) }));
      setErrors((e) => ({ ...e, category: undefined }));
    } catch (err) {
      setErrors((e) => ({ ...e, category: err.message }));
    }
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h2>{editing ? "Edit transaction" : "Add transaction"}</h2>

      <div className="segmented" role="group" aria-label="Transaction type">
        {["expense", "income"].map((t) => (
          <button
            key={t}
            type="button"
            className={form.type === t ? `seg active ${t}` : "seg"}
            onClick={() => setForm((f) => ({ ...f, type: t }))}
          >
            {t === "expense" ? "Expense" : "Income"}
          </button>
        ))}
      </div>

      <div className="form-grid">
        <label className="field">
          <span>Amount (₦)</span>
          <input value={form.amount} onChange={set("amount")} inputMode="decimal" placeholder="0.00" required />
          {errors.amount && <small className="field-error">{errors.amount}</small>}
        </label>

        <label className="field">
          <span>Date</span>
          <input type="date" value={form.transaction_date} onChange={set("transaction_date")} required />
          {errors.transaction_date && <small className="field-error">{errors.transaction_date}</small>}
        </label>

        <label className="field">
          <span>Category</span>
          <select value={form.category_id} onChange={set("category_id")}>
            <option value="">Select category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {errors.category_id && <small className="field-error">{errors.category_id}</small>}
          {selectedCategory && selectedCategory.is_savings && (
            <small className="muted">Savings are tracked separately from spending.</small>
          )}
        </label>

        <label className="field">
          <span>Payment method</span>
          <input list="payment-methods" value={form.payment_method} onChange={set("payment_method")} />
          <datalist id="payment-methods">
            {PAYMENT_SUGGESTIONS.map((p) => <option key={p} value={p} />)}
          </datalist>
        </label>

        <label className="field span-2">
          <span>Description</span>
          <input value={form.description} onChange={set("description")} maxLength={200} required />
          {errors.description && <small className="field-error">{errors.description}</small>}
        </label>

        <label className="field span-2">
          <span>Notes (optional)</span>
          <textarea value={form.notes} onChange={set("notes")} rows={2} maxLength={1000} />
        </label>
      </div>

      <div className="inline-form add-category">
        <label className="field grow">
          <span>New custom category</span>
          <input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} maxLength={50} />
        </label>
        <button type="button" className="secondary" onClick={handleAddCategory}>Add category</button>
      </div>
      {errors.category && <div className="alert error">{errors.category}</div>}

      {errors.general && <div className="alert error">{errors.general}</div>}

      <div className="form-actions">
        <button type="submit" disabled={saving}>
          {saving ? "Saving…" : editing ? "Save changes" : "Add transaction"}
        </button>
        {editing && (
          <button type="button" className="secondary" onClick={onCancel}>Cancel</button>
        )}
      </div>
    </form>
  );
}
