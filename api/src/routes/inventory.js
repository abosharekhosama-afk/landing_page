import { Router } from "express";
import {
  companyRepository,
  listInventoryPageForCompany,
  listProductsForValuation,
  productRepository,
  saveProductWithTenantCatalogLock,
} from "../data/store.js";
import { requireAnyPermission, requireAuth } from "../middleware/auth.js";
import { applyInventoryUpdate, inventoryProduct } from "../products/inventory.js";
import {
  buildValuationRows,
  emptyValuationSummary,
  filterProductsForValuation,
  filterRowsByCostStatus,
  paginateValuationRows,
  parseValuationQuery,
  summarizeValuation,
  withCostVisibility,
} from "../products/inventoryValuation.js";
import { isProductTrashed } from "../products/trashLifecycle.js";
import { recordActivityLog } from "../activityLog/logger.js";
import { parseInventoryListQuery } from "../products/inventoryListSql.js";
import { canAccessCostPrice, companyLowStockThreshold } from "../products/productSettings.js";

const router = Router();

const inventoryRead = requireAnyPermission("inventory.view", "inventory.manage", "products.view", "products.manage");
const inventoryWrite = requireAnyPermission("inventory.manage", "products.update", "products.manage");

router.get("/", requireAuth, inventoryRead, async (req, res) => {
  const listQuery = parseInventoryListQuery(req.query, {
    lowStockThreshold: Number(req.company?.settings?.lowStockThreshold) || 5,
  });

  // Paginated admin list: repository/DB COUNT + LIMIT/OFFSET (+ KPI summary).
  if (listQuery.wantsPagination) {
    const pageResult = await listInventoryPageForCompany(req.companyId, listQuery);
    return res.json({
      items: pageResult.items.map(inventoryProduct),
      total: pageResult.total,
      page: pageResult.page,
      limit: pageResult.limit,
      summary: pageResult.summary,
    });
  }

  // Legacy full-array response for older callers.
  res.json(
    productRepository.getByCompany(req.companyId)
      .filter((product) => !isProductTrashed(product))
      .map(inventoryProduct),
  );
});

/**
 * T2 #8 — GET /api/admin/inventory/valuation (tenant-scoped).
 * Summary is computed over the full filtered set; items are paginated.
 * Cost fields are nulled server-side unless costPriceEnabled + products.cost_price.manage.
 */
router.get("/valuation", requireAuth, inventoryRead, async (req, res) => {
  try {
    const company = companyRepository.getCompanyById(req.companyId) || req.company || null;
    const currency = String(company?.settings?.currency || "ILS").toUpperCase();
    const filters = parseValuationQuery(req.query || {});
    const threshold = companyLowStockThreshold(company);
    const scoped = await listProductsForValuation(req.companyId, {
      q: filters.q, brand: filters.brand, category: filters.category,
      status: filters.status, stock: filters.stock,
      merchandising: filters.merchandising, lowStockThreshold: threshold,
    });
    const filtered = filterProductsForValuation(scoped, {
      q: filters.q, brand: filters.brand, category: filters.category,
      status: filters.status, stock: filters.stock, lowStockThreshold: threshold,
    });
    const rows = filterRowsByCostStatus(
      buildValuationRows(filtered, { lowStockThreshold: threshold }),
      filters.costStatus,
    );
    const summary = rows.length ? summarizeValuation(rows, { currency }) : emptyValuationSummary({ currency });
    const page = paginateValuationRows(rows, filters.page, filters.limit);
    const costVisible = canAccessCostPrice(req, company);
    return res.json(withCostVisibility({
      summary,
      items: page.items,
      page: page.page,
      limit: page.limit,
      total: page.total,
      totalPages: page.totalPages,
      filters: {
        q: filters.q, brand: filters.brand, category: filters.category,
        status: filters.status, stock: filters.stock, costStatus: filters.costStatus,
      },
    }, costVisible));
  } catch (error) {
    console.error("Inventory valuation failed", { code: error?.code || "UNKNOWN" });
    return res.status(500).json({ message: "Inventory valuation could not be loaded." });
  }
});

router.patch("/:id", requireAuth, inventoryWrite, async (req, res) => {
  const existing = productRepository.findByCompany(req.companyId, req.params.id);
  if (!existing || isProductTrashed(existing)) return res.status(404).json({ message: "Product not found." });

  try {
    const updated = applyInventoryUpdate(existing, req.body);

    const saved = await saveProductWithTenantCatalogLock(req.companyId, updated);
    recordActivityLog({
      req,
      companyId: req.companyId,
      action: "product.inventory_updated",
      entityType: "product",
      entityId: saved.id,
      entityLabel: saved.name?.en || saved.slug || saved.id,
      summary: `Inventory updated for "${saved.name?.en || saved.slug || saved.id}"`,
      beforeData: inventoryProduct(existing),
      afterData: inventoryProduct(saved),
    });
    return res.json(inventoryProduct(saved));
  } catch (error) {
    if (error?.statusCode) return res.status(error.statusCode).json({ message: error.message });
    console.error("Inventory update failed", { code: error?.code || "UNKNOWN" });
    return res.status(500).json({ message: "Inventory could not be updated." });
  }
});

export default router;
