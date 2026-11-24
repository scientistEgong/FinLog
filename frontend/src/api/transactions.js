// Transaction endpoint wrappers; server owns validation and monetary conversion.
import { request } from "./client.js";

export const listTransactions = (params) => request("/api/transactions", { params });
export const createTransaction = (body) => request("/api/transactions", { method: "POST", body });
export const updateTransaction = (id, body) => request(`/api/transactions/${id}`, { method: "PUT", body });
export const removeTransaction = (id) => request(`/api/transactions/${id}`, { method: "DELETE" });
