/**
 * Backend-authoritative retail pricing chain (Decision 17):
 * Base → Sale → Automatic Discount → Coupon → Points
 *
 * Wholesale / trader pricing is a separate path and must not enter this chain.
 */

import { resolvePublicSalePrice } from "../products/merchandisingFlags.js";

export function safeMoney(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, parsed);
}

export function roundMoney(value, roundFinal = false) {
  const amount = safeMoney(value);
  if (roundFinal) return Math.max(0, Math.round(amount));
  return Math.max(0, Math.round(amount * 100) / 100);
}

function asIdList(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((id) => String(id || "").trim()).filter(Boolean))];
}

export function isWithinSchedule(record, now = new Date()) {
  const instant = now instanceof Date ? now : new Date(now);
  if (Number.isNaN(instant.getTime())) return false;
  if (record?.startsAt) {
    const start = new Date(record.startsAt);
    if (!Number.isNaN(start.getTime()) && instant < start) return false;
  }
  if (record?.endsAt) {
    const end = new Date(record.endsAt);
    if (!Number.isNaN(end.getTime()) && instant > end) return false;
  }
  return true;
}

export function resolveRetailUnitPrice(product, variant) {
  const variantPrice = safeMoney(variant?.price);
  const productPrice = safeMoney(product?.price);
  const base = variantPrice > 0 ? variantPrice : productPrice;
  const sale = variant?.sale_price ?? variant?.salePrice ?? product?.sale_price ?? product?.salePrice;
  const resolved = resolvePublicSalePrice(base, sale);
  return {
    basePrice: base,
    salePrice: resolved.originalPrice != null ? resolved.price : null,
    unitPrice: safeMoney(resolved.price, base),
  };
}

export function discountAppliesToProduct(discount, product, quantity = 1) {
  if (!discount || discount.isActive === false) return false;
  if (!isWithinSchedule(discount)) return false;
  const minQty = Math.max(1, Math.floor(safeMoney(discount.minQuantity, 1)) || 1);
  if (Number(quantity) < minQty) return false;

  const productIds = asIdList(discount.productIds);
  const categoryIds = asIdList(discount.categoryIds);
  const brandIds = asIdList(discount.brandIds);
  const hasTargets = productIds.length > 0 || categoryIds.length > 0 || brandIds.length > 0;
  if (!hasTargets) return true;

  if (productIds.includes(String(product?.id || ""))) return true;
  const productCategoryIds = [
    product?.categoryId,
    product?.subcategoryId,
    product?.mainCategoryId,
  ].map((id) => String(id || "").trim()).filter(Boolean);
  if (categoryIds.some((id) => productCategoryIds.includes(id))) return true;
  const brandId = String(product?.brandId || "").trim();
  if (brandId && brandIds.includes(brandId)) return true;
  return false;
}

export function computeAutomaticDiscountAmount(unitPrice, quantity, discount) {
  const qty = Math.max(0, Math.floor(Number(quantity) || 0));
  const line = safeMoney(unitPrice) * qty;
  if (line <= 0 || !discount) return 0;
  const value = safeMoney(discount.discountValue);
  if (value <= 0) return 0;

  let amount = 0;
  if (discount.discountType === "fixed") {
    amount = Math.min(line, value * qty);
  } else {
    amount = Math.min(line, (line * value) / 100);
  }
  return roundMoney(amount, false);
}

/**
 * Pick the single best automatic discount for a line (no stacking of auto discounts).
 */
export function selectBestAutomaticDiscount(unitPrice, quantity, product, discounts = []) {
  let best = null;
  let bestAmount = 0;
  for (const discount of discounts) {
    if (!discountAppliesToProduct(discount, product, quantity)) continue;
    const amount = computeAutomaticDiscountAmount(unitPrice, quantity, discount);
    if (amount > bestAmount) {
      best = discount;
      bestAmount = amount;
    }
  }
  return { discount: best, amount: bestAmount };
}

