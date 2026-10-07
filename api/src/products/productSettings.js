/**
 * Phase H — product merchandising settings + cost/qty helpers.
 * Company settings live in company_settings.settings (no new table).
 */

import { catalogError } from "../routes/catalogValidation.js";

export const DEFAULT_LOW_STOCK_THRESHOLD = 5;
export const COST_PRICE_PERMISSION = "products.cost_price.manage";

export const PRODUCT_ADMIN_SETTING_KEYS = Object.freeze([
  "lowStockThreshold",
  "costPriceEnabled",
  "productConditionEnabled",
  "showCouponBoxAtCheckout",
]);

function requestTenantRole(req) {
  return req?.membershipRole || req?.user?.role || "";
}

export function normalizeLowStockThreshold(value, fallback = DEFAULT_LOW_STOCK_THRESHOLD) {
  if (value == null || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 0) {
    return fallback;
  }
  return parsed;
}

export function companyLowStockThreshold(company) {
  return normalizeLowStockThreshold(company?.settings?.lowStockThreshold);
}

export function isCostPriceEnabled(company) {
  return company?.settings?.costPriceEnabled === true;
}

export function isProductConditionEnabled(company) {
  return company?.settings?.productConditionEnabled === true;
}

/** Canonical API / JSONB values. UI labels are New / Refurbished / Used. */
export const PRODUCT_CONDITION_VALUES = Object.freeze(["new", "refurbished", "used"]);

const PRODUCT_CONDITION_ALIASES = Object.freeze({
  new: "new",
  refurbished: "refurbished",
  used: "used",
});

export function canonicalProductCondition(value) {
  if (value == null || value === "") return null;
  if (typeof value !== "string") return undefined;
  const key = value.trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(PRODUCT_CONDITION_ALIASES, key)
    ? PRODUCT_CONDITION_ALIASES[key]
    : undefined;
}

export function normalizeOptionalProductCondition(value) {
  if (value === null || value === undefined || value === "") return null;
  const canonical = canonicalProductCondition(value);
  if (!canonical) {
    throw catalogError("condition must be one of: New, Refurbished, Used.");
  }
  return canonical;
}

export function productPayloadHasConditionInput(product) {
  return Boolean(product) && Object.prototype.hasOwnProperty.call(product, "condition");
}

export function assertConditionMutationAllowed(req, company, productBody, existingProduct) {
  if (!productPayloadHasConditionInput(productBody)) return;
  const incoming = normalizeOptionalProductCondition(productBody.condition);
  if (isProductConditionEnabled(company)) return;
  const existing = existingProduct
    ? (canonicalProductCondition(existingProduct.condition) || null)
    : null;
  if (incoming !== existing) {
    throw catalogError("Product condition is disabled for this company.", 403);
  }
}

export function stripProductCondition(product) {
  if (!product || typeof product !== "object") return product;
  const { condition: _condition, productCondition: _productCondition, ...rest } = product;
  return rest;
}

export function publicProductSerializeOptions(company) {
  return { conditionEnabled: isProductConditionEnabled(company) };
}

export function showCouponBoxAtCheckout(company) {
  return company?.settings?.showCouponBoxAtCheckout === true;
}

export function userHasCostPricePermission(req) {
  const role = requestTenantRole(req);
  if (["admin", "company_admin", "super_admin", "manager"].includes(role)) return true;
  if (["employee", "staff"].includes(role)) {
    return Array.isArray(req.user?.permissions)
      && req.user.permissions.includes(COST_PRICE_PERMISSION);
  }
  return false;
}

export function canAccessCostPrice(req, company) {
  return isCostPriceEnabled(company) && userHasCostPricePermission(req);
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object || {}, key);
}

function stripVariantCostPrice(variant) {
  if (!variant || typeof variant !== "object") return variant;
  const {
    costPrice: _costPrice,
    cost_price: _cost_price,
    ...rest
  } = variant;
  return rest;
}

