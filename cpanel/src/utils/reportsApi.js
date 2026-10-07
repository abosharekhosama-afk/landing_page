import { apiRequest } from "./api.js";

export function fetchReportsSummary({ dateFrom, dateTo } = {}) {
  const params = new URLSearchParams();
  if (dateFrom) params.set("date_from", dateFrom);
  if (dateTo) params.set("date_to", dateTo);
  const query = params.toString();
  return apiRequest(`/admin/reports/summary${query ? `?${query}` : ""}`);
}
