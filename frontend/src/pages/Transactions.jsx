// ============================================================
// 1. Load page dependencies and transaction view defaults
// ============================================================
import { useEffect, useState } from "react";
import { listTransactions, removeTransaction } from "../api/transactions.js";
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
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [debouncedQ, setDebouncedQ] = useState("");
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);
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
    listTransactions({
      date_from: filters.dateFrom,
      date_to: filters.dateTo,
      type: filters.type,
      category_id: filters.categoryId,
      q: debouncedQ,
      limit: PAGE_SIZE,
      offset,
    })
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
  }, [filters.dateFrom, filters.dateTo, filters.type, filters.categoryId, debouncedQ, offset, refreshKey]);

  const refresh = () => setRefreshKey((k) => k + 1);

  function changeFilters(next) {
    setFilters(next);
    setOffset(0);
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
    <>
      <h1>Transactions</h1>
      {categoriesError && <div className="alert error">{categoriesError}</div>}

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

      <section className="card">
        <h2>History</h2>
        <TransactionFilters
          filters={filters}
          categories={categories}
          onChange={changeFilters}
          onClear={() => changeFilters(EMPTY_FILTERS)}
        />
        {error && <div className="alert error">{error}</div>}
        <TransactionList items={data.items} loading={loading} onEdit={setEditing} onDelete={handleDelete} />
        <div className="pager">
          <span className="muted">{data.total === 0 ? "0 results" : `Showing ${from}–${to} of ${data.total}`}</span>
          <div>
            <button type="button" className="secondary" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>
              Previous
            </button>
            <button type="button" className="secondary" disabled={offset + PAGE_SIZE >= data.total} onClick={() => setOffset(offset + PAGE_SIZE)}>
              Next
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
