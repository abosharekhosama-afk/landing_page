import { apiRequest } from "./api.js";

export async function fetchCoupons() {
  return apiRequest("/admin/coupons");
}

export async function createCoupon(payload) {
  return apiRequest("/admin/coupons", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateCoupon(id, payload) {
  return apiRequest(`/admin/coupons/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deactivateCoupon(id) {
  return apiRequest(`/admin/coupons/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function validateCouponCode(code, subtotal) {
  return apiRequest("/coupons/validate", {
    method: "POST",
    body: JSON.stringify({ code, subtotal }),
  });
}
