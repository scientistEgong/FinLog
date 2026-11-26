const PRESETS = [
  { value: "this-week", label: "This week" },
  { value: "this-month", label: "This month" },
  { value: "last-month", label: "Last month" },
  { value: "last-3-months", label: "Last 3 months" },
  { value: "last-6-months", label: "Last 6 months" },
  { value: "this-year", label: "This year" },
];

export default function DashboardPeriodSelector({ preset, range, onPresetChange, onCustomChange }) {
  function handleDateChange(field, value) {
    if (!value) return;
    if (field === "dateFrom" && value > range.dateTo) return;
    if (field === "dateTo" && value < range.dateFrom) return;
    onCustomChange({ ...range, [field]: value });
  }

  return (
    <section className="card dashboard-period-card" aria-label="Dashboard reporting period">
      <h2>Reporting period</h2>
      <p className="muted small">Period totals use this range. Balance cards remain all-time.</p>
      <div className="segmented dashboard-preset-toggle" role="group" aria-label="Reporting period preset">
        {PRESETS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={preset === option.value ? "seg active" : "seg"}
            aria-pressed={preset === option.value}
            onClick={() => onPresetChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
      <div className="period-controls dashboard-custom-range">
        <label className="field">
          <span>From</span>
          <input
            type="date"
            value={range.dateFrom}
            max={range.dateTo}
            onChange={(event) => handleDateChange("dateFrom", event.target.value)}
          />
        </label>
        <label className="field">
          <span>To</span>
          <input
            type="date"
            value={range.dateTo}
            min={range.dateFrom}
            onChange={(event) => handleDateChange("dateTo", event.target.value)}
          />
        </label>
      </div>
      {preset === "custom" && <p className="muted small">Using a custom date range.</p>}
    </section>
  );
}
