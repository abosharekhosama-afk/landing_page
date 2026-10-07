/**
 * Phase E+F — Related Products & Frequently Bought Together helpers.
 * Pure domain logic; persistence lives in store / postgresStore.
 */

import { isProductTrashed } from "./trashLifecycle.js";

export const RELATION_TYPES = Object.freeze(["related", "fbt"]);
export const FBT_MAX = 8;

export function normalizeRelationType(value) {
  const type = String(value || "").trim().toLowerCase();
  return RELATION_TYPES.includes(type) ? type : null;
}

export function isPubliclySelectableProduct(product) {
  if (!product) return false;
  if (isProductTrashed(product)) return false;
  if (product.isActive === false || product.active === false) return false;
  if (product.visible === false) return false;
  return true;
}

export function isAdminSelectableRelationTarget(product) {
  if (!product) return false;
  if (isProductTrashed(product)) return false;
  if (product.isActive === false || product.active === false) return false;
  return true;
}

/** Dedupe IDs preserving first-seen order. */
export function dedupeProductIds(ids = []) {
  const seen = new Set();
  const result = [];
  for (const raw of ids) {
    const id = String(raw || "").trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    result.push(id);
  }
  return result;
}

/**
 * Validate and normalize target IDs for a relation replace.
 * Throws Error with statusCode on invalid input (explicit 400 behavior).
 */
export function validateRelationTargetIds({
  sourceProductId,
  targetProductIds,
  productsById,
  maxTargets = null,
}) {
  const sourceId = String(sourceProductId || "").trim();
  if (!sourceId) {
    const error = new Error("Source product is required.");
    error.statusCode = 400;
    throw error;
  }

  const uniqueIds = dedupeProductIds(targetProductIds);
  if (maxTargets != null && uniqueIds.length > maxTargets) {
    const error = new Error(`At most ${maxTargets} products are allowed.`);
    error.statusCode = 400;
    throw error;
  }

  for (const targetId of uniqueIds) {
    if (targetId === sourceId) {
      const error = new Error("A product cannot be related to itself.");
      error.statusCode = 400;
      throw error;
    }
    const target = productsById.get(targetId);
    if (!target) {
      const error = new Error(`Invalid product ID: ${targetId}`);
      error.statusCode = 400;
      throw error;
    }
    if (isProductTrashed(target)) {
      const error = new Error(`Product is in trash and cannot be selected: ${targetId}`);
      error.statusCode = 400;
      throw error;
    }
    if (target.isActive === false || target.active === false) {
      const error = new Error(`Inactive product cannot be selected: ${targetId}`);
      error.statusCode = 400;
      throw error;
    }
  }

  return uniqueIds;
}

function productSortKey(product) {
  const sortOrder = Number(product?.sortOrder ?? 0);
  const slug = String(product?.slug || "");
  return { sortOrder, slug };
}

export function compareProductsDeterministic(a, b) {
  const left = productSortKey(a);
  const right = productSortKey(b);
  if (left.sortOrder !== right.sortOrder) return left.sortOrder - right.sortOrder;
  return left.slug.localeCompare(right.slug);
}

/**
 * Resolve FBT product list for a source product.
 * Manual FBT (when any relation rows exist) wins and is not padded with fallback.
 */
export function resolveFrequentlyBoughtTogether({
  sourceProduct,
  manualTargetIds = [],
  productsById,
  allCompanyProducts = [],
  max = FBT_MAX,
}) {
  const sourceId = String(sourceProduct?.id || "");

  if (manualTargetIds.length > 0) {
    const manual = [];
    for (const id of manualTargetIds) {
      const product = productsById.get(id);
      if (!product || product.id === sourceId) continue;
      if (!isPubliclySelectableProduct(product)) continue;
      manual.push(product);
      if (manual.length >= max) break;
    }
    return { mode: "manual", products: manual };
  }

  const catalog = (allCompanyProducts.length
    ? allCompanyProducts
    : [...productsById.values()]
  ).filter((product) => product.id !== sourceId && isPubliclySelectableProduct(product));

  const subcategoryId = String(sourceProduct?.subcategoryId || "").trim();
  const categoryId = String(sourceProduct?.categoryId || "").trim();
  const mainCategoryId = String(sourceProduct?.mainCategoryId || "").trim();

  const selected = [];
  const selectedIds = new Set();

  const takeFrom = (predicate) => {
    const pool = catalog
      .filter((product) => !selectedIds.has(product.id) && predicate(product))
      .sort(compareProductsDeterministic);
    for (const product of pool) {
      selected.push(product);
      selectedIds.add(product.id);
      if (selected.length >= max) break;
    }
  };

  // Step 1: same subcategory when configured.
  if (subcategoryId) {
    takeFrom((product) => String(product.subcategoryId || "").trim() === subcategoryId);
  }

  // Step 2: fill from same category hierarchy.
  // categoryId usually mirrors subcategoryId; prefer mainCategoryId for broader fill,
  // then fall back to exact categoryId matches.
  if (selected.length < max && mainCategoryId) {
    takeFrom((product) => String(product.mainCategoryId || "").trim() === mainCategoryId);
  } else if (selected.length < max && categoryId) {
    takeFrom((product) => String(product.categoryId || "").trim() === categoryId);
  }

  return { mode: "fallback", products: selected.slice(0, max) };
}

export function resolveRelatedProducts({
  sourceProductId,
  manualTargetIds = [],
  productsById,
}) {
  const sourceId = String(sourceProductId || "");
  const related = [];
  for (const id of manualTargetIds) {
    const product = productsById.get(id);
    if (!product || product.id === sourceId) continue;
    if (!isPubliclySelectableProduct(product)) continue;
    related.push(product);
  }
  return related;
}

export function normalizeRelationRow(row = {}) {
  return {
    id: String(row.id || ""),
    companyId: row.companyId || row.company_id || null,
    company_id: row.company_id || row.companyId || null,
    sourceProductId: String(row.sourceProductId || row.source_product_id || ""),
    targetProductId: String(row.targetProductId || row.target_product_id || ""),
    type: String(row.type || ""),
    sortOrder: Number(row.sortOrder ?? row.sort_order ?? 0),
    createdAt: row.createdAt || row.created_at || null,
    updatedAt: row.updatedAt || row.updated_at || null,
  };
}
