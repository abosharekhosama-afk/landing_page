/**
 * Backend-authoritative product bundle pricing (Phase M).
 *
 * Pricing modes:
 *  - auto_sum:         final price = sum of component retail unit prices (no discount).
 *  - percent_discount: final price = subtotal * (1 - discount_value / 100).
 *  - fixed_discount:   final price = max(0, subtotal - discount_value).
 *  - fixed_price:      final price = fixed_price (ignores component prices).
 *
 * Inventory dependency:
 *  - Bundle availability is DERIVED from component product/variant visibility + active flags.
 *  - Current develop retail order lifecycle does NOT deduct stock on purchase.
 *  - Do not introduce a parallel bundle inventory / reservation engine until order-driven
 *    stock deduction exists for normal products.
 */

import { resolveRetailUnitPrice, roundMoney, safeMoney } from "../pricing/retailPricing.js";
import { isVariantVisible } from "../products/variantVisibility.js";

export const BUNDLE_PRICING_MODES = [
  "auto_sum",
  "percent_discount",
  "fixed_discount",
  "fixed_price",
];

export function normalizePricingMode(value) {
  const mode = String(value || "").trim();
  return BUNDLE_PRICING_MODES.includes(mode) ? mode : "auto_sum";
}

function asId(value) {
  return String(value || "").trim();
}

function asQuantity(value) {
  return Math.max(0, Math.trunc(Number(value) || 0));
}

function productLookup(products = []) {
  const byId = new Map();
  const bySlug = new Map();
  for (const product of products) {
    if (product?.id) byId.set(asId(product.id), product);
    if (product?.slug) bySlug.set(asId(product.slug), product);
  }
  return { byId, bySlug };
}

function resolveBundleItemProduct(item, products) {
  const { byId, bySlug } = productLookup(products);
  return byId.get(asId(item.productId))
    || byId.get(asId(item.slug))
    || bySlug.get(asId(item.slug))
    || bySlug.get(asId(item.productId))
    || null;
}

function resolveBundleItemVariant(item, product) {
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  if (!variants.length) return null;
  if (item.variantId) {
    return variants.find((variant) => asId(variant.id) === asId(item.variantId)) || null;
  }
  return variants.find((variant) => {
    const sameSize = String(variant.size || "") === String(item.selectedSize || item.size || "");
    const selectedColor = item.colorName || item.selectedColor || "";
    const variantColor = variant.color_name || variant.colorName || "";
    return sameSize && (!selectedColor || selectedColor === variantColor);
  }) || null;
}

/**
 * Sum of component retail unit prices (before bundle pricing is applied).
 */
export function computeBundleSubtotal(items = []) {
  return roundMoney(
    items.reduce(
      (sum, item) => sum + safeMoney(item.unitPrice) * asQuantity(item.quantity),
      0,
    ),
    false,
  );
}

/**
 * Apply the bundle pricing mode on top of the component subtotal.
 */
export function computeBundleFinalPrice(bundle, subtotal) {
  const base = safeMoney(subtotal);
  const mode = normalizePricingMode(bundle?.pricingMode);
  if (mode === "fixed_price") {
    return roundMoney(bundle?.fixedPrice, false);
  }
  if (mode === "percent_discount") {
    const percent = Math.min(100, safeMoney(bundle?.discountValue));
    return roundMoney(base * (1 - percent / 100), false);
  }
  if (mode === "fixed_discount") {
    return roundMoney(Math.max(0, base - safeMoney(bundle?.discountValue)), false);
  }
  return roundMoney(base, false);
}

/**
 * Savings = component subtotal - final bundle price (never negative).
 */
export function computeBundleSavings(bundle, subtotal, finalPrice) {
  return roundMoney(Math.max(0, safeMoney(subtotal) - safeMoney(finalPrice)), false);
}

/**
 * Availability is derived from the live catalog only — retail orders do not
 * deduct stock on develop, so stock levels never gate bundle availability.
 */
export function deriveBundleAvailability(bundle, items = [], products = []) {
  const unavailableItems = [];
  for (const item of items) {
    const product = resolveBundleItemProduct(item, products);
    if (!product || product.isActive === false) {
      unavailableItems.push({ ...item, reason: "Product is not available." });
      continue;
    }
    const variant = resolveBundleItemVariant(item, product);
    if (variant && !isVariantVisible(variant)) {
      unavailableItems.push({ ...item, reason: "Variant is not available." });
    }
  }
  return {
    available: unavailableItems.length === 0,
    unavailableItems,
  };
}

/**
 * Price a bundle against the live catalog. Never trusts client prices.
 * Returns the bundle with resolved component items, subtotal, final price,
 * savings and availability.
 */
export function priceBundle(bundle, items = [], products = []) {
  const resolvedItems = items.map((item) => {
    const product = resolveBundleItemProduct(item, products);
    const variant = product ? resolveBundleItemVariant(item, product) : null;
    const { basePrice, salePrice, unitPrice } = resolveRetailUnitPrice(product || {}, variant);
    return {
      ...item,
      quantity: asQuantity(item.quantity),
      productId: asId(item.productId),
      variantId: asId(item.variantId),
      slug: asId(item.slug || product?.slug || ""),
      productName: item.productName || product?.name?.en || product?.name || "",
      size: item.size || variant?.size || "",
      colorName: item.colorName || variant?.color_name || variant?.colorName || "",
      basePrice,
      salePrice,
      unitPrice,
      lineTotal: roundMoney(unitPrice * asQuantity(item.quantity), false),
    };
  });

  const subtotal = computeBundleSubtotal(resolvedItems);
  const finalPrice = computeBundleFinalPrice(bundle, subtotal);
  const savings = computeBundleSavings(bundle, subtotal, finalPrice);
  const availability = deriveBundleAvailability(bundle, resolvedItems, products);

  return {
    ...bundle,
    items: resolvedItems,
    subtotal,
    finalPrice,
    savings,
    available: availability.available,
    unavailableItems: availability.unavailableItems,
  };
}

/**
 * Merge a bundle record with its item rows into a single bundle object.
 * Item rows may be raw store rows or already-priced items.
 */
export function mergeBundleItems(bundle, items = []) {
  const sorted = items
    .slice()
    .sort((a, b) => Number(a.sortOrder ?? a.sort_order ?? 0) - Number(b.sortOrder ?? b.sort_order ?? 0));
  return {
    ...bundle,
    items: sorted.map((item) => ({
      id: item.id || "",
      productId: item.productId || item.product_id || "",
      variantId: item.variantId || item.variant_id || "",
      quantity: Math.max(1, Math.trunc(Number(item.quantity || 1)) || 1),
      sortOrder: Number(item.sortOrder ?? item.sort_order ?? 0),
    })),
  };
}