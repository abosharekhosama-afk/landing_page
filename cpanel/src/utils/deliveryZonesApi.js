import { apiRequest } from "./api.js";

export function fetchDeliveryZones() {
  return apiRequest("/admin/delivery-zones");
}

// Public storefront endpoint: returns only enabled zones for the resolved
// company/site context. Used by the checkout flow for zone-aware ordering.
export function fetchPublicDeliveryZones() {
  return apiRequest("/delivery-zones");
}

export function createDeliveryZone(body) {
  return apiRequest("/admin/delivery-zones", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateDeliveryZone(zoneId, body) {
  return apiRequest(`/admin/delivery-zones/${encodeURIComponent(zoneId)}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function deleteDeliveryZone(zoneId) {
  return apiRequest(`/admin/delivery-zones/${encodeURIComponent(zoneId)}`, {
    method: "DELETE",
  });
}
