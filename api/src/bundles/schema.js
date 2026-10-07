/**
 * Product bundle schema: normalization, input sanitization and item validation.
 */

import { BUNDLE_PRICING_MODES, normalizePricingMode } from "./bundlePricing.js";
import { filterActiveProducts } from "../products/trashLifecycle.js";

function cleanText(value, maxLength = 240) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function asId(value) {
  return String(value || "").trim();
}

function asIdList(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((id) => asId(id)).filter(Boolean))];
}

function parseOptionalDate(value, fieldName) {
  if (value == null || value === "") return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw bundleError(`${fieldName} must be a valid date.`, 400);
  }
  return date.toISOString();
}

export function bundleError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

export function normalizeBundle(record = {}) {
  return {
    id: asId(record.id),
    slug: String(record.slug || "").trim().toLowerCase(),
    name: cleanText(record.name, 160),
    description: cleanText(record.description, 2000),
    pricingMode: normalizePricingMode(record.pricingMode || record.pricing_mode),
    discountValue: Math.max(0, Number(record.discountValue ?? record.discount_value ?? 0)),
    fixedPrice: record.fixedPrice == null && record.fixed_price == null
      ? null
      : Math.max(0, Number(record.fixedPrice ?? record.fixed_price ?? 0)),
    imageUrl: cleanText(record.imageUrl || record.image_url, 1000),
    isActive: record.isActive !== false && record.is_active !== false,
    startsAt: record.startsAt || record.starts_at || null,
    endsAt: record.endsAt || record.ends_at || null,
    createdBy: cleanText(record.createdBy || record.created_by, 160),
    updatedBy: cleanText(record.updatedBy || record.updated_by, 160),
    createdAt: record.createdAt || record.created_at || null,
    updatedAt: record.updatedAt || record.updated_at || null,
  };
}

/**
 * Validate bundle items against the company's live product catalog.
 * Returns normalized item rows (productId, variantId, quantity, sortOrder).
 */
export function validateBundleItems(items, products = []) {
  if (!Array.isArray(items)) {
    throw bundleError("Bundle items must be an array.", 400);
  }
  if (items.length === 0) {
    throw bundleError("A bundle must contain at least one item.", 400);
  }
  if (items.length > 50) {
    throw bundleError("A bundle cannot contain more than 50 items.", 400);
  }

  const activeProducts = filterActiveProducts(products || []);
  const productMap = new Map(activeProducts.map((product) => [asId(product.id), product]));
  const seen = new Set();
  const normalized = [];

  items.forEach((item, index) => {
    const productId = asId(item.productId || item.product_id);
    const variantId = asId(item.variantId || item.variant_id);
    const quantity = Math.trunc(Number(item.quantity ?? 1));
    if (!productId) {
      throw bundleError(`Bundle item ${index + 1} is missing a productId.`, 400);
    }
    if (!Number.isFinite(quantity) || quantity < 1) {
      throw bundleError(`Bundle item ${index + 1} quantity must be an integer of at least 1.`, 400);
    }

    const product = productMap.get(productId);
    if (!product) {
      throw bundleError(`Product ${productId} is not available for this company.`, 400);
    }
    if (product.isActive === false) {
      throw bundleError(`Product ${productId} is inactive.`, 400);
    }

    const variants = Array.isArray(product.variants) ? product.variants : [];
    if (variantId && !variants.some((variant) => asId(variant.id) === variantId)) {
      throw bundleError(`Variant ${variantId} does not belong to product ${productId}.`, 400);
    }

    const key = `${productId}:${variantId}`;
    if (seen.has(key)) {
      throw bundleError(`Product ${productId} appears more than once in the bundle.`, 400);
    }
    seen.add(key);

    normalized.push({
      productId,
      variantId,
      quantity,
      sortOrder: Number(item.sortOrder ?? item.sort_order ?? index),
    });
  });

  return normalized;
}

/**
 * Validate and sanitize bundle input from an admin request body.
 * context: { companyId, products, existingBundles }
 */
export function sanitizeBundleInput(body = {}, context = {}) {
  const name = cleanText(body.name, 160);
  if (!name) throw bundleError("Bundle name is required.");

  const slug = String(body.slug || "").trim().toLowerCase();
  if (!slug) throw bundleError("Bundle slug is required.");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw bundleError("Bundle slug may only contain lowercase letters, numbers and dashes.");
  }

  const pricingMode = normalizePricingMode(body.pricingMode || body.pricing_mode);
  const discountValue = Number(body.discountValue ?? body.discount_value ?? 0);
  if (!Number.isFinite(discountValue) || discountValue < 0) {
    throw bundleError("Discount value must be a non-negative number.");
  }
  if (pricingMode === "percent_discount" && discountValue > 100) {
    throw bundleError("Percentage discount cannot exceed 100.");
  }

  let fixedPrice = null;
  if (body.fixedPrice != null || body.fixed_price != null) {
    fixedPrice = Number(body.fixedPrice ?? body.fixed_price);
    if (!Number.isFinite(fixedPrice) || fixedPrice < 0) {
      throw bundleError("Fixed price must be a non-negative number.");
    }
  }
  if (pricingMode === "fixed_price" && (fixedPrice == null || fixedPrice <= 0)) {
    throw bundleError("Fixed price mode requires a positive fixed price.");
  }

  const items = validateBundleItems(body.items, context.products);

  const startsAt = parseOptionalDate(body.startsAt, "startsAt");
  const endsAt = parseOptionalDate(body.endsAt, "endsAt");
  if (startsAt && endsAt && new Date(startsAt) > new Date(endsAt)) {
    throw bundleError("startsAt must be before endsAt.");
  }

  const existingBundles = Array.isArray(context.existingBundles) ? context.existingBundles : [];
  const excludeId = asId(body.id);
  const slugConflict = existingBundles.find(
    (bundle) => String(bundle.slug || "").trim().toLowerCase() === slug && asId(bundle.id) !== excludeId,
  );
  if (slugConflict) {
    throw bundleError("A bundle with this slug already exists.", 409);
  }

  return {
    slug,
    name,
    description: cleanText(body.description, 2000),
    pricingMode,
    discountValue,
    fixedPrice,
    imageUrl: cleanText(body.imageUrl || body.image_url, 1000),
    isActive: body.isActive !== false && body.active !== false,
    startsAt,
    endsAt,
    items,
  };
}

export { asIdList };