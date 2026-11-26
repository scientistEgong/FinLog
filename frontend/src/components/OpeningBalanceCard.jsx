// ============================================================
// 1. Load opening-balance API operations
// ============================================================
import { useEffect, useState } from "react";
import { getOpeningBalance, setOpeningBalance } from "../api/settings.js";

// ============================================================
// 2. Read, edit, and save the opening balance
// ============================================================
export default function OpeningBalanceCard({ onSaved }) {
  const [current, setCurrent] = useState(null);
  const [value, setValue] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    getOpeningBalance()
      .then((data) => {
        setCurrent(data);
        setValue(data.amount_input);
      })
      .catch((err) => setError(err.message));
  }, []);

  async function handleSave(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      const data = await setOpeningBalance(value);
      setCurrent(data);
      setValue(data.amount_input);
      setMessage("Opening balance saved.");
      onSaved?.();
    } catch (err) {
      setError(err.fields.amount || err.message);
    }
  }

  return (
    <details className="card">
      <summary>
        Opening balance{current ? `: ${current.amount_display}` : ""}
      </summary>
      <p className="muted">
        The money you already had before you started using FinLog. It counts toward your available balance but is
        never recorded as income.
      </p>
      <form onSubmit={handleSave} className="inline-form">
        <label className="field grow">
          <span>Amount (₦)</span>
          <input value={value} onChange={(e) => setValue(e.target.value)} inputMode="decimal" />
        </label>
        <button type="submit">Save</button>
      </form>
      {error && <div className="alert error">{error}</div>}
      {message && <div className="alert ok">{message}</div>}
    </details>
  );
}
