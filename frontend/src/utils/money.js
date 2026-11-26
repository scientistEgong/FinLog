export function formatKobo(value) {
  return `₦${(Number(value || 0) / 100).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function compactKobo(value) {
  return `₦${(Number(value || 0) / 100).toLocaleString("en-NG", {
    notation: "compact",
    maximumFractionDigits: 1,
  })}`;
}

export function formatPercent(value) {
  if (value === null || value === undefined || value === "") return "Unavailable";
  return `${Number(value).toLocaleString("en-NG", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;
}
