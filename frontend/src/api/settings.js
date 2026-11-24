import { request } from "./client.js";

export const getOpeningBalance = () => request("/api/settings/opening-balance");
export const setOpeningBalance = (amount) =>
  request("/api/settings/opening-balance", { method: "PUT", body: { amount } });
