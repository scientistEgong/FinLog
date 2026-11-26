// ============================================================
// 1. Render controlled filter fields and pass changes to the page
// ============================================================
export default function TransactionFilters({ filters, categories, onChange, onClear }) {
  const set = (key) => (event) => onChange({ ...filters, [key]: event.target.value });

  return (
    <div className="filters">
      <label className="field">
        <span>From</span>
        <input type="date" value={filters.dateFrom} onChange={set("dateFrom")} />
      </label>
      <label className="field">
        <span>To</span>
        <input type="date" value={filters.dateTo} onChange={set("dateTo")} />
      </label>
      <label className="field">
        <span>Type</span>
        <select value={filters.type} onChange={set("type")}>
          <option value="">All</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
      </label>
      <label className="field">
        <span>Category</span>
        <select value={filters.categoryId} onChange={set("categoryId")}>
          <option value="">All</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </label>
      <label className="field grow">
        <span>Search</span>
        <input value={filters.q} onChange={set("q")} placeholder="Description or notes" />
      </label>
      <button type="button" className="secondary" onClick={onClear}>Clear</button>
    </div>
  );
}
