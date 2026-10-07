/**
 * Velvet workbook commerce planning — price, stock, active/visible, currency.
 * Pure functions; no DB writes.
 */

import {
  getSourceProductId,
  normalizeWorkbookProductId,
} from "./velvetWorkbookCatalog.js";

export const VELVET_TARGET_STOCK = 24;
export const VELVET_TARGET_CURRENCY = "ILS";
export const VELVET_STALE_VARIANT_PRICE = 18;

// Automatic size/volume defaults that the platform used to invent when a
// variant had no real size. These are safe to clear from kids-velvet staging
// data; genuine manual sizes (e.g. toy sizes) are never touched.
export const AUTOMATIC_SIZE_DEFAULTS = Object.freeze([
  "500ml",
  "1l",
  "1.5l",
  "500مل",
  "1ل",
  "1.5ل",
]);

export const PRODUCT_PRICE_FIELD = "price";
export const PRODUCT_STOCK_FIELD = "stockQty";
export const PRODUCT_ACTIVE_FIELDS = Object.freeze(["isActive", "active"]);
export const PRODUCT_VISIBLE_FIELD = "visible";
export const COMPANY_CURRENCY_FIELD = "settings.currency";
export const STOREFRONT_CURRENCY_SOURCE = "site.currency from GET /api/storefront/content";

