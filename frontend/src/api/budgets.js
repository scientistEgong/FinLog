// Budget endpoints accept user-entered naira amounts and canonical period starts.
import { request } from "./client.js";

export const listBudgets = (params) => request("/api/budgets", { params });
export const createBudget = (body) => request("/api/budgets", { method: "POST", body });
export const updateBudget = (id, body) => request(`/api/budgets/${id}`, { method: "PUT", body });
export const removeBudget = (id) => request(`/api/budgets/${id}`, { method: "DELETE" });
