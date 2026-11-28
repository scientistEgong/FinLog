// ============================================================
// 1. Render transaction history with loading and empty states
// ============================================================
import { formatDisplayDate } from "../utils/dates.js";

export default function TransactionList({ items, loading, onEdit, onDelete }) {
  if (!loading && items.length === 0) {
    return <p className="muted empty">No transactions match. Add one above, or change the filters.</p>;
  }

  return (
    <table className="txn-table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Description</th>
          <th>Category</th>
          <th>Payment</th>
          <th className="num">Amount</th>
          <th aria-label="Actions"></th>
        </tr>
      </thead>
      <tbody>
        {items.map((t) => (
          <tr key={t.id}>
            <td data-label="Date">{formatDisplayDate(t.transaction_date)}</td>
            <td data-label="Description">
              {t.description}
              {t.notes && <div className="muted small">{t.notes}</div>}
            </td>
            <td data-label="Category">
              {t.category_name}
              {t.is_savings && <span className="pill">Savings</span>}
            </td>
            <td data-label="Payment">{t.payment_method || "—"}</td>
            <td data-label="Amount" className={`num ${t.type}`}>
              {t.type === "income" ? "+" : "−"}{t.amount_display}
            </td>
            <td className="actions">
              <button type="button" className="secondary small-btn" onClick={() => onEdit(t)}>Edit</button>
              <button type="button" className="danger small-btn" onClick={() => onDelete(t)}>Delete</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
