import { apiRequest } from "./api.js";

export function fetchAdminBundles() {
  return apiRequest("/admin/bundles");
}

export function createAdminBundle(bundle) {
  return apiRequest("/admin/bundles", {
    method: "POST",
    body: JSON.stringify(bundle),
  });
}

export function updateAdminBundle(bundle) {
  return apiRequest(`/admin/bundles/${encodeURIComponent(bundle.id)}`, {
    method: "PATCH",
    body: JSON.stringify(bundle),
  });
}

export function deactivateAdminBundle(bundleId) {
  return apiRequest(`/admin/bundles/${encodeURIComponent(bundleId)}`, {
    method: "DELETE",
  });
}

export function fetchPublicBundles() {
  return apiRequest("/bundles");
}

export function fetchPublicBundle(slugOrId) {
  return apiRequest(`/bundles/${encodeURIComponent(slugOrId)}`);
}