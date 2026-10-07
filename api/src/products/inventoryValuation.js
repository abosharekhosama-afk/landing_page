import { productSearchHaystack, productStockQty, stockFilterBucket } from "./productListQuery.js";

/**
 * T2 #8 — Inventory Valuation (single-stock model, no warehouses).
 * Pure / unit-testable: variant-vs-product aggregation, trustworthy cost,
 * effective selling price, summary, cost-status filter, permission masking.
 */

export const VALUATION_PAGE_LIMIT_DEFAULT = 25;
export const VALUATION_PAGE_LIMIT_MAX = 100;
export const VALUATION_COST_STATUSES = Object.freeze(["ALL", "HAS_COST", "MISSING_COST"]);

function finiteNonNegativeNumber(value) {
  const parsed = typeof value === "string" && value.trim() === "" ? NaN : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

function roundMoney(value) {
  return Math.round(Number(value) * 100) / 100;
}

/**
 * Trustworthy cost: finite number >= 0. 0 is valid.
 * null/undefined/""/NaN/negative => missing. Never coerce missing to 0.
 */
export function trustworthyCostPrice(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed * 100) / 100;
}

export function readCostSource(entry = {}) {
  if (Object.prototype.hasOwnProperty.call(entry, "costPrice")) return entry.costPrice;
  if (Object.prototype.hasOwnProperty.call(entry, "cost_price")) return entry.cost_price;
  if (entry?.data && typeof entry.data === "object") {
    if (Object.prototype.hasOwnProperty.call(entry.data, "costPrice")) return entry.data.costPrice;
    if (Object.prototype.hasOwnProperty.call(entry.data, "cost_price")) return entry.data.cost_price;
  }
  return undefined;
}

/**
 * Effective selling price mirrors resolvePublicSalePrice: active sale < regular wins.
 * Returns null when no trustworthy retail price exists (never defaults to 0).
 */
export function effectiveRetailPrice(entry = {}) {
  const regular = finiteNonNegativeNumber(
    entry.price ?? entry.basePrice ?? entry.regularPrice ?? entry?.data?.price,
  );
  if (regular == null) return null;
  const rawSale = entry.sale_price ?? entry.salePrice ?? entry?.data?.sale_price ?? entry?.data?.salePrice;
  if (rawSale === null || rawSale === undefined || rawSale === "") return regular;
  const sale = Number(rawSale);
  if (Number.isFinite(sale) && sale >= 0 && sale < regular) return sale;
  return regular;
}

export function normalizeValuationQuantity(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return { quantity: 0, hasDataIssue: true };
  if (parsed < 0) return { quantity: 0, hasDataIssue: true };
  return { quantity: parsed, hasDataIssue: false };
}

function localizedText(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return String(value.en ?? value.ar ?? "");
  }
  return String(value || "");
}

function variantLabel(variant = {}) {
  const color = localizedText(variant.colorName || variant.color_name || variant.data?.colorName || "");
  const size = String(variant.size || variant.data?.size || "");
  return [color, size].filter(Boolean).join(" · ");
}