function finitePrice(value) {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

export function parseWorkbookPrice(row = {}, classifiedRow = {}) {
  const raw = row.min_price
    ?? row.price_min
    ?? row["أقل سعر"]
    ?? classifiedRow["أقل سعر"]
    ?? classifiedRow.min_price
    ?? classifiedRow.price_min;
  return finitePrice(raw);
}

export function readProductStock(product = {}) {
  const variants = Array.isArray(product.variants) ? product.variants : [];
  if (variants.length) {
    return variants.reduce((total, variant) => total + Number(variant.stock ?? variant.stockQty ?? 0), 0);
  }
  const stock = product.stockQty ?? product.data?.stockQty;
  return stock == null ? 0 : Number(stock);
}

export function isProductActive(product = {}) {
  return product.isActive !== false && product.active !== false;
}

export function isProductVisible(product = {}) {
  return product.visible !== false;
}

export function readCompanyCurrency(company = {}) {
  return String(company.settings?.currency || company.currency || "").trim().toUpperCase();
}

export function buildInventoryPatch(product = {}, targetStock = VELVET_TARGET_STOCK) {
  const variants = Array.isArray(product.variants) ? product.variants.filter(Boolean) : [];
  if (variants.length) {
    return {
      mode: "variants",
      body: {
        variants: variants.map((variant) => ({
          id: String(variant.id || ""),
          stock: targetStock,
        })),
      },
    };
  }
  return {
    mode: "product",
    body: { stock: targetStock },
  };
}

export function buildProductCommercePatch(workbookPrice, {
  targetStock = VELVET_TARGET_STOCK,
} = {}) {
  return {
    [PRODUCT_PRICE_FIELD]: workbookPrice,
    [PRODUCT_ACTIVE_FIELDS[0]]: true,
    [PRODUCT_ACTIVE_FIELDS[1]]: true,
    [PRODUCT_VISIBLE_FIELD]: true,
    [PRODUCT_STOCK_FIELD]: targetStock,
  };
}

function indexExistingProducts(existingProducts = []) {
  const bySourceId = new Map();
  const duplicateSourceIds = [];
  for (const product of existingProducts) {
    const sourceId = getSourceProductId(product);
    if (!sourceId) continue;
    if (bySourceId.has(sourceId)) {
      duplicateSourceIds.push(sourceId);
      bySourceId.get(sourceId).push(product);
    } else {
      bySourceId.set(sourceId, [product]);
    }
  }
  return { bySourceId, duplicateSourceIds: [...new Set(duplicateSourceIds)] };
}

export function planVelvetWorkbookCommerceUpdate({
  workbookProducts = [],
  existingProducts = [],
  currentCompanyCurrency = "",
  targetStock = VELVET_TARGET_STOCK,
  targetCurrency = VELVET_TARGET_CURRENCY,
}) {
  const { bySourceId, duplicateSourceIds } = indexExistingProducts(existingProducts);
  const workbookById = new Map(
    workbookProducts.map((row) => [normalizeWorkbookProductId(row.sourceProductId), row]),
  );

  const missingSourceIds = [];
  const priceInvalid = [];
  const variantProducts = [];
  const wouldUpdate = [];
  const errors = [];

  let matchedToWorkbook = 0;
  let priceValid = 0;

  for (const [sourceId, row] of workbookById.entries()) {
    const price = finitePrice(row.minPrice);
    if (price == null) {
      priceInvalid.push(sourceId);
      continue;
    }
    priceValid += 1;

    const matches = bySourceId.get(sourceId) || [];
    if (!matches.length) {
      missingSourceIds.push(sourceId);
      continue;
    }
    if (matches.length > 1) {
      errors.push(`Ambiguous products for sourceProductId ${sourceId}: ${matches.map((item) => item.id).join(", ")}`);
      continue;
    }

    matchedToWorkbook += 1;
    const product = matches[0];
    const variants = Array.isArray(product.variants) ? product.variants : [];
    if (variants.length) {
      variantProducts.push({
        sourceProductId: sourceId,
        productId: product.id,
        variantCount: variants.length,
        variantIds: variants.map((variant) => String(variant.id || "")),
      });
    }

    const currentPrice = finitePrice(product.price ?? product.basePrice) ?? 0;
    const currentStock = readProductStock(product);
    const needsPrice = currentPrice !== price;
    const needsStock = currentStock !== targetStock;
    const needsActive = !isProductActive(product);
    const needsVisible = !isProductVisible(product);

    if (needsPrice || needsStock || needsActive || needsVisible) {
      wouldUpdate.push({
        sourceProductId: sourceId,
        productId: product.id,
        current: {
          price: currentPrice,
          stock: currentStock,
          active: isProductActive(product),
          visible: isProductVisible(product),
        },
        target: {
          price,
          stock: targetStock,
          active: true,
          visible: true,
        },
        needsPrice,
        needsStock,
        needsActive,
        needsVisible,
        inventoryPatch: buildInventoryPatch(product, targetStock),
        productPatch: buildProductCommercePatch(price, { targetStock }),
      });
    }
  }

  const currencyBefore = String(currentCompanyCurrency || "").trim().toUpperCase();
  const wouldSetCurrency = currencyBefore !== targetCurrency ? targetCurrency : null;

  const summary = {
    CURRENT_PRODUCTS: existingProducts.length,
    MATCHED_TO_WORKBOOK: matchedToWorkbook,
    WORKBOOK_PRODUCTS: workbookProducts.length,
    PRICE_VALID: priceValid,
    PRICE_INVALID: priceInvalid.length,
    WOULD_UPDATE_PRICE: wouldUpdate.filter((item) => item.needsPrice).length,
    WOULD_SET_STOCK_24: wouldUpdate.filter((item) => item.needsStock).length,
    WOULD_SET_ACTIVE: wouldUpdate.filter((item) => item.needsActive).length,
    WOULD_SET_VISIBLE: wouldUpdate.filter((item) => item.needsVisible).length,
    CURRENT_COMPANY_CURRENCY: currencyBefore || null,
    WOULD_SET_CURRENCY: wouldSetCurrency,
    MISSING_SOURCE_IDS: missingSourceIds.length,
    DUPLICATE_SOURCE_IDS: duplicateSourceIds.length,
    PRODUCTS_WITH_VARIANTS: variantProducts.length,
    ERRORS: errors.length,
  };

  const clean = summary.PRICE_INVALID === 0
    && summary.MISSING_SOURCE_IDS === 0
    && summary.DUPLICATE_SOURCE_IDS === 0
    && summary.ERRORS === 0
    && summary.MATCHED_TO_WORKBOOK === workbookProducts.length
    && workbookProducts.length > 0;

  return {
    ...summary,
    CLEAN: clean,
    missingSourceIds,
    duplicateSourceIds,
    priceInvalid,
    variantProducts,
    wouldUpdate,
    errors,
  };
}

export function isCleanCommercePlan(plan) {
  return Boolean(plan?.CLEAN);
}

/**
 * Resolve the canonical workbook source product id for an existing product.
 * Match paths (in priority order):
 *   - sourceProductId / data.sourceProductId / legacyVelvetProductId
 *   - source URL link `?app=product.show.{id}`
 *   - deterministic product id `velvet-src-{id}`
 */
export function resolveExistingProductSourceId(product) {
  if (!product || typeof product !== "object") return "";
  const direct = product.sourceProductId
    ?? product.data?.sourceProductId
    ?? product.legacyVelvetProductId;
  const directId = normalizeWorkbookProductId(direct);
  if (directId) return directId;
  const link = product.sourceProductUrl
    ?? product.data?.sourceProductUrl
    ?? product.link
    ?? product.url
    ?? "";
  const linkMatch = String(link).match(/[?&]app=product\.show\.(\d+)/);
  if (linkMatch) return normalizeWorkbookProductId(linkMatch[1]);
  const idMatch = String(product.id || "").match(/^velvet-src-(\d+)$/);
  if (idMatch) return normalizeWorkbookProductId(idMatch[1]);
  return "";
}

/**
 * Pure price-correction planner for the velvet workbook (أقل سعر only).
 *
 * - Matches existing products to workbook rows via resolveExistingProductSourceId.
 * - For each exact match: target `product.price` = أقل سعر.
 * - Variant rule (strict): if exactly ONE variant AND that variant price is the
 *   stale 18 AND workbook target ≠ 18 → set that variant.price to أقل سعر.
 * - Multi-variant products are never rewritten; they are listed under
 *   MULTI_VARIANT_CASES for the report.
 * - Existing products that do not match any workbook row are counted under
 *   UNMATCHED and never modified.
 */
export function planVelvetWorkbookPriceCorrection({
  workbookProducts = [],
  existingProducts = [],
}) {
  const workbookById = new Map();
  for (const row of workbookProducts) {
    const id = normalizeWorkbookProductId(row.sourceProductId);
    if (!id) continue;
    workbookById.set(id, row);
  }

  const priceChanged = [];
  const alreadyCorrect = [];
  const multiVariantCases = [];
  const unmatched = [];
  const errors = [];

  for (const product of existingProducts) {
    const sourceId = resolveExistingProductSourceId(product);
    const row = sourceId ? workbookById.get(sourceId) : null;
    if (!row) {
      unmatched.push({ id: product.id, sourceProductId: sourceId || null });
      continue;
    }
    const targetPrice = finitePrice(row.minPrice);
    if (targetPrice == null) {
      errors.push(`Invalid workbook price for sourceProductId ${sourceId}.`);
      continue;
    }

    const variants = Array.isArray(product.variants) ? product.variants.filter(Boolean) : [];
    const currentPrice = finitePrice(product.price ?? product.basePrice);
    const needsPrice = currentPrice !== targetPrice;

    let variantPatch = null;
    if (variants.length === 1) {
      const variant = variants[0];
      if (Number(variant.price) === VELVET_STALE_VARIANT_PRICE && targetPrice !== VELVET_STALE_VARIANT_PRICE) {
        variantPatch = { variantId: String(variant.id || ""), price: targetPrice };
      }
    } else if (variants.length > 1) {
      multiVariantCases.push({
        sourceProductId: sourceId,
        productId: product.id,
        variantCount: variants.length,
        variantIds: variants.map((variant) => String(variant.id || "")),
      });
    }

    const entry = {
      sourceProductId: sourceId,
      productId: product.id,
      currentPrice,
      targetPrice,
      needsPrice,
      variantPatch,
    };
    if (needsPrice || variantPatch) {
      priceChanged.push(entry);
    } else {
      alreadyCorrect.push(entry);
    }
  }

  const summary = {
    TOTAL_WORKBOOK_PRODUCTS: workbookById.size,
    EXACT_MATCHED: priceChanged.length + alreadyCorrect.length,
    UNMATCHED: unmatched.length,
    PRICE_CHANGED: priceChanged.length,
    ALREADY_CORRECT: alreadyCorrect.length,
    MULTI_VARIANT_CASES: multiVariantCases.length,
    ERRORS: errors.length,
  };

  const clean = summary.ERRORS === 0
    && summary.EXACT_MATCHED > 0
    && summary.PRICE_CHANGED + summary.ALREADY_CORRECT === summary.EXACT_MATCHED;

  return {
    ...summary,
    CLEAN: clean,
    priceChanged,
    alreadyCorrect,
    multiVariantCases,
    unmatched,
    errors,
  };
}

export function isCleanPriceCorrectionPlan(plan) {
  return Boolean(plan?.CLEAN);
}

/**
 * Normalize a size/volume value for automatic-default detection.
 * Plain strings are trimmed/lowercased/whitespace-stripped; localized
 * `{en, ar}` objects are normalized per locale.
 */
export function normalizeSizeValue(value) {
  if (value == null) return "";
  if (typeof value === "object") {
    return {
      en: normalizeSizeValue(value.en),
      ar: normalizeSizeValue(value.ar),
    };
  }
  return String(value).trim().toLowerCase().replace(/\s+/g, "");
}

/**
 * Classify a size/volume value for the automatic-default cleanup:
 *   - "automatic": clearly an invented default (500ml / 1L / 1.5L, en or ar).
 *   - "ambiguous": localized object where only one locale is an automatic
 *     default — report, never modify.
 *   - "manual": genuine size (toy sizes, "1 Liter", etc.) — keep untouched.
 */
export function classifySizeForCleanup(value) {
  const normalized = normalizeSizeValue(value);
  if (typeof normalized === "string") {
    return AUTOMATIC_SIZE_DEFAULTS.includes(normalized) ? "automatic" : "manual";
  }
  const enAutomatic = AUTOMATIC_SIZE_DEFAULTS.includes(normalized.en);
  const arAutomatic = AUTOMATIC_SIZE_DEFAULTS.includes(normalized.ar);
  if (enAutomatic && arAutomatic) return "automatic";
  if (enAutomatic || arAutomatic) return "ambiguous";
  return "manual";
}

/**
 * Pure planner for clearing invented automatic size/volume defaults
 * (500ml / 1L / 1.5L and localized equivalents) from existing products.
 * Genuine manual sizes are never modified; ambiguous values are reported
 * under MANUAL_REVIEW.
 */
export function planVelvetSizeCleanup({ existingProducts = [] }) {
  const wouldClear = [];
  const manualReview = [];
  let untouched = 0;

  for (const product of existingProducts) {
    const sourceId = resolveExistingProductSourceId(product);
    const variants = Array.isArray(product.variants) ? product.variants.filter(Boolean) : [];
    const clearable = [];
    const review = [];
    for (const variant of variants) {
      if (variant.size == null || variant.size === "") continue;
      const classification = classifySizeForCleanup(variant.size);
      if (classification === "automatic") {
        clearable.push({ variantId: String(variant.id || ""), size: variant.size });
      } else if (classification === "ambiguous") {
        review.push({ variantId: String(variant.id || ""), size: variant.size });
      }
    }
    if (clearable.length) {
      wouldClear.push({ sourceProductId: sourceId, productId: product.id, clearable });
    }
    if (review.length) {
      manualReview.push({ sourceProductId: sourceId, productId: product.id, sizes: review });
    }
    if (!clearable.length && !review.length) untouched += 1;
  }

  return {
    SIZE_CLEAR_CANDIDATES: wouldClear.length,
    MANUAL_REVIEW: manualReview.length,
    UNTOUCHED: untouched,
    wouldClear,
    manualReview,
  };
}

export function planVelvetStockUpdate({
  existingProducts = [],
  targetStock = VELVET_TARGET_STOCK,
  expectedTotal = null,
  expectedNeedUpdate = null,
  expectedAlready = null,
}) {
  const wouldUpdate = [];
  const variantProducts = [];
  const errors = [];
  let alreadyStock24 = 0;

  for (const product of existingProducts) {
    const sourceProductId = getSourceProductId(product);
    const variants = Array.isArray(product.variants) ? product.variants : [];
    const currentStock = readProductStock(product);

    if (variants.length) {
      variantProducts.push({
        sourceProductId,
        productId: product.id,
        variantCount: variants.length,
        currentStock,
      });
    }

    if (currentStock === targetStock) {
      alreadyStock24 += 1;
      continue;
    }

    wouldUpdate.push({
      sourceProductId,
      productId: product.id,
      currentStock,
      inventoryPatch: buildInventoryPatch(product, targetStock),
    });
  }

  const summary = {
    PRODUCTS_TOTAL: existingProducts.length,
    NEED_STOCK_UPDATE: wouldUpdate.length,
    ALREADY_STOCK_24: alreadyStock24,
    PRODUCTS_WITH_VARIANTS: variantProducts.length,
    ERRORS: errors.length,
  };

  const clean = summary.ERRORS === 0
    && summary.PRODUCTS_TOTAL > 0
    && summary.NEED_STOCK_UPDATE + summary.ALREADY_STOCK_24 === summary.PRODUCTS_TOTAL
    && (expectedTotal == null || summary.PRODUCTS_TOTAL === expectedTotal)
    && (expectedNeedUpdate == null || summary.NEED_STOCK_UPDATE === expectedNeedUpdate)
    && (expectedAlready == null || summary.ALREADY_STOCK_24 === expectedAlready);

  return {
    ...summary,
    CLEAN: clean,
    wouldUpdate,
    variantProducts,
    errors,
  };
}

export function isCleanStockPlan(plan) {
  return Boolean(plan?.CLEAN);
}

export function summarizeVerification({
  products = [],
  workbookBySourceId = new Map(),
  targetStock = VELVET_TARGET_STOCK,
  companyCurrency = "",
  storefrontProducts = [],
  storefrontCurrency = "",
}) {
  let priceMatchCount = 0;
  let stock24Count = 0;
  let activeCount = 0;
  let visibleCount = 0;
  let outOfStockCount = 0;

  for (const product of products) {
    const sourceId = getSourceProductId(product);
    const workbookPrice = workbookBySourceId.get(sourceId);
    const price = finitePrice(product.price ?? product.basePrice) ?? 0;
    if (workbookPrice != null && price === workbookPrice) priceMatchCount += 1;
    const stock = readProductStock(product);
    if (stock === targetStock) stock24Count += 1;
    if (stock <= 0) outOfStockCount += 1;
    if (isProductActive(product)) activeCount += 1;
    if (isProductVisible(product)) visibleCount += 1;
  }

  let storefrontOutOfStock = 0;
  for (const product of storefrontProducts) {
    if (Number(product.stock ?? 0) <= 0) storefrontOutOfStock += 1;
  }

  return {
    PRODUCTS_TOTAL: products.length,
    PRICE_MATCH_COUNT: priceMatchCount,
    STOCK_24_COUNT: stock24Count,
    ACTIVE_COUNT: activeCount,
    VISIBLE_COUNT: visibleCount,
    OUT_OF_STOCK_COUNT: outOfStockCount,
    STOREFRONT_CONTENT_TOTAL: storefrontProducts.length,
    STOREFRONT_OUT_OF_STOCK_COUNT: storefrontOutOfStock,
    COMPANY_CURRENCY: String(companyCurrency || "").trim().toUpperCase(),
    STOREFRONT_CURRENCY: String(storefrontCurrency || "").trim().toUpperCase(),
  };
}
