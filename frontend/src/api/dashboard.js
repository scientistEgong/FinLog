// Dashboard totals come from backend services; the browser only formats layout.
import { request } from "./client.js";

export const getDashboardSummary = () => request("/api/dashboard");
