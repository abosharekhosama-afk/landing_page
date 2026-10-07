import { apiRequest } from "./api.js";

export async function fetchAutomaticDiscounts() {
  return apiRequest("/admin/discounts");
}

export async function createAutomaticDiscount(payload) {
  return apiRequest("/admin/discounts", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateAutomaticDiscount(id, payload) {
  return apiRequest(`/admin/discounts/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deactivateAutomaticDiscount(id) {
  return apiRequest(`/admin/discounts/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}
