/**
 * Product display priority — pure selection, inheritance, and ordering rules
 * (Spec 004 / T005, T007).
 *
 * Everything here is tenant-agnostic pure logic: callers pass the already
 * company-scoped products, brands, orders, and stored configuration rows.
 * No I/O, no fabricated ranks, no copied product fields.
 *
 * Surfaces: home and shop. Each surface has a global row (brandId null) and
 * optional brand overrides. A brand field that is null inherits that field
 * from the same surface's global row. Home never inherits shop.
 */

import {
  PRODUCT_FILTER_ATTRIBUTE_GROUPS,
  PRODUCT_FILTER_ATTRIBUTE_OPTIONS,
  normalizeProductFilterAttributeForRead,
} from "../catalog/productFilterAttributes.js";
import {
  productIsBestseller,
  productIsFeatured,
  productIsNewArrival,
  resolvePublicSalePrice,
} from "./merchandisingFlags.js";
import { verifiedUnitsForProduct } from "./verifiedSales.js";

export const DISPLAY_SURFACES = Object.freeze(["home", "shop"]);
export const DISPLAY_MATCH_MODES = Object.freeze(["and", "or"]);
export const SELECTION_SOURCES = Object.freeze(["flag", "filter", "collection", "category"]);
export const MERCHANDISING_FLAG_IDS = Object.freeze(["featured", "newArrival", "bestseller"]);

/** Approved ordering keys (FR-007 / D3). Not limited to featured/bestseller/manual. */
export const ORDERING_KEYS = Object.freeze([
  "catalog",
  "featured",
  "newArrival",
  "bestseller",
  "verifiedSales",
  "manual",
  "newest",
  "oldest",
  "priceAsc",
  "priceDesc",
  "name",
]);

/** Rejected ordering keys (D4): quick shop, most-viewed, random. */
export const REJECTED_ORDERING_KEYS = Object.freeze([
  "quickShop",
  "quick-shop",
  "mostViewed",
  "most-viewed",
  "random",
]);

export function displayPriorityError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

/* ------------------------------------------------------------------ *
 * Normalization
 * ------------------------------------------------------------------ */

export function normalizeSurface(surface) {
  const value = String(surface ?? "").trim();
  if (!DISPLAY_SURFACES.includes(value)) throw displayPriorityError(`Unknown surface "${value}".`);
  return value;
}

/** Returns "and" | "or" | null (null only when allowNull and nothing stored). */
export function normalizeMatchMode(mode, { allowNull = true } = {}) {
  if (mode === null || mode === undefined || mode === "") {
    if (allowNull) return null;
    return "and";
  }
  const value = String(mode).trim().toLowerCase();
  if (!DISPLAY_MATCH_MODES.includes(value)) {
    throw displayPriorityError(`Unknown selection match mode "${value}".`);
  }
  return value;
}

/** Stored match defaults to "and" when unset (D2). */
export function resolveMatchMode(mode) {
  return normalizeMatchMode(mode, { allowNull: false });
}

/**
 * Validate one ordering key. Returns null only when the field is unset
 * (inheritance / catalog default). Rejected and unknown keys throw 400.
 */
export function normalizeOrderingKey(key, { allowNull = true } = {}) {
  if (key === null || key === undefined || key === "") {
    if (allowNull) return null;
    throw displayPriorityError("Ordering key is required.");
  }
  const value = String(key).trim();
  if (REJECTED_ORDERING_KEYS.includes(value)) {
    throw displayPriorityError(`Ordering key "${value}" is not supported.`);
  }
  if (!ORDERING_KEYS.includes(value)) {
    throw displayPriorityError(`Unknown ordering key "${value}".`);
  }
  return value;
}

function isQuickShopId(id) {
  return ["quickShop", "quick-shop", "quick_shop"].includes(String(id || "").trim());
}

function vocabularyHasOption(group, id) {
  const options = PRODUCT_FILTER_ATTRIBUTE_OPTIONS[group];
  return Array.isArray(options) && options.some((option) => option.id === id);
}

