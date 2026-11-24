// Single place that talks to the FastAPI backend. No money maths happens in the frontend.

export class ApiError extends Error {
  constructor(message, status, fields = {}) {
    super(message);
    this.status = status;
    this.fields = fields; // { fieldName: message } for showing errors beside inputs
  }
}

// Turns FastAPI's error "detail" (a string, or a list of {loc, msg}) into text + per-field messages.
export function parseErrorDetail(detail) {
  if (typeof detail === "string") return { message: detail, fields: {} };
  if (Array.isArray(detail)) {
    const fields = {};
    const parts = detail.map((item) => {
      const msg = String(item.msg || "Invalid value").replace(/^Value error,\s*/, "");
      const path = Array.isArray(item.loc) ? item.loc.filter((p) => p !== "body" && p !== "query") : [];
      const field = path.length ? String(path[path.length - 1]) : "";
      if (field && !fields[field]) fields[field] = msg;
      return field ? `${field}: ${msg}` : msg;
    });
    return { message: parts.join("; "), fields };
  }
  return { message: "The request could not be completed.", fields: {} };
}

export async function request(path, { method = "GET", body, params } = {}) {
  let url = path;
  if (params) {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== "" && value !== null && value !== undefined) search.append(key, value);
    });
    const text = search.toString();
    if (text) url += `?${text}`;
  }

  let response;
  try {
    response = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError("Cannot reach the FinLog backend. Is it running on port 8000?", 0);
  }

  if (response.status === 204) return null;
  let data = null;
  try {
    data = await response.json();
  } catch {
    /* non-JSON response */
  }
  if (!response.ok) {
    const { message, fields } = parseErrorDetail(data && data.detail);
    throw new ApiError(message, response.status, fields);
  }
  return data;
}
