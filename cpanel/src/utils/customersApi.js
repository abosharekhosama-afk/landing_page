import { apiRequest } from "./api.js";

export const customerEditableFields = [
  "firstName",
  "lastName",
  "email",
  "phone",
  "type",
  "source",
  "labels",
  "notes",
  "accountType",
];

function customerPath(customerId, suffix = "") {
  return `/admin/customers/${encodeURIComponent(customerId)}${suffix}`;
}

export function buildCustomerQuery(filters = {}) {
  const params = new URLSearchParams();
  for (const key of ["q", "type", "archived", "page", "limit"]) {
    const value = filters[key];
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function unwrapCustomersResponse(data) {
  if (Array.isArray(data)) {
    return {
      items: data,
      total: data.length,
      page: 1,
      limit: data.length || 25,
      summary: null,
      paginated: false,
    };
  }
  const items = Array.isArray(data?.items) ? data.items : [];
  return {
    items,
    total: Number.isFinite(Number(data?.total)) ? Number(data.total) : items.length,
    page: Number.isFinite(Number(data?.page)) ? Number(data.page) : 1,
    limit: Number.isFinite(Number(data?.limit)) ? Number(data.limit) : 25,
    summary: data?.summary && typeof data.summary === "object" ? data.summary : null,
    paginated: true,
  };
}

export function sanitizeCustomerPayload(values = {}, initial = null) {
  const payload = {};
  for (const field of customerEditableFields) {
    if (!Object.prototype.hasOwnProperty.call(values, field)) continue;
    const value = field === "labels"
      ? (Array.isArray(values.labels) ? values.labels : String(values.labels || "").split(","))
        .map((label) => String(label).trim()).filter(Boolean)
      : String(values[field] ?? "").trim();
    const previous = field === "labels"
      ? (Array.isArray(initial?.labels) ? initial.labels : [])
      : String(initial?.[field] ?? "").trim();
    if (!initial || JSON.stringify(value) !== JSON.stringify(previous)) payload[field] = value;
  }
  return payload;
}

// Real review count for a customer contact. Accepts the field from the
// customers API (reviewCount) and falls back to 0 when absent so the CRM
// tables never render a fake number.
export function customerReviewCount(contact) {
  const value = Number(contact?.reviewCount);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function fetchCustomers(filters = {}, options = {}) {
  const wantsEnvelope = filters.page !== undefined || filters.limit !== undefined;
  return apiRequest(`/admin/customers${buildCustomerQuery(filters)}`, { signal: options.signal }).then((data) => {
    if (wantsEnvelope) return unwrapCustomersResponse(data);
    if (Array.isArray(data)) return data;
    return unwrapCustomersResponse(data).items;
  });
}

export function fetchCustomer(customerId, options = {}) {
  return apiRequest(customerPath(customerId), { signal: options.signal });
}

export function createCustomer(values) {
  return apiRequest("/admin/customers", {
    method: "POST",
    body: JSON.stringify(sanitizeCustomerPayload(values)),
  });
}

export function updateCustomer(customerId, values, initial) {
  const payload = sanitizeCustomerPayload(values, initial);
  if (!Object.keys(payload).length) return Promise.resolve(initial);
  return apiRequest(customerPath(customerId), {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function archiveCustomer(customerId) {
  return apiRequest(customerPath(customerId, "/archive"), { method: "POST" });
}

export function restoreCustomer(customerId) {
  return apiRequest(customerPath(customerId, "/restore"), { method: "POST" });
}