/** Validate one selection rule against the existing catalog vocabulary. */
export function normalizeSelectionRule(rule = {}) {
  const source = String(rule?.source ?? "").trim();
  if (!SELECTION_SOURCES.includes(source)) {
    throw displayPriorityError(`Unknown selection source "${source}".`);
  }
  const id = String(rule?.id ?? "").trim();
  if (!id) throw displayPriorityError("Selection rule id is required.");
  if (isQuickShopId(id)) throw displayPriorityError("quickShop is not a selection source.");

  if (source === "flag") {
    if (!MERCHANDISING_FLAG_IDS.includes(id)) {
      throw displayPriorityError(`Unknown merchandising flag "${id}".`);
    }
    return { source, id };
  }

  if (source === "filter") {
    const group = String(rule?.group ?? "").trim();
    if (!PRODUCT_FILTER_ATTRIBUTE_GROUPS.includes(group)) {
      throw displayPriorityError(`Unknown filter group "${group}".`);
    }
    if (!vocabularyHasOption(group, id)) {
      throw displayPriorityError(`Unknown filter id "${id}".`);
    }
    return { source, group, id };
  }

  if (source === "collection") {
    if (!vocabularyHasOption("collection", id)) {
      throw displayPriorityError(`Unknown collection id "${id}".`);
    }
    return { source, id };
  }

  // Category existence is company-scoped and checked by the caller.
  return { source, id };
}

/**
 * Normalize a selection payload (array of rules or { match, rules }) into
 * `{ match, rules }`. `match` defaults to "and". Returns null for an unset
 * selection so callers can distinguish "inherit" from "explicitly empty".
 */
export function normalizeSelection(selection, options = {}) {
  if (selection === null || selection === undefined) return null;

  let rawMatch = null;
  let rawRules = [];
  if (Array.isArray(selection)) {
    rawRules = selection;
  } else if (typeof selection === "object") {
    rawMatch = selection.match ?? null;
    rawRules = Array.isArray(selection.rules) ? selection.rules : [];
  } else {
    throw displayPriorityError("Invalid selection.");
  }

  const knownCategoryIds = options.knownCategoryIds == null
    ? null
    : options.knownCategoryIds instanceof Set
      ? options.knownCategoryIds
      : new Set(options.knownCategoryIds);

  const rules = rawRules.map((rule) => {
    const normalized = normalizeSelectionRule(rule);
    if (normalized.source === "category" && knownCategoryIds && !knownCategoryIds.has(normalized.id)) {
      throw displayPriorityError(`Unknown category id "${normalized.id}".`);
    }
    return normalized;
  });

  return { match: resolveMatchMode(rawMatch), rules };
}

/* ------------------------------------------------------------------ *
 * Configuration inheritance (T005)
 * ------------------------------------------------------------------ */

/**
 * Map one stored display mode row into the config shape consumed by
 * `resolveSurfaceConfig` / `resolveDisplayPriority`.
 *
 * A null stored selection is passed through as `selection: null` so "inherit"
 * survives the round trip; only a stored rules array (including an explicit
 * empty one) becomes `{ match, rules }`, using the stored selection match.
 */
export function displayConfigFromRow(row) {
  if (!row || typeof row !== "object") return null;
  const rules = Array.isArray(row.selection)
    ? row.selection
    : typeof row.selection === "string"
      ? (() => { try { return JSON.parse(row.selection); } catch { return null; } })()
      : null;
  return {
    surface: row.surface,
    selection: Array.isArray(rules)
      ? { match: row.selectionMatch ?? row.selection_match ?? null, rules }
      : null,
    orderingKey: row.orderingKey ?? row.ordering_key ?? null,
  };
}

function normalizeConfigShape(config, surface) {
  if (config === null || config === undefined) {
    return { surface, selection: null, orderingKey: null };
  }
  if (typeof config !== "object") throw displayPriorityError("Invalid display configuration.");
  if (config.surface !== null && config.surface !== undefined && config.surface !== "") {
    const configSurface = normalizeSurface(config.surface);
    if (configSurface !== surface) {
      // Home never inherits shop and shop never inherits home.
      throw displayPriorityError(`Surface "${surface}" does not inherit "${configSurface}".`);
    }
  }
  return {
    surface,
    selection: normalizeSelection(config.selection ?? null, optionsForConfig(config)),
    orderingKey: normalizeOrderingKey(config.orderingKey ?? null),
  };
}