export function stockStatusFor(quantity, threshold = 5) {
  const qty = Number(quantity);
  if (!Number.isFinite(qty) || qty <= 0) return "out";
  const thr = Number.isFinite(Number(threshold)) ? Number(threshold) : 5;
  if (qty <= thr) return "low";
  return "in";
}
function buildRow(input) {
  const normalized = normalizeValuationQuantity(input.quantity);
  const qty = normalized.quantity;
  const hasCost = input.costPerUnit != null;
  const hasRetail = input.retailPerUnit != null;
  const costValue = hasCost ? roundMoney(qty * input.costPerUnit) : null;
  const retailValue = hasRetail ? roundMoney(qty * input.retailPerUnit) : null;
  const product = input.product || {};
  const variant = input.variant || null;
  return {
    productId: String(product.id || ""),
    productName: product.name ?? "",
    slug: String(product.slug || product.id || ""),
    variantId: input.variantId || null,
    variantLabel: variant ? variantLabel(variant) : "",
    sku: String(variant?.sku || variant?.data?.sku || product.sku || product.data?.sku || ""),
    brandId: product.brandId ?? product.brand_id ?? null,
    mainCategoryId: product.mainCategoryId ?? product.main_category_id ?? null,
    subcategoryId: product.subcategoryId ?? product.subCategoryId ?? product.categoryId ?? product.category_id ?? null,
    quantity: qty,
    hasDataIssue: normalized.hasDataIssue,
    stockStatus: stockStatusFor(qty, input.threshold),
    costPerUnit: input.costPerUnit,
    retailPerUnit: input.retailPerUnit,
    costValue,
    retailValue,
    potentialMargin: hasCost && hasRetail ? roundMoney(retailValue - costValue) : null,
    costStatus: hasCost ? "HAS_COST" : "MISSING_COST",
    isActive: product.isActive ?? product.is_active ?? true,
  };
}

export function buildValuationRows(products = [], options = {}) {
  const lowStockThreshold = options.lowStockThreshold ?? 5;
  const rows = [];
  const list = Array.isArray(products) ? products : [];
  for (const product of list) {
    const variants = Array.isArray(product?.variants) ? product.variants : [];
    if (variants.length) {
      for (const variant of variants) {
        rows.push(buildRow({
          product, variant, variantId: String(variant?.id || ""),
          quantity: variant?.stock ?? variant?.stockQty ?? variant?.data?.stock ?? 0,
          costPerUnit: trustworthyCostPrice(readCostSource(variant)),
          retailPerUnit: effectiveRetailPrice(variant),
          threshold: lowStockThreshold,
        }));
      }
    } else {
      const plainPrice = product?.price ?? product?.basePrice;
      const sized = Array.isArray(product?.sizes) && product.sizes[0]?.price != null && plainPrice == null
        ? { price: product.sizes[0].price } : product;
      rows.push(buildRow({
        product, variant: null, variantId: null,
        quantity: product?.stockQty ?? product?.stock_qty ?? product?.stock ?? product?.data?.stockQty ?? 0,
        costPerUnit: trustworthyCostPrice(readCostSource(product)),
        retailPerUnit: effectiveRetailPrice(sized || {}),
        threshold: lowStockThreshold,
      }));
    }
  }
  return rows;
}


export function normalizeCostStatusFilter(value) {
  const normalized = String(value || "ALL").trim().toUpperCase();
  return VALUATION_COST_STATUSES.includes(normalized) ? normalized : "ALL";
}

export function filterRowsByCostStatus(rows = [], costStatus = "ALL") {
  const status = normalizeCostStatusFilter(costStatus);
  if (status === "ALL") return [...rows];
  return rows.filter((row) => row?.costStatus === status);
}

export function summarizeValuation(rows = [], options = {}) {
  const currency = String(options.currency || "ILS").toUpperCase();
  let totalQuantity = 0;
  let costValue = 0;
  let retailValue = 0;
  let marginCostValue = 0;
  let marginRetailValue = 0;
  let missingCostCount = 0;
  const productsWithStock = new Set();
  for (const row of rows) {
    const qty = Number(row?.quantity || 0);
    totalQuantity += qty;
    if (qty > 0 && row?.productId) productsWithStock.add(String(row.productId));
    // Missing cost must never be treated as zero: exclude from cost totals and
    // from margin (margin uses only rows that have both trustworthy cost + retail).
    if (row?.costValue != null) costValue += Number(row.costValue);
    if (row?.retailValue != null) retailValue += Number(row.retailValue);
    if (row?.costValue != null && row?.retailValue != null) {
      marginCostValue += Number(row.costValue);
      marginRetailValue += Number(row.retailValue);
    }
    if (qty > 0 && row?.costStatus === "MISSING_COST") missingCostCount += 1;
  }
  costValue = roundMoney(costValue);
  retailValue = roundMoney(retailValue);
  totalQuantity = roundMoney(totalQuantity);
  return {
    totalQuantity, productsWithStock: productsWithStock.size, costValue, retailValue,
    potentialMargin: roundMoney(marginRetailValue - marginCostValue),
    missingCostCount, valuationComplete: missingCostCount === 0, currency,
  };
}

