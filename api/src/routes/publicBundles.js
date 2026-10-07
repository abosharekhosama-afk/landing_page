import { Router } from "express";
import {
  productBundleItemRepository,
  productBundleRepository,
  productRepository,
} from "../data/store.js";
import { optionalAuth } from "../middleware/auth.js";
import { normalizeBundle } from "../bundles/schema.js";
import { isWithinSchedule } from "../pricing/retailPricing.js";
import { mergeBundleItems, priceBundle } from "../bundles/bundlePricing.js";
import { filterActiveProducts } from "../products/trashLifecycle.js";

const router = Router();

function bundleItemsFor(companyId, bundleId) {
  return productBundleItemRepository
    .getByCompany(companyId)
    .filter((item) => item.bundleId === bundleId);
}

function activeBundles(companyId) {
  return productBundleRepository
    .getByCompany(companyId)
    .filter((bundle) => bundle.isActive !== false && isWithinSchedule(bundle));
}

function pricedBundle(companyId, bundle) {
  const normalized = normalizeBundle(bundle);
  const withItems = mergeBundleItems(normalized, bundleItemsFor(companyId, bundle.id));
  const products = filterActiveProducts(productRepository.getByCompany(companyId));
  return priceBundle(withItems, withItems.items, products);
}

router.get("/", optionalAuth, (req, res) => {
  try {
    const bundles = activeBundles(req.companyId)
      .map((bundle) => pricedBundle(req.companyId, bundle))
      .filter((bundle) => bundle.available)
      .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
    return res.json(bundles);
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.statusCode ? error.message : "Unable to load product bundles.",
    });
  }
});

router.get("/:bundleId", optionalAuth, (req, res) => {
  try {
    const bundle = productBundleRepository.findByCompany(
      req.companyId,
      (entry) => entry.id === req.params.bundleId || entry.slug === req.params.bundleId,
    );
    if (!bundle || bundle.isActive === false || !isWithinSchedule(bundle)) {
      return res.status(404).json({ message: "Product bundle not found." });
    }
    const priced = pricedBundle(req.companyId, bundle);
    if (!priced.available) {
      return res.status(409).json({ message: "This bundle is currently unavailable." });
    }
    return res.json(priced);
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.statusCode ? error.message : "Unable to load product bundle.",
    });
  }
});

export default router;