function optionsForConfig(config) {
  return { knownCategoryIds: config.knownCategoryIds };
}

/**
 * Resolve one surface for one scope. A brand row contributes only the fields
 * it stores; null fields inherit the same-surface global value independently.
 */
export function resolveSurfaceConfig(surface, globalConfig = null, brandConfig = null) {
  const resolvedSurface = normalizeSurface(surface);
  const global = normalizeConfigShape(globalConfig, resolvedSurface);
  const brand = brandConfig === null || brandConfig === undefined
    ? null
    : normalizeConfigShape(brandConfig, resolvedSurface);

  const inheritedSelection = !brand || brand.selection === null;
  const inheritedOrdering = !brand || brand.orderingKey === null;

  const selection = inheritedSelection ? global.selection : brand.selection;
  const orderingKey = inheritedOrdering ? global.orderingKey : brand.orderingKey;

  return {
    surface: resolvedSurface,
    inheritedSelection,
    inheritedOrdering,
    selection: selection || { match: "and", rules: [] },
    orderingKey: orderingKey || "catalog",
  };
}

/* ------------------------------------------------------------------ *
 * Eligibility, brand boundary, selection (T005, T007)
 * ------------------------------------------------------------------ */

/** Active, visible, and not trashed. */
export function isEligibleProduct(product) {
  if (!product || typeof product !== "object") return false;
  if (product.isActive === false || product.is_active === false) return false;
  if (product.visible === false) return false;
  if (product.deletedAt || product.deleted_at) return false;
  return true;
}

export function eligibleProducts(products = []) {
  return (Array.isArray(products) ? products : []).filter(isEligibleProduct);
}

/** Brand results include only that brand. An empty brand id keeps every brand. */
export function applyBrandBoundary(products = [], brandId) {
  const id = String(brandId ?? "").trim();
  if (!id) return Array.isArray(products) ? products : [];
  return (Array.isArray(products) ? products : []).filter(
    (product) => String(product?.brandId ?? product?.brand_id ?? "") === id,
  );
}

/** Reject a brand id that does not exist in the company's brand list. */
export function assertKnownBrand(brandId, brands = null) {
  const id = String(brandId ?? "").trim();
  if (!id) return null;
  if (brands === null || brands === undefined) return id;
  const known = (Array.isArray(brands) ? brands : []).some(
    (brand) => String(brand?.id ?? "") === id,
  );
  if (!known) throw displayPriorityError(`Unknown brand "${id}".`);
  return id;
}

function productFilterValues(product, group) {
  return normalizeProductFilterAttributeForRead(group, product?.[group]);
}

function productCategoryIds(product = {}) {
  return [
    product.categoryId ?? product.category_id,
    product.subcategoryId ?? product.subcategory_id,
    product.mainCategoryId ?? product.main_category_id,
  ]
    .filter(Boolean)
    .map(String);
}

export function productMatchesRule(product, rule) {
  const normalized = normalizeSelectionRule(rule);

  if (normalized.source === "flag") {
    if (normalized.id === "featured") {
      return productIsFeatured(product) || productFilterValues(product, "collection").includes("featured");
    }
    if (normalized.id === "newArrival") return productIsNewArrival(product);
    if (normalized.id === "bestseller") return productIsBestseller(product);
    return false;
  }

  if (normalized.source === "filter") {
    return productFilterValues(product, normalized.group).includes(normalized.id);
  }

  if (normalized.source === "collection") {
    return productFilterValues(product, "collection").includes(normalized.id);
  }

  return productCategoryIds(product).includes(normalized.id);
}

/**
 * Filter eligible products by the selection. Empty rules mean every eligible
 * product in the boundary. `and` is the default match mode; `or` is explicit.
 */
export function applySelection(products = [], selection) {
  const eligible = eligibleProducts(products);
  const normalized = normalizeSelection(selection) || { match: "and", rules: [] };
  if (!normalized.rules.length) return eligible;
  const matches = (product) => (normalized.match === "or"
    ? normalized.rules.some((rule) => productMatchesRule(product, rule))
    : normalized.rules.every((rule) => productMatchesRule(product, rule)));
  return eligible.filter(matches);
}

