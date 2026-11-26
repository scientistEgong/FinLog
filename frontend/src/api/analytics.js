// 1. Request date-filtered financial analysis from the backend.
import { request } from "./client.js";

export function getAnalytics(filters) {
  return request("/api/analytics", { params: filters });
}
