import { apiBaseUrl, getToken } from "./api.js";
import { storefrontTenantHeaders } from "./storefrontContentApi.js";

const API = `${apiBaseUrl}/velvet-dropshipping`;
const ADMIN = `${apiBaseUrl}/admin/velvet-dropshipping`;

async function request(path, { method = "GET", body, token, session = false, headers = {} } = {}) {
  const auth = token || (session ? getToken() : "");
  const response = await fetch(path, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(auth ? { Authorization: `Bearer ${auth}` } : storefrontTenantHeaders()),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.message || "Request failed.");
    error.code = payload.code;
    error.status = response.status;
    throw error;
  }
  return payload;
}

export const velvetApi = {
  store: (slug) => request(`${API}/stores/${encodeURIComponent(slug)}`),
  checkout: (slug, body, idempotencyKey) => request(`${API}/stores/${encodeURIComponent(slug)}/checkout`, {
    method: "POST",
    body,
    headers: { "Idempotency-Key": idempotencyKey },
  }),
  register: (body) => request(`${API}/register`, { method: "POST", body }),
  me: (token) => request(`${API}/me`, { token }),
  catalog: (token) => request(`${API}/catalog`, { token }),
  addProduct: (token, offerId) => request(`${API}/merchant-products`, { method: "POST", token, body: { offerId } }),
  products: (token) => request(`${API}/merchant-products`, { token }),
  removeProduct: (token, id) => request(`${API}/merchant-products/${id}/remove`, { method: "POST", token }),
  retryImage: (token, id) => request(`${API}/merchant-products/${id}/retry-image`, { method: "POST", token }),
  updateStore: (token, body) => request(`${API}/store`, { method: "PATCH", token, body }),
  orders: (token) => request(`${API}/orders`, { token }),
  notifications: (token) => request(`${API}/notifications`, { token }),
  readNotification: (token, id) => request(`${API}/notifications/${id}/read`, { method: "POST", token }),
  resolve: (token, orderId, body) => request(`${API}/orders/${orderId}/resolve`, { method: "POST", token, body }),
  whatsapp: (token, orderId) => request(`${API}/orders/${orderId}/whatsapp`, { method: "POST", token }),
  confirm: (token, orderId) => request(`${API}/orders/${orderId}/confirm`, { method: "POST", token }),
  cancel: (token, orderId) => request(`${API}/orders/${orderId}/cancel`, { method: "POST", token }),
  savePayout: (token, body) => request(`${API}/payout`, { method: "PUT", token, body }),
  earnings: (token) => request(`${API}/earnings`, { token }),
  settlements: (token) => request(`${API}/settlements`, { token }),
  adminOrders: ({ merchantId = "", storeId = "" } = {}) => {
    const params = new URLSearchParams();
    if (merchantId) params.set("merchantId", merchantId);
    if (storeId) params.set("storeId", storeId);
    const query = params.toString();
    return request(`${ADMIN}/orders${query ? `?${query}` : ""}`, { session: true });
  },
  adminOffers: () => request(`${ADMIN}/offers`, { session: true }),
  adminMerchants: () => request(`${ADMIN}/merchants`, { session: true }),
  setActivation: (id, body) => request(`${ADMIN}/merchants/${id}/activation`, { method: "POST", session: true, body }),
  warehouseMiss: (orderId, lineId) => request(`${ADMIN}/orders/${orderId}/warehouse-miss`, { method: "POST", session: true, body: { lineId } }),
  adminSettlements: () => request(`${ADMIN}/settlements`, { session: true }),
  saveOffer: (body) => request(`${ADMIN}/offers`, { method: "PUT", session: true, body }),
  fulfill: (orderId, status) => request(`${ADMIN}/orders/${orderId}/fulfillment`, { method: "POST", session: true, body: { status } }),
  closeSettlement: (thursday) => request(`${ADMIN}/settlements/close`, { method: "POST", session: true, body: { thursday } }),
  paySettlement: (id, reference = "") => request(`${ADMIN}/settlements/${id}/pay`, { method: "POST", session: true, body: { reference } }),
};
