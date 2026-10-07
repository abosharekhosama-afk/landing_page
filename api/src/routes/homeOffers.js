import { Router } from "express";
import {
  categoryCardRepository,
  offerRepository,
  persistCompanyStore,
  productRepository,
} from "../data/store.js";
import { recordActivityLog } from "../activityLog/logger.js";
import { isScheduledActive, validateOffer } from "../content/homeOfferRules.js";
import { effectiveTenantRole, optionalAuth, requireAuth } from "../middleware/auth.js";
import {
  filterPublicOfferProductIds,
  normalizeOfferProductIds,
  validateOfferProductIds,
} from "../products/homepageOfferProducts.js";

const router = Router();

function requireBannerManager(req, res, next) {
  const role = effectiveTenantRole(req);
  if (["admin", "company_admin", "super_admin"].includes(role)) return next();
  if (["employee", "staff"].includes(role) && req.user?.permissions?.includes("banners.manage")) {
    return next();
  }
  return res.status(403).json({ message: "Banner management permission required." });
}

function sortOffers(items) {
  return [...items].sort((a, b) => Number(a.displayOrder || 0) - Number(b.displayOrder || 0));
}

function sortCategoryCards(items) {
  return [...items].sort((a, b) => Number(a.displayOrder || 0) - Number(b.displayOrder || 0));
}

function tenantProductsById(companyId) {
  return new Map(
    productRepository.getByCompany(companyId).map((product) => [String(product.id), product]),
  );
}

function presentPublicOffer(offer, productsById) {
  return {
    ...offer,
    productIds: filterPublicOfferProductIds(offer.productIds, productsById),
  };
}

function presentAdminOffer(offer) {
  return {
    ...offer,
    productIds: normalizeOfferProductIds(offer.productIds),
  };
}

function buildOfferDocument(body, { existing = null, companyId } = {}) {
  const productsById = tenantProductsById(companyId);
  const hasProductIds = Object.prototype.hasOwnProperty.call(body || {}, "productIds");
  const productIds = hasProductIds
    ? validateOfferProductIds(body.productIds, productsById)
    : normalizeOfferProductIds(existing?.productIds);

  return {
    ...(existing || {}),
    ...body,
    id: existing?.id || body.id || `offer-${Date.now()}`,
    isActive: body.isActive !== false,
    productIds,
  };
}

router.get("/", optionalAuth, (req, res) => {
  const productsById = tenantProductsById(req.companyId);
  res.json(
    sortOffers(offerRepository.getByCompany(req.companyId).filter((offer) => isScheduledActive(offer)))
      .map((offer) => presentPublicOffer(offer, productsById)),
  );
});

router.get("/all", requireAuth, (req, res) => {
  res.json(sortOffers(offerRepository.getByCompany(req.companyId)).map(presentAdminOffer));
});

router.get("/category-cards", optionalAuth, (req, res) => {
  res.json(sortCategoryCards(categoryCardRepository.getByCompany(req.companyId).filter((card) => card.isActive !== false)));
});

router.get("/category-cards/all", requireAuth, (req, res) => {
  res.json(sortCategoryCards(categoryCardRepository.getByCompany(req.companyId)));
});

router.put("/category-cards/:key", requireAuth, requireBannerManager, async (req, res) => {
  const existing = categoryCardRepository.findByCompany(req.companyId, req.params.key);
  if (!existing) return res.status(404).json({ message: "Category card not found." });

  const updated = categoryCardRepository.updateForCompany(req.companyId, req.params.key, {
    ...existing,
    ...req.body,
    key: req.params.key,
    updatedAt: new Date().toISOString(),
  });
  await persistCompanyStore(req.companyId);
  return res.json(updated);
});

router.post("/", requireAuth, requireBannerManager, async (req, res) => {
  try {
    const offer = buildOfferDocument(req.body || {}, { companyId: req.companyId });
    const violation = validateOffer(offer);
    if (violation) return res.status(400).json({ message: violation });
    offerRepository.createForCompany(req.companyId, offer, { prepend: true });
    await persistCompanyStore(req.companyId);
    recordActivityLog({
      req,
      companyId: req.companyId,
      action: "homepage_offer.created",
      entityType: "homepage_offer",
      entityId: offer.id,
      entityLabel: offer.title?.en || offer.id,
      summary: `Homepage offer "${offer.title?.en || offer.id}" created`,
      afterData: { productIds: offer.productIds, isActive: offer.isActive !== false },
    });
    res.status(201).json(presentAdminOffer(offer));
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
    throw error;
  }
});

router.put("/:id", requireAuth, requireBannerManager, async (req, res) => {
  const existing = offerRepository.findByCompany(req.companyId, req.params.id);
  if (!existing) return res.status(404).json({ message: "Offer not found." });

  try {
    const merged = buildOfferDocument(req.body || {}, { existing, companyId: req.companyId });
    const violation = validateOffer(merged);
    if (violation) return res.status(400).json({ message: violation });
    const updated = offerRepository.updateForCompany(
      req.companyId,
      req.params.id,
      merged,
    );
    await persistCompanyStore(req.companyId);
    recordActivityLog({
      req,
      companyId: req.companyId,
      action: "homepage_offer.updated",
      entityType: "homepage_offer",
      entityId: updated.id,
      entityLabel: updated.title?.en || updated.id,
      summary: `Homepage offer "${updated.title?.en || updated.id}" updated`,
      beforeData: { productIds: normalizeOfferProductIds(existing.productIds), isActive: existing.isActive !== false },
      afterData: { productIds: updated.productIds, isActive: updated.isActive !== false },
    });
    return res.json(presentAdminOffer(updated));
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
    throw error;
  }
});

router.delete("/:id", requireAuth, requireBannerManager, async (req, res) => {
  const existing = offerRepository.findByCompany(req.companyId, req.params.id);
  const removed = offerRepository.deleteForCompany(req.companyId, req.params.id);
  if (!removed) return res.status(404).json({ message: "Offer not found." });

  await persistCompanyStore(req.companyId, { pruneMissing: true });
  recordActivityLog({
    req,
    companyId: req.companyId,
    action: "homepage_offer.deleted",
    entityType: "homepage_offer",
    entityId: existing?.id || req.params.id,
    entityLabel: existing?.title?.en || req.params.id,
    summary: `Homepage offer "${existing?.title?.en || req.params.id}" deleted`,
    beforeData: { productIds: normalizeOfferProductIds(existing?.productIds) },
  });
  return res.status(204).end();
});

export default router;
