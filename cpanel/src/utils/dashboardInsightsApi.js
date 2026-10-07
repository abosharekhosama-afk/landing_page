import { apiRequest } from "./api.js";

export function fetchDashboardInsights({ timezoneOffsetMinutes } = {}) {
  const params = new URLSearchParams();
  if (Number.isFinite(Number(timezoneOffsetMinutes))) {
    params.set("tz_offset", String(timezoneOffsetMinutes));
  }
  const query = params.toString();
  return apiRequest(`/admin/dashboard/insights${query ? `?${query}` : ""}`);
}

export function fetchSearchAnalytics({ siteId } = {}) {
  const params = new URLSearchParams();
  if (siteId) params.set("site_id", siteId);
  const query = params.toString();
  return apiRequest(`/admin/analytics/search${query ? `?${query}` : ""}`);
}

export function fetchSearchRedirects() {
  return apiRequest("/admin/analytics/search/redirects");
}

export function saveSearchRedirect(body) {
  return apiRequest("/admin/analytics/search/redirects", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateSearchRedirect(id, body) {
  return apiRequest(`/admin/analytics/search/redirects/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function deleteSearchRedirect(id) {
  return apiRequest(`/admin/analytics/search/redirects/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export function fetchVisitorAnalytics({ siteId } = {}) {
  const params = new URLSearchParams();
  if (siteId) params.set("site_id", siteId);
  const query = params.toString();
  return apiRequest(`/admin/analytics/visitors${query ? `?${query}` : ""}`);
}

export function fetchLiveVisitors({ siteId } = {}) {
  const params = new URLSearchParams();
  if (siteId) params.set("site_id", siteId);
  const query = params.toString();
  return apiRequest(`/admin/analytics/visitors/live${query ? `?${query}` : ""}`);
}
