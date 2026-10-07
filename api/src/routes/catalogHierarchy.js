// Generic catalog hierarchy support.
//
// The Kids Velvet catalog is expressed through the existing shared catalog
// entities, so the whole feature stays generic:
//   - Brand         -> existing company_brands row
//   - Main Category -> existing company_categories row with parentId === null
//   - Subcategory   -> existing company_categories row whose parentId points to
//                      a Main Category
//   - Product       -> existing products row (new optional fields live in the
//                      product JSONB `data` payload; no schema migration)
//   - Manufacturer + filters (Age, Gender, Skill, Occasion, Quick Shop) ->
//     optional product attributes accepted by the shared product payload.
//
// This module is a pure helper over brand/category lists so it can be unit
// tested without a database and reused by in-memory and Postgres runtimes.

import {
  PRODUCT_FILTER_ATTRIBUTE_GROUPS,
  normalizeProductFilterAttributeValue,
} from "../catalog/productFilterAttributes.js";

const FILTER_KEYS = [...PRODUCT_FILTER_ATTRIBUTE_GROUPS];
const BOOLEAN_FILTER_KEYS = ["quickShop"];

export const PRODUCT_FILTER_KEYS = Object.freeze([...FILTER_KEYS, ...BOOLEAN_FILTER_KEYS]);

export function catalogHierarchyError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function normalizeOptionalString(incoming, value, field) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string" || !value.trim()) {
    throw catalogHierarchyError(`${field} must be a non-empty string or empty.`);
  }
  const normalized = value.trim();
  if (normalized.length > 240) {
    throw catalogHierarchyError(`${field} must be 240 characters or fewer.`);
  }
  return normalized;
}

function normalizeFilterAttribute(field, value) {
  try {
    return normalizeProductFilterAttributeValue(field, value, { strict: true });
  } catch (error) {
    throw catalogHierarchyError(error.message || `${field} contains an invalid value.`);
  }
}

// Normalizes the hierarchy/filter inputs from a product create/update body.
// Returns an object containing only recognized keys; safe to spread into the
// normalized product before persistence.
export function normalizeCatalogHierarchyInput(incoming = {}) {
  if (!incoming || typeof incoming !== "object" || Array.isArray(incoming)) {
    throw catalogHierarchyError("Product body must be an object.");
  }
  const normalized = {};
  for (const field of ["mainCategoryId", "subcategoryId", "manufacturer"]) {
    if (hasOwn(incoming, field)) {
      normalized[field] = normalizeOptionalString(incoming, incoming[field], field);
    }
  }
  for (const field of FILTER_KEYS) {
    if (hasOwn(incoming, field)) {
      normalized[field] = normalizeFilterAttribute(field, incoming[field]);
    }
  }
  if (hasOwn(incoming, "quickShop")) {
    if (typeof incoming.quickShop !== "boolean") {
      throw catalogHierarchyError("quickShop must be a boolean.");
    }
    normalized.quickShop = incoming.quickShop;
  }
  return normalized;
}

function nullOrTrimmed(value) {
  if (value === null || value === undefined || value === "") return null;
  return typeof value === "string" ? value.trim() || null : value;
}

