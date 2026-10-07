import { apiRequest } from "./api.js";

export const DEFAULT_PRODUCTS_PAGE_SIZE = 25;

export function buildProductsQuery(filters = {}) {
  const params = new URLSearchParams();
  for (const key of [
    "page",
    "limit",
    "q",
    "search",
    "brand",
    "category",
    "status",
    "stock",
    "merchandising",
    "trash",
    "view",
  ]) {
    const value = filters[key];
    if (value === undefined || value === null || value === "") continue;
    if (value === "all" && ["brand", "category", "status", "stock", "merchandising"].includes(key)) continue;
    params.set(key, String(value));
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function unwrapProductsResponse(data) {
  if (Array.isArray(data)) {
    return {
      items: data,
      total: data.length,
      page: 1,
      limit: data.length || DEFAULT_PRODUCTS_PAGE_SIZE,
      paginated: false,
    };
  }
  const items = Array.isArray(data?.items)
    ? data.items
    : (Array.isArray(data?.products) ? data.products : []);
  return {
    items,
    total: Number.isFinite(Number(data?.total)) ? Number(data.total) : items.length,
    page: Number.isFinite(Number(data?.page)) ? Number(data.page) : 1,
    limit: Number.isFinite(Number(data?.limit)) ? Number(data.limit) : DEFAULT_PRODUCTS_PAGE_SIZE,
    paginated: true,
  };
}

export function fetchProducts(filters = {}) {
  const wantsEnvelope = filters.page !== undefined
    || filters.limit !== undefined
    || Boolean(filters.q || filters.search)
    || (filters.brand && filters.brand !== "all")
    || (filters.category && filters.category !== "all")
    || (filters.status && filters.status !== "all")
    || (filters.stock && filters.stock !== "all")
    || (filters.merchandising && filters.merchandising !== "all");

  return apiRequest(`/products${buildProductsQuery(filters)}`).then((data) => {
    if (wantsEnvelope) return unwrapProductsResponse(data);
    if (Array.isArray(data)) return data;
    return unwrapProductsResponse(data).items;
  });
}

export function fetchProductSortIds() {
  return apiRequest(`/products${buildProductsQuery({ view: "ids" })}`).then((data) => (
    Array.isArray(data?.ids) ? data.ids : (Array.isArray(data) ? data.map((row) => row?.id).filter(Boolean) : [])
  ));
}

export function createProduct(product) {
  return apiRequest("/products", {
    method: "POST",
    body: JSON.stringify(product),
  });
}

export function updateProduct(product) {
  return apiRequest(`/products/${product.id}`, {
    method: "PUT",
    body: JSON.stringify(product),
  });
}

export function duplicateProduct(productId) {
  return apiRequest(`/products/${encodeURIComponent(productId)}/duplicate`, {
    method: "POST",
  });
}

export function deactivateProduct(productId) {
  return apiRequest(`/products/${encodeURIComponent(productId)}`, {
    method: "PUT",
    body: JSON.stringify({ id: productId, isActive: false }),
  });
}

export function reorderProducts(productIds) {
  return apiRequest("/admin/products/reorder", {
    method: "PATCH",
    body: JSON.stringify({ productIds }),
  });
}

function displayPriorityQuery({ surface, brandId } = {}) {
  const params = new URLSearchParams();
  if (surface) params.set("surface", surface);
  if (brandId) params.set("brandId", brandId);
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function fetchProductDisplayPriority(scope) {
  return apiRequest(`/admin/product-display-priority${displayPriorityQuery(scope)}`);
}

export function saveProductDisplayPriority(body) {
  return apiRequest("/admin/product-display-priority", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export function deleteProductDisplayPriority(scope) {
  return apiRequest(`/admin/product-display-priority${displayPriorityQuery(scope)}`, {
    method: "DELETE",
  });
}

export function deleteProduct(productId) {
  return apiRequest(`/products/${productId}`, {
    method: "DELETE",
  });
}

export function fetchTrashedProducts() {
  return apiRequest("/products?trash=true").then((data) => unwrapProductsResponse(data).items);
}

export function restoreProduct(productId) {
  return apiRequest(`/products/${encodeURIComponent(productId)}/restore`, {
    method: "POST",
  });
}

export function permanentlyDeleteProduct(productId) {
  return apiRequest(`/products/${encodeURIComponent(productId)}/permanent`, {
    method: "DELETE",
  });
}

export function fetchProductRelations(productId, type) {
  const params = new URLSearchParams({ type });
  return apiRequest(`/products/${encodeURIComponent(productId)}/relations?${params}`);
}

export function replaceProductRelations(productId, type, targetProductIds) {
  const params = new URLSearchParams({ type });
  return apiRequest(`/products/${encodeURIComponent(productId)}/relations?${params}`, {
    method: "PUT",
    body: JSON.stringify({ targetProductIds }),
  });
}
