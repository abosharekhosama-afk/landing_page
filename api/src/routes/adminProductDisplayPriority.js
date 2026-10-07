import { Router } from "express";
import {
  deleteProductDisplayConfiguration,
  listProductDisplayModes,
  listProductDisplayPositions,
  orderRepository,
  productRepository,
  saveProductDisplayConfiguration,
  tenantBrandRepository,
  tenantCategoryRepository,
} from "../data/store.js";
import { recordActivityLog } from "../activityLog/logger.js";
import { optionalAuth, requireAuth, requirePermission } from "../middleware/auth.js";
import {
  applyBrandBoundary,
  applySelection,
  assertKnownBrand,
  displayConfigFromRow,
  displayPriorityError,
  eligibleProducts,
  normalizeOrderingKey,
  normalizeSelection,
  normalizeSurface,
  resolveSurfaceConfig,
} from "../products/displayPriority.js";
import { verifiedUnitsByProductId } from "../products/verifiedSales.js";
import { requireProductListPermission } from "./products.js";

/**
 * Admin product display priority (Spec 004 / T010, T011, T016, T018).
 *
 * Mounted at /api/admin/product-display-priority — never under
 * /api/admin/products, so PATCH /api/admin/products/reorder is untouched.
 *
 * Company scope always comes from req.companyId (verified JWT); a body or
 * query company id is ignored. A null selection / null orderingKey stores
 * "inherit" and must stay distinct from an explicit empty rules array.
 */

const router = Router();

function sendError(res, error, context) {
  if (error?.statusCode) return res.status(error.statusCode).json({ message: error.message });
  console.error(context, error);
  return res.status(500).json({ message: "Product display priority request failed." });
}

function requireCompany(req, res) {
  if (req.companyId) return true;
  res.status(404).json({ message: "Company not found." });
  return false;
}

/** Brand ids must exist in this company's brand list; anything else is 400. */
async function resolveScopeBrandId(req, rawBrandId) {
  const id = String(rawBrandId ?? "").trim();
  if (!id) return null;
  const brands = await tenantBrandRepository.listByCompany(req.companyId);
  return assertKnownBrand(id, brands);
}

function findModeRow(modes, surface, brandId) {
  return modes.find((row) => row.surface === surface && (row.brandId ?? null) === brandId) || null;
}

function scopeSnapshot(row) {
  if (!row) return null;
  return {
    selection: Array.isArray(row.selection) ? row.selection : null,
    selectionMatch: row.selectionMatch ?? null,
    orderingKey: row.orderingKey ?? null,
    updatedAt: row.updatedAt ?? null,
  };
}

function normalizeManualIds(value) {
  if (value === null || value === undefined) return [];
  if (!Array.isArray(value)) throw displayPriorityError("productIds must be an array.");
  const ids = [];
  for (const entry of value) {
    const id = String(entry ?? "").trim();
    if (!id) throw displayPriorityError("productIds must not contain empty values.");
    if (ids.includes(id)) throw displayPriorityError(`Duplicate manual product id "${id}".`);
    ids.push(id);
  }
  return ids;
}

/**
 * Stored fields plus the two inheritance flags. `selection: null` means
 * inherit (never rewritten to []), `orderingKey: null` means inherit too.
 */
function presentScope({ surface, brandId, storedRow, globalRow, positions = [] }) {
  const resolved = resolveSurfaceConfig(
    surface,
    displayConfigFromRow(globalRow),
    brandId ? displayConfigFromRow(storedRow) : null,
  );
  return {
    surface,
    brandId: brandId ?? null,
    exists: Boolean(storedRow),
    selection: storedRow && Array.isArray(storedRow.selection) ? storedRow.selection : null,
    selectionMatch: storedRow ? (storedRow.selectionMatch ?? null) : null,
    orderingKey: storedRow ? (storedRow.orderingKey ?? null) : null,
    productIds: positions.map((row) => row.productId),
    updatedAt: storedRow ? (storedRow.updatedAt ?? null) : null,
    inheritedSelection: resolved.inheritedSelection,
    inheritedOrdering: resolved.inheritedOrdering,
    resolvedSelection: resolved.selection,
    resolvedOrderingKey: resolved.orderingKey,
  };
}

/**
 * GET /api/admin/product-display-priority?surface=home|shop&brandId=optional
 * Read permission: the exact product list role check (T016).
 */
router.get("/", optionalAuth, requireProductListPermission, async (req, res) => {
  try {
    if (!requireCompany(req, res)) return undefined;
    const surface = normalizeSurface(req.query?.surface);
    const brandId = await resolveScopeBrandId(req, req.query?.brandId);

    const modes = await listProductDisplayModes(req.companyId);
    const globalRow = findModeRow(modes, surface, null);
    const storedRow = brandId ? findModeRow(modes, surface, brandId) : globalRow;
    const positions = await listProductDisplayPositions(req.companyId, {
      surface,
      brandId: brandId ?? null,
    });

    return res.json(presentScope({ surface, brandId, storedRow, globalRow, positions }));
  } catch (error) {
    return sendError(res, error, "Product display priority GET failed");
  }
});