export function emptyValuationSummary(options = {}) {
  const currency = String(options.currency || "ILS").toUpperCase();
  return {
    totalQuantity: 0, productsWithStock: 0, costValue: 0, retailValue: 0,
    potentialMargin: 0, missingCostCount: 0, valuationComplete: true, currency,
  };
}

export function stripCostFromValuation(payload = {}) {
  const summary = { ...(payload.summary || {}) };
  summary.costValue = null;
  summary.potentialMargin = null;
  summary.missingCostCount = null;
  summary.valuationComplete = null;
  summary.costVisible = false;
  const items = (Array.isArray(payload.items) ? payload.items : []).map((row) => ({
    ...row, costPerUnit: null, costValue: null, potentialMargin: null, costStatus: null,
  }));
  return { ...payload, summary, items };
}

export function withCostVisibility(payload = {}, costVisible = true) {
  if (!costVisible) return stripCostFromValuation(payload);
  const summary = { ...(payload.summary || {}), costVisible: true };
  return { ...payload, summary };
}

export function paginateValuationRows(rows = [], page = 1, limit = VALUATION_PAGE_LIMIT_DEFAULT) {
  const safeLimit = Math.max(1, Math.min(VALUATION_PAGE_LIMIT_MAX, Number(limit) || VALUATION_PAGE_LIMIT_DEFAULT));
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / safeLimit) || 1);
  const safePage = Math.min(Math.max(1, Number(page) || 1), totalPages);
  const start = (safePage - 1) * safeLimit;
  return { items: rows.slice(start, start + safeLimit), total, page: safePage, limit: safeLimit, totalPages };
}

export function parseValuationQuery(query = {}) {
  const rawPage = Number(query.page);
  const rawLimit = Number(query.limit);
  return {
    page: Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1,
    limit: Number.isFinite(rawLimit) && rawLimit > 0
      ? Math.min(VALUATION_PAGE_LIMIT_MAX, Math.floor(rawLimit)) : VALUATION_PAGE_LIMIT_DEFAULT,
    q: String(query.q || query.search || "").trim().toLowerCase(),
    brand: String(query.brand || "all"),
    category: String(query.category || query.mainCategory || "all"),
    status: String(query.status || "all"),
    stock: String(query.stock || "all"),
    merchandising: String(query.merchandising || "all"),
    lowStockThreshold: query.lowStockThreshold,
    costStatus: normalizeCostStatusFilter(query.costStatus || query.cost_status || "ALL"),
  };
}

export function filterProductsForValuation(products = [], filters = {}) {
  const lowStockThreshold = Number.isFinite(Number(filters.lowStockThreshold))
    ? Number(filters.lowStockThreshold)
    : 5;
  const q = String(filters.q || "").trim().toLowerCase();
  return (Array.isArray(products) ? products : []).filter((product) => {
    const matchesSearch = !q || productSearchHaystack(product).includes(q);
    const matchesBrand = !filters.brand || filters.brand === "all"
      || String(product.brandId || "") === String(filters.brand);
    const matchesCategory = !filters.category || filters.category === "all"
      || [product.categoryId, product.mainCategoryId, product.subcategoryId, product.subCategoryId]
        .map((value) => String(value || "")).includes(String(filters.category));
    const matchesStatus = !filters.status || filters.status === "all"
      || (filters.status === "active" ? product.isActive !== false : product.isActive === false);
    const qty = productStockQty(product);
    const matchesStock = !filters.stock || filters.stock === "all"
      || stockFilterBucket(qty, lowStockThreshold) === filters.stock;
    return matchesSearch && matchesBrand && matchesCategory && matchesStatus && matchesStock;
  });
}
