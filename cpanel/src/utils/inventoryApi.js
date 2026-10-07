import { apiRequest } from "./api.js";

export const DEFAULT_INVENTORY_PAGE_SIZE = 25;

export function buildInventoryQuery(filters = {}) {
  const params = new URLSearchParams();
  for (const key of ["page", "limit", "q", "search", "brand", "brandId", "mainCategory", "mainCategoryId", "main", "stock", "status"]) {
    const value = filters[key];
    if (value === undefined || value === null || value === "") continue;
    if (value === "all") continue;
    params.set(key, String(value));
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function unwrapInventoryResponse(data) {
  if (Array.isArray(data)) {
    return {
      items: data,
      total: data.length,
      page: 1,
      limit: data.length || DEFAULT_INVENTORY_PAGE_SIZE,
      summary: null,
      paginated: false,
    };
  }
  const items = Array.isArray(data?.items) ? data.items : [];
  return {
    items,
    total: Number.isFinite(Number(data?.total)) ? Number(data.total) : items.length,
    page: Number.isFinite(Number(data?.page)) ? Number(data.page) : 1,
    limit: Number.isFinite(Number(data?.limit)) ? Number(data.limit) : DEFAULT_INVENTORY_PAGE_SIZE,
    summary: data?.summary && typeof data.summary === "object" ? data.summary : null,
    paginated: true,
  };
}

export function fetchInventory(filters = {}) {
  const wantsEnvelope = filters.page !== undefined || filters.limit !== undefined;
  return apiRequest(`/admin/inventory${buildInventoryQuery(filters)}`).then((data) => {
    if (wantsEnvelope) return unwrapInventoryResponse(data);
    if (Array.isArray(data)) return data;
    return unwrapInventoryResponse(data).items;
  });
}

export function updateInventory(productId, body) {
  return apiRequest(`/admin/inventory/${encodeURIComponent(productId)}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function fetchInventoryValuation(params = {}) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return apiRequest(`/admin/inventory/valuation${query ? `?${query}` : ""}`);
}