/* ------------------------------------------------------------------ *
 * Ordering keys (T007)
 * ------------------------------------------------------------------ */

function catalogRank(product) {
  const raw = Number(product?.sortOrder ?? product?.sort_order);
  return Number.isFinite(raw) ? raw : Number.MAX_SAFE_INTEGER;
}

function catalogCompare(left, right) {
  const bySort = catalogRank(left) - catalogRank(right);
  if (bySort !== 0) return bySort;
  return String(left?.slug ?? left?.id ?? "").localeCompare(String(right?.slug ?? right?.id ?? ""));
}

function displayName(product = {}) {
  const name = product.name;
  if (typeof name === "string") return name;
  if (name && typeof name === "object") {
    return String(name.en ?? name.ar ?? name.he ?? "");
  }
  return String(product.nameEn ?? product.nameAr ?? product.name_ar ?? product.id ?? "");
}

function displayTimestamp(product = {}) {
  const raw = product.createdAt ?? product.created_at;
  if (!raw) return 0;
  const parsed = Date.parse(String(raw));
  return Number.isNaN(parsed) ? 0 : parsed;
}

function displayPrice(product = {}) {
  const variants = Array.isArray(product.variants) ? product.variants : [];
  const primary = variants.find((variant) => variant && variant.visible !== false) || variants[0];
  if (primary && Number.isFinite(Number(primary.price))) {
    return resolvePublicSalePrice(
      Number(primary.price),
      primary.salePrice ?? primary.sale_price,
    ).price;
  }
  const base = Number(product.price ?? product.basePrice);
  return resolvePublicSalePrice(
    Number.isFinite(base) ? base : 0,
    product.salePrice ?? product.sale_price,
  ).price;
}

/** Accepts rows ({ productId, position }), maps, or a plain ordered id array. */
export function normalizeManualPositions(source) {
  if (source instanceof Map) return new Map(source);
  const positions = new Map();
  if (Array.isArray(source)) {
    source.forEach((entry, index) => {
      if (entry && typeof entry === "object") {
        const productId = String(entry.productId ?? entry.product_id ?? entry.id ?? "").trim();
        if (!productId) return;
        const raw = Number(entry.position ?? entry.pos);
        positions.set(productId, Number.isFinite(raw) ? raw : index);
        return;
      }
      if (entry !== null && entry !== undefined && entry !== "") {
        positions.set(String(entry), index);
      }
    });
  }
  return positions;
}

/**
 * Apply one approved ordering key to the selected set. Ties fall back to
 * catalog order (sortOrder, then slug). `verifiedSales` with zero verified
 * units falls back to catalog order instead of inventing a rank (FR-009).
 */
export function applyOrderingKey(products = [], orderingKey, options = {}) {
  const key = normalizeOrderingKey(orderingKey) || "catalog";
  const list = Array.isArray(products) ? [...products] : [];
  const byCatalog = catalogCompare;

  switch (key) {
    case "featured":
      return list.sort((a, b) => Number(productIsFeatured(b)) - Number(productIsFeatured(a)) || byCatalog(a, b));
    case "newArrival":
      return list.sort((a, b) => Number(productIsNewArrival(b)) - Number(productIsNewArrival(a)) || byCatalog(a, b));
    case "bestseller":
      return list.sort((a, b) => Number(productIsBestseller(b)) - Number(productIsBestseller(a)) || byCatalog(a, b));
    case "verifiedSales": {
      const counts = options.verifiedUnits instanceof Map
        ? options.verifiedUnits
        : new Map(Object.entries(options.verifiedUnits || {}));
      const units = (product) => verifiedUnitsForProduct(counts, product?.id);
      const total = list.reduce((sum, product) => sum + units(product), 0);
      if (total <= 0) return list.sort(byCatalog);
      return list.sort((a, b) => units(b) - units(a) || byCatalog(a, b));
    }
    case "manual": {
      const positions = normalizeManualPositions(options.manualPositions);
      if (!positions.size) return list.sort(byCatalog);
      return list.sort((a, b) => {
        const left = positions.has(String(a?.id)) ? positions.get(String(a.id)) : Number.MAX_SAFE_INTEGER;
        const right = positions.has(String(b?.id)) ? positions.get(String(b.id)) : Number.MAX_SAFE_INTEGER;
        return left - right || byCatalog(a, b);
      });
    }
    case "newest":
      return list.sort((a, b) => displayTimestamp(b) - displayTimestamp(a) || byCatalog(a, b));
    case "oldest":
      return list.sort((a, b) => displayTimestamp(a) - displayTimestamp(b) || byCatalog(a, b));
    case "priceAsc":
      return list.sort((a, b) => displayPrice(a) - displayPrice(b) || byCatalog(a, b));
    case "priceDesc":
      return list.sort((a, b) => displayPrice(b) - displayPrice(a) || byCatalog(a, b));
    case "name":
      return list.sort((a, b) => displayName(a).localeCompare(displayName(b)) || byCatalog(a, b));
    case "catalog":
    default:
      return list.sort(byCatalog);
  }
}