export function stripCostPriceFromProduct(product) {
  if (!product || typeof product !== "object") return product;
  const {
    costPrice: _productCostPrice,
    cost_price: _productCost_price,
    ...rest
  } = product;
  return {
    ...rest,
    variants: Array.isArray(product.variants)
      ? product.variants.map(stripVariantCostPrice)
      : product.variants,
  };
}

export function presentProductForCaller(product, { includeCostPrice = false } = {}) {
  if (includeCostPrice) return product;
  return stripCostPriceFromProduct(product);
}

export function variantHasCostPriceInput(variant) {
  if (!variant || typeof variant !== "object") return false;
  return hasOwn(variant, "costPrice") || hasOwn(variant, "cost_price");
}

export function productPayloadHasCostPriceInput(product) {
  if (!product || typeof product !== "object") return false;
  if (hasOwn(product, "costPrice") || hasOwn(product, "cost_price")) return true;
  const variants = Array.isArray(product.variants) ? product.variants : [];
  return variants.some(variantHasCostPriceInput);
}

export function assertCostPriceMutationAllowed(req, company, productBody) {
  if (!productPayloadHasCostPriceInput(productBody)) return;
  if (!isCostPriceEnabled(company)) {
    throw catalogError("Cost price is disabled for this company.", 403);
  }
  if (!userHasCostPricePermission(req)) {
    throw catalogError("Cost price permission required.", 403);
  }
}

export function normalizeOptionalCostPrice(value, label = "costPrice") {
  if (value === null || value === undefined || value === "") return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw catalogError(`${label} must be a non-negative number.`);
  }
  // Keep two-decimal money semantics consistent with existing price fields.
  return Math.round(parsed * 100) / 100;
}

export function normalizeOptionalBarcode(value) {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value !== "string") {
    throw catalogError("barcode must be a string.");
  }
  const trimmed = value.trim();
  if (trimmed.length > 120) {
    throw catalogError("barcode must be 120 characters or fewer.");
  }
  return trimmed;
}

export function normalizeOptionalPurchaseQuantity(value, field) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 1) {
    throw catalogError(`${field} must be a positive integer.`);
  }
  return parsed;
}

export function validatePurchaseQuantityPair(minValue, maxValue) {
  const min = normalizeOptionalPurchaseQuantity(minValue, "minPurchaseQuantity");
  const max = normalizeOptionalPurchaseQuantity(maxValue, "maxPurchaseQuantity");
  if (min != null && max != null && min > max) {
    throw catalogError("minPurchaseQuantity cannot be greater than maxPurchaseQuantity.");
  }
  return { minPurchaseQuantity: min, maxPurchaseQuantity: max };
}

/**
 * Authoritative order-item quantity check against product-level limits.
 * Returns null when valid, otherwise an error message.
 */
export function purchaseQuantityViolation(product, quantity) {
  const qty = Number(quantity);
  if (!Number.isFinite(qty) || !Number.isInteger(qty) || qty < 1) {
    return "Quantity must be a positive integer.";
  }
  const min = product?.minPurchaseQuantity;
  const max = product?.maxPurchaseQuantity;
  if (min != null && qty < Number(min)) {
    return `Quantity must be at least ${min}.`;
  }
  if (max != null && qty > Number(max)) {
    return `Quantity must be at most ${max}.`;
  }
  return null;
}

export function validateProductSettingsPatch(body, changes) {
  if (hasOwn(body, "lowStockThreshold")) {
    const value = body.lowStockThreshold;
    if (value === null || value === "") {
      changes.lowStockThreshold = DEFAULT_LOW_STOCK_THRESHOLD;
    } else {
      const parsed = Number(value);
      if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 0 || parsed > 1_000_000) {
        throw catalogError("lowStockThreshold must be an integer between 0 and 1000000.");
      }
      changes.lowStockThreshold = parsed;
    }
  }
  for (const key of ["costPriceEnabled", "productConditionEnabled", "showCouponBoxAtCheckout"]) {
    if (!hasOwn(body, key)) continue;
    if (typeof body[key] !== "boolean") {
      throw catalogError(`${key} must be a boolean.`);
    }
    changes[key] = body[key];
  }
  return changes;
}
