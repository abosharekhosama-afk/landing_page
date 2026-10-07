import { apiRequest } from "./api.js";

export function fetchActivityLogs(filters = {}) {
  const params = new URLSearchParams();
  const entries = {
    action: filters.action,
    entity_type: filters.entityType || filters.entity_type,
    actor_email: filters.actorEmail || filters.actor_email,
    actor_id: filters.actorId || filters.actor_id,
    date_from: filters.dateFrom || filters.date_from,
    date_to: filters.dateTo || filters.date_to,
    page: filters.page,
    limit: filters.limit,
  };
  Object.entries(entries).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      params.set(key, String(value));
    }
  });
  const query = params.toString();
  return apiRequest(`/admin/activity-log${query ? `?${query}` : ""}`);
}

export function fetchActivityLog(logId) {
  return apiRequest(`/admin/activity-log/${encodeURIComponent(logId)}`);
}
