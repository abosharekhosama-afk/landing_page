import crypto from "node:crypto";
import { Router } from "express";
import {
  persistCompanyStore,
  productBundleItemRepository,
  productBundleRepository,
  productRepository,
} from "../data/store.js";
import { requireAuth, requireAnyPermission } from "../middleware/auth.js";
import { recordActivityLog } from "../activityLog/logger.js";
import { normalizeBundle, sanitizeBundleInput } from "../bundles/schema.js";
import { mergeBundleItems, priceBundle } from "../bundles/bundlePricing.js";
import { filterActiveProducts } from "../products/trashLifecycle.js";

const router = Router();

const bundleRead = requireAnyPermission("products.view", "products.manage", "products.update");
const bundleWrite = requireAnyPermission("products.manage", "products.update", "products.create");

function sendError(res, error) {
  return res.status(error.statusCode || 500).json({
    message: error.statusCode ? error.message : "Unable to process product bundle request.",
  });
}

function bundleItemsFor(companyId, bundleId) {
  return productBundleItemRepository
    .getByCompany(companyId)
    .filter((item) => item.bundleId === bundleId);
}

function companyBundles(companyId) {
  const products = filterActiveProducts(productRepository.getByCompany(companyId));
  return productBundleRepository
    .getByCompany(companyId)
    .map((bundle) => {
      const normalized = normalizeBundle(bundle);
      const withItems = mergeBundleItems(normalized, bundleItemsFor(companyId, bundle.id));
      return priceBundle(withItems, withItems.items, products);
    })
    .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
}

function findBundle(companyId, bundleId) {
  const bundle = productBundleRepository.findByCompany(companyId, bundleId);
  if (!bundle) {
    const error = new Error("Product bundle not found.");
    error.statusCode = 404;
    throw error;
  }
  const normalized = normalizeBundle(bundle);
  const withItems = mergeBundleItems(normalized, bundleItemsFor(companyId, bundle.id));
  const products = filterActiveProducts(productRepository.getByCompany(companyId));
  return priceBundle(withItems, withItems.items, products);
}

function replaceBundleItems(companyId, bundleId, items) {
  const existing = bundleItemsFor(companyId, bundleId);
  for (const item of existing) {
    productBundleItemRepository.deleteForCompany(companyId, item.id);
  }
  const now = new Date().toISOString();
  return items.map((item) => productBundleItemRepository.createForCompany(companyId, {
    id: crypto.randomUUID(),
    bundleId,
    productId: item.productId,
    variantId: item.variantId || "",
    quantity: item.quantity,
    sortOrder: item.sortOrder ?? 0,
    createdAt: now,
    updatedAt: now,
  }));
}

router.get("/", requireAuth, bundleRead, (req, res) => {
  try {
    return res.json(companyBundles(req.companyId));
  } catch (error) {
    return sendError(res, error);
  }
});

router.post("/", requireAuth, bundleWrite, async (req, res) => {
  try {
    const data = sanitizeBundleInput(req.body, {
      companyId: req.companyId,
      products: filterActiveProducts(productRepository.getByCompany(req.companyId)),
      existingBundles: productBundleRepository.getByCompany(req.companyId),
    });
    const now = new Date().toISOString();
    const bundle = productBundleRepository.createForCompany(req.companyId, {
      id: crypto.randomUUID(),
      ...data,
      createdBy: req.user.id,
      updatedBy: req.user.id,
      createdAt: now,
      updatedAt: now,
    });
    replaceBundleItems(req.companyId, bundle.id, data.items);
    await persistCompanyStore(req.companyId);
    const normalized = normalizeBundle(bundle);
    recordActivityLog({
      req,
      companyId: req.companyId,
      action: "product_bundle.created",
      entityType: "product_bundle",
      entityId: normalized.id,
      entityLabel: normalized.name,
      summary: `Product bundle "${normalized.name}" created`,
      afterData: {
        slug: normalized.slug,
        pricingMode: normalized.pricingMode,
        discountValue: normalized.discountValue,
        fixedPrice: normalized.fixedPrice,
        isActive: normalized.isActive,
        itemCount: data.items.length,
      },
    });
    return res.status(201).json(findBundle(req.companyId, bundle.id));
  } catch (error) {
    return sendError(res, error);
  }
});

router.get("/:bundleId", requireAuth, bundleRead, (req, res) => {
  try {
    return res.json(findBundle(req.companyId, req.params.bundleId));
  } catch (error) {
    return sendError(res, error);
  }
});

router.patch("/:bundleId", requireAuth, bundleWrite, async (req, res) => {
  try {
    const current = findBundle(req.companyId, req.params.bundleId);
    const data = sanitizeBundleInput(
      { ...current, ...req.body },
      {
        companyId: req.companyId,
        products: filterActiveProducts(productRepository.getByCompany(req.companyId)),
        existingBundles: productBundleRepository.getByCompany(req.companyId),
      },
    );
    const now = new Date().toISOString();
    const bundle = productBundleRepository.updateForCompany(req.companyId, current.id, {
      ...current,
      ...data,
      updatedBy: req.user.id,
      updatedAt: now,
    });
    replaceBundleItems(req.companyId, bundle.id, data.items);
    await persistCompanyStore(req.companyId);
    const normalized = normalizeBundle(bundle);
    const deactivated = current.isActive && !normalized.isActive;
    recordActivityLog({
      req,
      companyId: req.companyId,
      action: deactivated ? "product_bundle.deactivated" : "product_bundle.updated",
      entityType: "product_bundle",
      entityId: normalized.id,
      entityLabel: normalized.name,
      summary: deactivated
        ? `Product bundle "${normalized.name}" deactivated`
        : `Product bundle "${normalized.name}" updated`,
      beforeData: {
        slug: current.slug,
        pricingMode: current.pricingMode,
        discountValue: current.discountValue,
        isActive: current.isActive,
      },
      afterData: {
        slug: normalized.slug,
        pricingMode: normalized.pricingMode,
        discountValue: normalized.discountValue,
        isActive: normalized.isActive,
      },
    });
    return res.json(findBundle(req.companyId, bundle.id));
  } catch (error) {
    return sendError(res, error);
  }
});

router.delete("/:bundleId", requireAuth, bundleWrite, async (req, res) => {
  try {
    const current = findBundle(req.companyId, req.params.bundleId);
    const now = new Date().toISOString();
    const bundle = productBundleRepository.updateForCompany(req.companyId, current.id, {
      ...current,
      isActive: false,
      updatedBy: req.user.id,
      updatedAt: now,
    });
    await persistCompanyStore(req.companyId);
    const normalized = normalizeBundle(bundle);
    recordActivityLog({
      req,
      companyId: req.companyId,
      action: "product_bundle.deactivated",
      entityType: "product_bundle",
      entityId: current.id,
      entityLabel: current.name,
      summary: `Product bundle "${current.name}" deactivated`,
      beforeData: { isActive: current.isActive },
      afterData: { isActive: false },
    });
    return res.json(normalized);
  } catch (error) {
    return sendError(res, error);
  }
});

export default router;