// Validates the catalog hierarchy and filter attributes of a product against
// the company's brand/category lists.
//
//   brands     - array of the company's brand rows
//   categories - array of the company's category rows
//   product    - the normalized product (or body) to validate
//   options.requireFullHierarchy - when true (default for product create/update),
//     Brand + Main Category + Subcategory are all mandatory and must form a
//     tenant-valid chain. No company IDs are hard-coded.
export function validateCatalogHierarchy({
  brands = [],
  categories = [],
  product = {},
  requireMainCategory = false,
  requireFullHierarchy = false,
  // Brand-only products are allowed when Main/Sub are both omitted (e.g. Velvet
  // workbook outside-tree rows). Providing either Main or Sub still requires a
  // complete Brand → Main → Sub chain under requireFullHierarchy.
  allowBrandOnly = false,
}) {
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const brandById = new Map(brands.map((brand) => [brand.id, brand]));
  const requireHierarchy = requireFullHierarchy || requireMainCategory;

  const brandId = nullOrTrimmed(product.brandId ?? product.brand_id);
  if (requireFullHierarchy && !brandId) {
    throw catalogHierarchyError("Brand is required.");
  }
  if (brandId) {
    const brand = brandById.get(brandId);
    if (!brand) throw catalogHierarchyError("Brand not found.", 404);
    if (brand.isActive === false) throw catalogHierarchyError("Brand is inactive.");
  }

  const mainCategoryId = nullOrTrimmed(product.mainCategoryId);
  const subcategoryId = nullOrTrimmed(product.subcategoryId ?? product.categoryId ?? product.category_id);
  const brandOnly =
    allowBrandOnly
    && requireFullHierarchy
    && Boolean(brandId)
    && !mainCategoryId
    && !subcategoryId;

  if (requireHierarchy && !mainCategoryId && !brandOnly) {
    throw catalogHierarchyError("Main Category is required.");
  }
  if (requireFullHierarchy && !subcategoryId && !brandOnly) {
    throw catalogHierarchyError("Subcategory is required.");
  }

  if (mainCategoryId) {
    const main = categoryById.get(mainCategoryId);
    if (!main) throw catalogHierarchyError("Main Category not found.", 404);
    if (main.isActive === false) throw catalogHierarchyError("Main Category is inactive.");
    // A Main Category is a category with no parent.
    if (main.parentId) {
      throw catalogHierarchyError("Selected category is a Subcategory, not a Main Category.");
    }
    // Main Category must belong to the selected Brand when hierarchy is required.
    if (requireFullHierarchy || brandId) {
      if (!main.brandId || (brandId && main.brandId !== brandId)) {
        throw catalogHierarchyError("Main Category does not belong to the selected Brand.");
      }
    }
  }

  if (subcategoryId) {
    const sub = categoryById.get(subcategoryId);
    if (!sub) throw catalogHierarchyError("Subcategory not found.", 404);
    if (sub.isActive === false) throw catalogHierarchyError("Subcategory is inactive.");
    if (requireFullHierarchy && !sub.parentId) {
      throw catalogHierarchyError("Selected category must be a Subcategory.");
    }
    // When both are supplied the Subcategory must belong to the Main Category.
    if (mainCategoryId && sub.parentId !== mainCategoryId) {
      throw catalogHierarchyError("Subcategory does not belong to the selected Main Category.");
    }
    if (requireFullHierarchy && !mainCategoryId) {
      throw catalogHierarchyError("Main Category is required.");
    }
  }

  // Attribute/filter validation (defensive; the route already normalizes).
  if (product.manufacturer != null && typeof product.manufacturer !== "string") {
    throw catalogHierarchyError("manufacturer must be a string.");
  }
  const normalizedFilters = {};
  for (const key of FILTER_KEYS) {
    if (product[key] == null || product[key] === "") continue;
    if (!Array.isArray(product[key]) && typeof product[key] !== "string") {
      throw catalogHierarchyError(`${key} must be a string or array of canonical IDs.`);
    }
    normalizedFilters[key] = normalizeFilterAttribute(key, product[key]);
  }
  if (product.quickShop != null && typeof product.quickShop !== "boolean") {
    throw catalogHierarchyError("quickShop must be a boolean.");
  }

  return {
    brandId: brandId || null,
    mainCategoryId: mainCategoryId || null,
    subcategoryId: subcategoryId || null,
    manufacturer: nullOrTrimmed(product.manufacturer) || null,
    ...Object.fromEntries(FILTER_KEYS.map((key) => [key, normalizedFilters[key] ?? []])),
    quickShop: product.quickShop === true,
  };
}