/* ------------------------------------------------------------------ *
 * Row normalization for persistence (T004)
 * ------------------------------------------------------------------ */

export function displayRowScopeId(surface, brandId) {
  return `${String(surface)}::${brandId === null || brandId === undefined ? "" : String(brandId)}`;
}

export function normalizeDisplayModeRow(row = {}) {
  const surface = String(row.surface ?? "").trim();
  const brandId = row.brandId ?? row.brand_id ?? null;
  // null selection means "inherit" and must survive the round trip as null;
  // only an explicit array (including []) is a stored selection.
  const selection = row.selection === null
    ? null
    : Array.isArray(row.selection)
      ? row.selection
      : typeof row.selection === "string"
        ? (() => {
          try {
            const parsed = JSON.parse(row.selection);
            if (parsed === null) return null;
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        })()
        : [];
  return {
    id: displayRowScopeId(surface, brandId),
    surface,
    brandId: brandId === null || brandId === "" ? null : String(brandId),
    orderingKey: row.orderingKey ?? row.ordering_key ?? null,
    selectionMatch: row.selectionMatch ?? row.selection_match ?? null,
    selection,
    updatedAt: row.updatedAt ?? row.updated_at ?? new Date().toISOString(),
  };
}

export function normalizeDisplayPositionRow(row = {}) {
  const surface = String(row.surface ?? "").trim();
  const brandId = row.brandId ?? row.brand_id ?? null;
  const productId = String(row.productId ?? row.product_id ?? "");
  return {
    id: `${displayRowScopeId(surface, brandId)}::${productId}`,
    surface,
    brandId: brandId === null || brandId === "" ? null : String(brandId),
    productId,
    position: Number.isFinite(Number(row.position)) ? Number(row.position) : 0,
  };
}

/* ------------------------------------------------------------------ *
 * Composed resolver
 * ------------------------------------------------------------------ */

/**
 * Resolve one surface for one scope into ordered product ids.
 *
 * Order of operations: eligibility → brand boundary → selection → ordering.
 * Home is resolved exactly like shop but never inherits a shop row.
 */
export function resolveDisplayPriority(options = {}) {
  const surface = normalizeSurface(options.surface);
  const brandId = options.brandId ? assertKnownBrand(options.brandId, options.brands ?? null) : null;

  const resolved = resolveSurfaceConfig(surface, options.globalConfig ?? null, options.brandConfig ?? null);

  const bounded = applyBrandBoundary(eligibleProducts(options.products), brandId);
  const selected = applySelection(bounded, resolved.selection);
  const ordered = applyOrderingKey(selected, resolved.orderingKey, {
    verifiedUnits: options.verifiedUnits,
    manualPositions: options.manualPositions,
  });

  return {
    surface,
    brandId,
    inheritedSelection: resolved.inheritedSelection,
    inheritedOrdering: resolved.inheritedOrdering,
    orderingKey: resolved.orderingKey,
    match: resolved.selection.match,
    orderedIds: ordered.map((product) => product.id),
    products: ordered,
  };
}