export function applyAutomaticDiscountToUnit(unitPrice, quantity, discount) {
  const unit = safeMoney(unitPrice);
  if (!discount) return unit;
  const lineDiscount = computeAutomaticDiscountAmount(unit, quantity, discount);
  const qty = Math.max(1, Math.floor(Number(quantity) || 1));
  const discountedUnit = safeMoney(unit - lineDiscount / qty);
  return roundMoney(discountedUnit, discount.roundFinalPrice === true);
}

export function computeCouponDiscount(subtotalAfterAuto, coupon) {
  const subtotal = safeMoney(subtotalAfterAuto);
  if (!coupon || subtotal <= 0) return 0;
  const value = safeMoney(coupon.discountValue);
  if (value <= 0) return 0;
  let amount = 0;
  if (coupon.discountType === "fixed") {
    amount = Math.min(subtotal, value);
  } else {
    amount = Math.min(subtotal, (subtotal * value) / 100);
  }
  return roundMoney(amount, false);
}

/**
 * Price a retail cart/order. Never trusts client prices.
 * Wholesale callers should skip this and use wholesale unit prices instead.
 */
export function priceRetailOrder({
  items = [],
  products = [],
  automaticDiscounts = [],
  coupon = null,
  pointsDiscount = 0,
  now = new Date(),
} = {}) {
  const productById = new Map();
  for (const product of products) {
    if (product?.id) productById.set(String(product.id), product);
    if (product?.slug) productById.set(String(product.slug), product);
  }

  const activeDiscounts = (automaticDiscounts || []).filter(
    (discount) => discount?.isActive !== false && isWithinSchedule(discount, now),
  );

  const pricedItems = [];
  let merchandiseSubtotal = 0;
  let automaticDiscountTotal = 0;

  for (const item of items) {
    const product = productById.get(String(item.productId || ""))
      || productById.get(String(item.slug || ""));
    const variants = Array.isArray(product?.variants) ? product.variants : [];
    const variant = item.variantId
      ? variants.find((entry) => entry.id === item.variantId)
      : variants.find((entry) => {
          const sameSize = String(entry.size || "") === String(item.selectedSize || item.size || "");
          const selectedColor = item.colorName || item.selectedColor || "";
          const variantColor = entry.color_name || entry.colorName || "";
          return sameSize && (!selectedColor || selectedColor === variantColor);
        }) || null;

    const quantity = Math.max(0, Math.trunc(Number(item.quantity) || 0));
    const { basePrice, salePrice, unitPrice } = resolveRetailUnitPrice(product || {}, variant);
    const { discount, amount: autoAmount } = selectBestAutomaticDiscount(
      unitPrice,
      quantity,
      product,
      activeDiscounts,
    );
    const finalUnit = applyAutomaticDiscountToUnit(unitPrice, quantity, discount);
    const lineTotal = roundMoney(finalUnit * quantity, false);
    merchandiseSubtotal = roundMoney(merchandiseSubtotal + (unitPrice * quantity), false);
    automaticDiscountTotal = roundMoney(automaticDiscountTotal + autoAmount, false);

    pricedItems.push({
      ...item,
      quantity,
      basePrice,
      salePrice,
      priceBeforeDiscount: unitPrice,
      automaticDiscountId: discount?.id || null,
      automaticDiscountAmount: autoAmount,
      price: finalUnit,
      lineTotal,
    });
  }

  const subtotalAfterAuto = roundMoney(
    pricedItems.reduce((sum, item) => sum + safeMoney(item.lineTotal), 0),
    false,
  );
  const couponDiscount = coupon ? computeCouponDiscount(subtotalAfterAuto, coupon) : 0;
  const afterCoupon = roundMoney(subtotalAfterAuto - couponDiscount, false);
  const points = roundMoney(Math.min(afterCoupon, safeMoney(pointsDiscount)), false);
  const payableSubtotal = roundMoney(afterCoupon - points, false);

  return {
    items: pricedItems,
    merchandiseSubtotal,
    automaticDiscountTotal,
    subtotalAfterAutomatic: subtotalAfterAuto,
    couponCode: coupon?.code || null,
    couponDiscount,
    discountFromPoints: points,
    discountTotal: roundMoney(automaticDiscountTotal + couponDiscount + points, false),
    subtotal: payableSubtotal,
    payableProductSubtotal: payableSubtotal,
  };
}
