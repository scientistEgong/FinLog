// ============================================================
// 1. Load page dependencies and transaction view defaults
// ============================================================
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getTransaction, listTransactions, removeTransaction } from "../api/transactions.js";
import TransactionFilters from "../components/TransactionFilters.jsx";
import TransactionForm from "../components/TransactionForm.jsx";
import TransactionList from "../components/TransactionList.jsx";
import useCategories from "../hooks/useCategories.js";

const PAGE_SIZE = 25;
const EMPTY_FILTERS = { dateFrom: "", dateTo: "", type: "", categoryId: "", q: "" };

// ============================================================
// 2. Coordinate filters, pagination, edits, and API requests
// ============================================================
export default function Transactions() {
  const { categories, error: categoriesError, reload: reloadCategories } = useCategories();
  const [searchParams, setSearchParams] = useSearchParams();
  const transactionId = searchParams.get("id");
  const [filters, setFilters] = useState(() => ({
    ...EMPTY_FILTERS,
    q: searchParams.get("q") || "",
  }));
  const [debouncedQ, setDebouncedQ] = useState("");
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);
  // The dashboard links here with ?new=1, so the entry form opens on arrival.
  const [formOpen, setFormOpen] = useState(() => searchParams.get("new") === "1");
  const [refreshKey, setRefreshKey] = useState(0);

  // Wait briefly after typing in the search box before asking the server.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(filters.q), 300);
    return () => clearTimeout(timer);
  }, [filters.q]);

  useEffect(() => {
    // Ignore late responses after filters change/unmount so stale data cannot replace newer results.
    let cancelled = false;
    setLoading(true);
    setError("");
    const request = transactionId
      ? getTransaction(transactionId).then((transaction) => ({ items: [transaction], total: 1 }))
      : listTransactions({
          date_from: filters.dateFrom,
          date_to: filters.dateTo,
          type: filters.type,
          category_id: filters.categoryId,
          q: debouncedQ,
          limit: PAGE_SIZE,
          offset,
      });
    request
      .then((result) => {
        if (cancelled) return;
        if (result.items.length === 0 && offset > 0) {
          setOffset(Math.max(0, offset - PAGE_SIZE)); // last item on the page was deleted
          return;
        }
        setData(result);
      })
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [transactionId, filters.dateFrom, filters.dateTo, filters.type, filters.categoryId, debouncedQ, offset, refreshKey]);

  const refresh = () => setRefreshKey((k) => k + 1);

  function changeFilters(next) {
    setFilters(next);
    setOffset(0);
  }

  function returnToAllTransactions() {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("id");
    setSearchParams(nextParams);
    changeFilters(EMPTY_FILTERS);
    setEditing(null);
  }

  function beginEdit(transaction) {
    setEditing(transaction);
    setFormOpen(true);
  }

  function toggleForm() {
    setFormOpen((open) => !open);
    setEditing(null);
  }

  async function handleDelete(txn) {
    if (!window.confirm(`Delete "${txn.description}" (${txn.amount_display})? This cannot be undone.`)) return;
    try {
      await removeTransaction(txn.id);
      if (editing && editing.id === txn.id) setEditing(null);
      refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  const from = data.total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + PAGE_SIZE, data.total);

  return (
    <div className="page page-transactions">
      <div className="page-heading-row">
        <h1>{transactionId ? "Transaction details" : "Transactions"}</h1>
        <div className="page-heading-actions">
          {transactionId && (
            <button type="button" className="secondary" onClick={returnToAllTransactions}>
              Back to all transactions
            </button>
          )}
          {!transactionId && (
            <button
              type="button"
              className={formOpen ? "secondary" : ""}
              aria-expanded={formOpen}
              aria-controls="transaction-form"
              onClick={toggleForm}
            >
              {formOpen ? "Hide form" : "Add transaction"}
            </button>
          )}
        </div>
      </div>
      {categoriesError && <div className="alert error">{categoriesError}</div>}

      {!transactionId && (formOpen || editing) && (
        <div id="transaction-form">
          <TransactionForm
            categories={categories}
            editing={editing}
            onSaved={() => {
              setEditing(null);
              refresh();
            }}
            onCancel={() => setEditing(null)}
            onCategoryAdded={reloadCategories}
          />
        </div>
      )}

      <section className="card">
        <h2>{transactionId ? "Selected transaction" : "History"}</h2>
        {!transactionId && <TransactionFilters
          filters={filters}
          categories={categories}
          onChange={changeFilters}
          onClear={() => changeFilters(EMPTY_FILTERS)}
        />}
        {error && (
          <div className="alert error" role="alert">
            {error} <button type="button" className="secondary small-btn" onClick={refresh}>Retry</button>
          </div>
        )}
        <TransactionList items={data.items} loading={loading} onEdit={beginEdit} onDelete={handleDelete} />
        {!transactionId && <div className="pager">
          <span className="muted">{data.total === 0 ? "0 results" : `Showing ${from}–${to} of ${data.total}`}</span>
          <div>
            <button type="button" className="secondary" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>
              Previous
            </button>
            <button type="button" className="secondary" disabled={offset + PAGE_SIZE >= data.total} onClick={() => setOffset(offset + PAGE_SIZE)}>
              Next
            </button>
          </div>
        </div>}
      </section>
    </div>
  );
}
