import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listTransactions } from "../api/transactions.js";
import { formatDisplayDate } from "../utils/dates.js";

// ============================================================
// 1. Load the latest records and present the compact transaction list
// ============================================================
export default function RecentTransactions() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    listTransactions({ limit: 5 })
      .then((result) => !cancelled && setItems(result.items || []))
      .catch((requestError) => !cancelled && setError(requestError.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  return (
    <section className="card recent-transactions">
      <div className="budget-heading">
        <div>
          <h2>Recent transactions</h2>
          <p className="muted small">The five most recent records across all categories.</p>
        </div>
        <Link className="secondary small-btn" to="/transactions">View all</Link>
      </div>
      {loading && <p className="muted" role="status">Loading transactions…</p>}
      {error && (
        <div className="alert error" role="alert">
          {error} <button type="button" className="secondary small-btn" onClick={() => setRefreshKey((key) => key + 1)}>Retry</button>
        </div>
      )}
      {!loading && !error && items.length === 0 && (
        <p className="muted empty">No transactions recorded yet.</p>
      )}
      {!loading && !error && items.length > 0 && (
        <table className="txn-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Category</th>
              <th className="num">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((transaction) => (
              <tr key={transaction.id}>
                <td data-label="Date">{formatDisplayDate(transaction.transaction_date)}</td>
                <td data-label="Description">{transaction.description}</td>
                <td data-label="Category">
                  {transaction.category_name}
                  {transaction.is_savings && <span className="pill">Savings</span>}
                </td>
                <td data-label="Amount" className={`num ${transaction.type}`}>
                  {transaction.type === "income" ? "+" : "−"}{transaction.amount_display}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
