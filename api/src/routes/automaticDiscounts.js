import crypto from "node:crypto";
import { Router } from "express";
import {
  automaticDiscountRepository,
  brandRepository,
  categoryRepository,
  persistCompanyStore,
  productRepository,
} from "../data/store.js";
import { requireAuth, requireAnyPermission } from "../middleware/auth.js";
import { recordActivityLog } from "../activityLog/logger.js";
import { normalizeAutomaticDiscount, sanitizeAutomaticDiscountInput } from "../discounts/schema.js";
import { filterActiveProducts } from "../products/trashLifecycle.js";

const router = Router();

const discountRead = requireAnyPermission("products.view", "products.manage", "products.update");
const discountWrite = requireAnyPermission("products.manage", "products.update", "products.create");

function sendError(res, error) {
  return res.status(error.statusCode || 500).json({
    message: error.statusCode ? error.message : "Unable to process automatic discount request.",
  });
}

function companyDiscounts(companyId) {
  return automaticDiscountRepository
    .getByCompany(companyId)
    .map(normalizeAutomaticDiscount)
    .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
}

function findDiscount(companyId, discountId) {
  const discount = automaticDiscountRepository.findByCompany(companyId, discountId);
  if (!discount) {
    const error = new Error("Automatic discount not found.");
    error.statusCode = 404;
    throw error;
  }
  return normalizeAutomaticDiscount(discount);
}

function catalogContext(companyId) {
  return {
    companyId,
    products: filterActiveProducts(productRepository.getByCompany(companyId)),
    categories: categoryRepository.getByCompany(companyId),
    brands: brandRepository.getByCompany(companyId),
  };
}

router.get("/", requireAuth, discountRead, (req, res) => {
  try {
    return res.json(companyDiscounts(req.companyId));
  } catch (error) {
    return sendError(res, error);
  }
});

router.post("/", requireAuth, discountWrite, async (req, res) => {
  try {
    const data = sanitizeAutomaticDiscountInput(req.body, catalogContext(req.companyId));
    const now = new Date().toISOString();
    const discount = automaticDiscountRepository.createForCompany(req.companyId, {
      id: crypto.randomUUID(),
      ...data,
      createdBy: req.user.id,
      updatedBy: req.user.id,
      createdAt: now,
      updatedAt: now,
    });
    await persistCompanyStore(req.companyId);
    const normalized = normalizeAutomaticDiscount(discount);
    recordActivityLog({
      req,
      companyId: req.companyId,
      action: "automatic_discount.created",
      entityType: "automatic_discount",
      entityId: normalized.id,
      entityLabel: normalized.name,
      summary: `Automatic discount "${normalized.name}" created`,
      afterData: {
        discountType: normalized.discountType,
        discountValue: normalized.discountValue,
        isActive: normalized.isActive,
        minQuantity: normalized.minQuantity,
      },
    });
    return res.status(201).json(normalized);
  } catch (error) {
    return sendError(res, error);
  }
});

router.get("/:discountId", requireAuth, discountRead, (req, res) => {
  try {
    return res.json(findDiscount(req.companyId, req.params.discountId));
  } catch (error) {
    return sendError(res, error);
  }
});

router.patch("/:discountId", requireAuth, discountWrite, async (req, res) => {
  try {
    const current = findDiscount(req.companyId, req.params.discountId);
    const data = sanitizeAutomaticDiscountInput(
      { ...current, ...req.body },
      catalogContext(req.companyId),
    );
    const now = new Date().toISOString();
    const discount = automaticDiscountRepository.updateForCompany(req.companyId, current.id, {
      ...current,
      ...data,
      updatedBy: req.user.id,
      updatedAt: now,
    });
    await persistCompanyStore(req.companyId);
    const normalized = normalizeAutomaticDiscount(discount);
    const deactivated = current.isActive && !normalized.isActive;
    recordActivityLog({
      req,
      companyId: req.companyId,
      action: deactivated ? "automatic_discount.deactivated" : "automatic_discount.updated",
      entityType: "automatic_discount",
      entityId: normalized.id,
      entityLabel: normalized.name,
      summary: deactivated
        ? `Automatic discount "${normalized.name}" deactivated`
        : `Automatic discount "${normalized.name}" updated`,
      beforeData: {
        discountType: current.discountType,
        discountValue: current.discountValue,
        isActive: current.isActive,
      },
      afterData: {
        discountType: normalized.discountType,
        discountValue: normalized.discountValue,
        isActive: normalized.isActive,
      },
    });
    return res.json(normalized);
  } catch (error) {
    return sendError(res, error);
  }
});

router.delete("/:discountId", requireAuth, discountWrite, async (req, res) => {
  try {
    const current = findDiscount(req.companyId, req.params.discountId);
    const now = new Date().toISOString();
    const discount = automaticDiscountRepository.updateForCompany(req.companyId, current.id, {
      ...current,
      isActive: false,
      updatedBy: req.user.id,
      updatedAt: now,
    });
    await persistCompanyStore(req.companyId);
    const normalized = normalizeAutomaticDiscount(discount);
    recordActivityLog({
      req,
      companyId: req.companyId,
      action: "automatic_discount.deactivated",
      entityType: "automatic_discount",
      entityId: current.id,
      entityLabel: current.name,
      summary: `Automatic discount "${current.name}" deactivated`,
      beforeData: { isActive: current.isActive },
      afterData: { isActive: false },
    });
    return res.json(normalized);
  } catch (error) {
    return sendError(res, error);
  }
});

export default router;
