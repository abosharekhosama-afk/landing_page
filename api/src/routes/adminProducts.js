import { Router } from "express";
import { reorderProductsWithTenantCatalogLock } from "../data/store.js";
import { recordActivityLog } from "../activityLog/logger.js";
import { requireAuth, requirePermission } from "../middleware/auth.js";
import { parseReorderProductIds } from "../products/reorderProducts.js";

const router = Router();

/**
 * PATCH /api/admin/products/reorder
 * Body: { productIds: string[] } — desired global order (sortOrder = index).
 * Permission: products.update
 * One activity log entry: product.reordered
 */
router.patch("/reorder", requireAuth, requirePermission("products.update"), async (req, res) => {
  let productIds;
  try {
    productIds = parseReorderProductIds(req.body);
  } catch (error) {
    return res.status(error.statusCode || 400).json({ message: error.message });
  }

  let result;
  try {
    result = await reorderProductsWithTenantCatalogLock(req.companyId, productIds);
  } catch (error) {
    if (error?.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    console.error("Product reorder failed", { code: error?.code || "UNKNOWN" });
    return res.status(500).json({ message: "Product reorder failed." });
  }

  await recordActivityLog({
    req,
    companyId: req.companyId,
    action: "product.reordered",
    entityType: "product",
    entityId: productIds[0] || "",
    entityLabel: `batch:${productIds.length}`,
    summary: `Reordered ${productIds.length} products`,
    beforeData: {
      sortOrders: result.patches.map((patch) => ({
        id: patch.id,
        sortOrder: patch.previousSortOrder,
      })),
    },
    afterData: {
      productIds,
      sortOrders: result.patches.map((patch) => ({
        id: patch.id,
        sortOrder: patch.sortOrder,
      })),
    },
    metadata: { count: productIds.length },
  });

  return res.json({
    productIds,
    products: result.patches.map((patch) => ({
      id: patch.id,
      sortOrder: patch.sortOrder,
    })),
  });
});

export default router;
