import { inventoryProduct } from "./inventory.js";
import {
  productIsBestseller,
  productIsFeatured,
  productIsNewArrival,
} from "./merchandisingFlags.js";

export const DEFAULT_PRODUCT_PAGE_LIMIT = 25;
export const MAX_PRODUCT_PAGE_LIMIT = 100;
export const DEFAULT_LOW_STOCK_THRESHOLD = 5;

function asText(value) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    return [value.en, value.ar, value.he].filter(Boolean).join(" ");
  }
  return String(value);
}

export function productSearchHaystack(product = {}) {
  return [
    asText(product.name),
    product.sku,
    product.id,
    product.slug,
    product.barcode,
    ...(Array.isArray(product.variants) ? product.variants.map((variant) => variant?.sku) : []),
  ]
    .map((part) => String(part || "").toLowerCase())
    .join(" ");
}

export function productStockQty(product = {}) {
  return inventoryProduct(product).stock;
}

export function stockFilterBucket(stock, threshold = DEFAULT_LOW_STOCK_THRESHOLD) {
  if (stock <= 0) return "out";
  if (stock <= threshold) return "low";
  return "in";
}

export function productMatchesMerchandising(product, merchandising) {
  const merch = String(merchandising || "all");
  if (!merch || merch === "all") return true;
  if (merch === "featured") return productIsFeatured(product);
  if (merch === "newArrival") return productIsNewArrival(product);
  if (merch === "bestseller") return productIsBestseller(product);
  if (merch === "promotions") {
    return Array.isArray(product.collection) && product.collection.includes("promotions-discounts");
  }
  return true;
}

export function parseProductListQuery(query = {}, { lowStockThreshold = DEFAULT_LOW_STOCK_THRESHOLD } = {}) {
  const rawPage = Number(query.page);
  const rawLimit = Number(query.limit);
  const wantsPagination = query.page !== undefined || query.limit !== undefined;
  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
  const limit = Number.isFinite(rawLimit) && rawLimit > 0
    ? Math.min(MAX_PRODUCT_PAGE_LIMIT, Math.floor(rawLimit))
    : DEFAULT_PRODUCT_PAGE_LIMIT;

  return {
    wantsPagination,
    page,
    limit,
    q: String(query.q || query.search || "").trim().toLowerCase(),
    brand: String(query.brand || "all"),
    category: String(query.category || "all"),
    status: String(query.status || "all"),
    stock: String(query.stock || "all"),
    merchandising: String(query.merchandising || "all"),
    lowStockThreshold: Number.isFinite(Number(lowStockThreshold))
      ? Number(lowStockThreshold)
      : DEFAULT_LOW_STOCK_THRESHOLD,
    view: String(query.view || ""),
  };
}

export function sortProductsBySortOrder(products = []) {
  return [...products].sort((left, right) => {
    const leftOrder = Number(left.sortOrder ?? left.sort_order);
    const rightOrder = Number(right.sortOrder ?? right.sort_order);
    const leftRank = Number.isFinite(leftOrder) ? leftOrder : Number.MAX_SAFE_INTEGER;
    const rightRank = Number.isFinite(rightOrder) ? rightOrder : Number.MAX_SAFE_INTEGER;
    if (leftRank !== rightRank) return leftRank - rightRank;
    return String(left.id || "").localeCompare(String(right.id || ""));
  });
}

export function filterProductsForAdminList(products = [], filters = {}) {
  const {
    q = "",
    brand = "all",
    category = "all",
    status = "all",
    stock = "all",
    merchandising = "all",
    lowStockThreshold = DEFAULT_LOW_STOCK_THRESHOLD,
  } = filters;

  return products.filter((product) => {
    const matchesSearch = !q || productSearchHaystack(product).includes(q);
    const matchesBrand = !brand || brand === "all" || String(product.brandId || "") === brand;
    const matchesCategory = !category || category === "all" || String(product.categoryId || "") === category;
    const matchesStatus = !status || status === "all"
      || (status === "active" ? product.isActive !== false : product.isActive === false);
    const qty = productStockQty(product);
    const matchesStock = !stock || stock === "all" || stockFilterBucket(qty, lowStockThreshold) === stock;
    const matchesMerchandising = productMatchesMerchandising(product, merchandising);
    return matchesSearch && matchesBrand && matchesCategory && matchesStatus && matchesStock && matchesMerchandising;
  });
}

export function paginateProducts(products = [], page = 1, limit = DEFAULT_PRODUCT_PAGE_LIMIT) {
  const safeLimit = Math.max(1, Math.min(MAX_PRODUCT_PAGE_LIMIT, Number(limit) || DEFAULT_PRODUCT_PAGE_LIMIT));
  const total = products.length;
  const totalPages = Math.max(1, Math.ceil(total / safeLimit) || 1);
  const safePage = Math.min(Math.max(1, Number(page) || 1), totalPages);
  const start = (safePage - 1) * safeLimit;
  return {
    items: products.slice(start, start + safeLimit),
    total,
    page: safePage,
    limit: safeLimit,
    totalPages,
  };
}
