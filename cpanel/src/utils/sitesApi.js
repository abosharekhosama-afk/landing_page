import { apiRequest } from "./api.js";

export async function fetchSites() {
  const payload = await apiRequest("/admin/sites", { cache: "no-store" });
  if (!payload || !Array.isArray(payload.items)) throw new TypeError("Sites list is invalid.");
  return payload.items;
}

export async function fetchSite(siteId) {
  const payload = await apiRequest(`/admin/sites/${encodeURIComponent(siteId)}`, { cache: "no-store" });
  if (!payload || typeof payload !== "object") throw new TypeError("Site is invalid.");
  return payload;
}

export async function createSite(body) {
  return apiRequest("/admin/sites", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

async function updateSiteStatus(siteId, status) {
  const payload = await apiRequest(`/admin/sites/${encodeURIComponent(siteId)}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
  if (!payload || typeof payload !== "object") throw new TypeError("Site is invalid.");
  return payload;
}

export function archiveSite(siteId) {
  return updateSiteStatus(siteId, "archived");
}

export function restoreSite(siteId) {
  return updateSiteStatus(siteId, "active");
}