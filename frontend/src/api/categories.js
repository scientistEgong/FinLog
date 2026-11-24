import { request } from "./client.js";

export const listCategories = () => request("/api/categories");
export const createCategory = (name) => request("/api/categories", { method: "POST", body: { name } });
export const removeCategory = (id) => request(`/api/categories/${id}`, { method: "DELETE" });