/**
 * PUT /api/admin/product-display-priority
 * Body: { surface, brandId, selection, orderingKey, productIds }.
 * Permission: products.update. One activity log entry on success.
 */
router.put("/", requireAuth, requirePermission("products.update"), async (req, res) => {
  try {
    if (!requireCompany(req, res)) return undefined;
    const body = req.body && typeof req.body === "object" && !Array.isArray(req.body) ? req.body : {};
    const surface = normalizeSurface(body.surface);
    const brandId = await resolveScopeBrandId(req, body.brandId);

    const categories = await tenantCategoryRepository.listByCompany(req.companyId);
    const knownCategoryIds = categories.map((category) => String(category.id));

    // Missing selection / orderingKey means "store inherit".
    const normalizedSelection = normalizeSelection(
      Object.prototype.hasOwnProperty.call(body, "selection") ? body.selection : null,
      { knownCategoryIds },
    );
    const orderingKey = normalizeOrderingKey(
      Object.prototype.hasOwnProperty.call(body, "orderingKey") ? body.orderingKey : null,
    );
    const productIds = normalizeManualIds(body.productIds);

    const modes = await listProductDisplayModes(req.companyId);
    const globalRow = findModeRow(modes, surface, null);
    const storedRow = brandId ? findModeRow(modes, surface, brandId) : globalRow;

    const proposedConfig = { surface, selection: normalizedSelection, orderingKey };
    const resolved = resolveSurfaceConfig(
      surface,
      brandId ? displayConfigFromRow(globalRow) : proposedConfig,
      brandId ? proposedConfig : null,
    );

    const companyProducts = productRepository.getByCompany(req.companyId);
    const ownedIds = new Set(companyProducts.map((product) => String(product.id)));
    for (const id of productIds) {
      if (!ownedIds.has(id)) throw displayPriorityError(`Unknown product id "${id}".`);
    }

    const selected = applySelection(
      applyBrandBoundary(eligibleProducts(companyProducts), brandId),
      resolved.selection,
    );
    const selectedIds = new Set(selected.map((product) => String(product.id)));
    for (const id of productIds) {
      if (!selectedIds.has(id)) {
        throw displayPriorityError(`Product id "${id}" is outside the configured selection.`);
      }
    }

    if (orderingKey === "verifiedSales") {
      const counts = verifiedUnitsByProductId(orderRepository.getByCompany(req.companyId));
      const total = selected.reduce(
        (sum, product) => sum + (counts.get(String(product.id)) || 0),
        0,
      );
      if (total <= 0) {
        return res.status(409).json({
          message: "verifiedSales needs at least one verified unit in the selected set.",
        });
      }
    }

    const before = scopeSnapshot(storedRow);
    const saved = await saveProductDisplayConfiguration(req.companyId, {
      surface,
      brandId,
      orderingKey,
      selection: normalizedSelection,
      selectionMatch: normalizedSelection ? normalizedSelection.match : null,
      productIds,
    });
    const positions = await listProductDisplayPositions(req.companyId, {
      surface,
      brandId: brandId ?? null,
    });

    await recordActivityLog({
      req,
      companyId: req.companyId,
      action: "product.display_priority_updated",
      entityType: "product",
      entityId: `${surface}::${brandId || ""}`,
      entityLabel: brandId ? `${surface} / ${brandId}` : `${surface} (global)`,
      summary: `Updated ${surface} product display priority`,
      beforeData: before,
      afterData: scopeSnapshot(saved.mode),
      metadata: { surface, brandId, orderingKey, operation: "put" },
    });

    return res.json(presentScope({
      surface,
      brandId,
      storedRow: saved.mode,
      globalRow: brandId ? globalRow : saved.mode,
      positions,
    }));
  } catch (error) {
    return sendError(res, error, "Product display priority PUT failed");
  }
});

/**
 * DELETE /api/admin/product-display-priority?surface=home|shop&brandId=optional
 * Removes the scope so the next read inherits again.
 */
router.delete("/", requireAuth, requirePermission("products.update"), async (req, res) => {
  try {
    if (!requireCompany(req, res)) return undefined;
    const surface = normalizeSurface(req.query?.surface);
    const brandId = await resolveScopeBrandId(req, req.query?.brandId);

    const modes = await listProductDisplayModes(req.companyId);
    const existing = findModeRow(modes, surface, brandId);
    const result = await deleteProductDisplayConfiguration(req.companyId, surface, brandId);

    await recordActivityLog({
      req,
      companyId: req.companyId,
      action: "product.display_priority_updated",
      entityType: "product",
      entityId: `${surface}::${brandId || ""}`,
      entityLabel: brandId ? `${surface} / ${brandId}` : `${surface} (global)`,
      summary: `Removed ${surface} product display priority`,
      beforeData: scopeSnapshot(existing),
      afterData: null,
      metadata: { surface, brandId, operation: "delete" },
    });

    return res.json({ surface, brandId: brandId ?? null, deleted: result.deleted === true });
  } catch (error) {
    return sendError(res, error, "Product display priority DELETE failed");
  }
});

export default router;
