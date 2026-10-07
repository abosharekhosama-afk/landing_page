import crypto from "node:crypto";
import { Router } from "express";
import {
  couponRepository,
  persistCompanyStore,
} from "../data/store.js";
import { optionalAuth, requireAuth, requireAnyPermission } from "../middleware/auth.js";
import { recordActivityLog } from "../activityLog/logger.js";
import {
  assertCouponApplicable,
  normalizeCoupon,
  normalizeCouponCode,
  sanitizeCouponInput,
} from "../coupons/schema.js";
import { computeCouponDiscount, safeMoney } from "../pricing/retailPricing.js";

const adminRouter = Router();
const publicRouter = Router();

const couponManage = requireAnyPermission("coupons.manage");

function sendError(res, error) {
  return res.status(error.statusCode || 500).json({
    message: error.statusCode ? error.message : "Unable to process coupon request.",
  });
}

function companyCoupons(companyId) {
  return couponRepository
    .getByCompany(companyId)
    .map(normalizeCoupon)
    .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
}

function findCoupon(companyId, couponId) {
  const coupon = couponRepository.findByCompany(companyId, couponId);
  if (!coupon) {
    const error = new Error("Coupon not found.");
    error.statusCode = 404;
    throw error;
  }
  return normalizeCoupon(coupon);
}

function findCouponByCode(companyId, code) {
  const normalized = normalizeCouponCode(code);
  if (!normalized) return null;
  const coupon = couponRepository.findByCompany(
    companyId,
    (entry) => normalizeCouponCode(entry.code) === normalized,
  );
  return coupon ? normalizeCoupon(coupon) : null;
}

adminRouter.get("/", requireAuth, couponManage, (req, res) => {
  try {
    return res.json(companyCoupons(req.companyId));
  } catch (error) {
    return sendError(res, error);
  }
});

adminRouter.post("/", requireAuth, couponManage, async (req, res) => {
  try {
    const data = sanitizeCouponInput(req.body);
    const duplicate = findCouponByCode(req.companyId, data.code);
    if (duplicate) {
      const error = new Error("A coupon with this code already exists.");
      error.statusCode = 409;
      throw error;
    }
    const now = new Date().toISOString();
    const coupon = couponRepository.createForCompany(req.companyId, {
      id: crypto.randomUUID(),
      ...data,
      usedCount: 0,
      createdBy: req.user.id,
      updatedBy: req.user.id,
      createdAt: now,
      updatedAt: now,
    });
    await persistCompanyStore(req.companyId);
    const normalized = normalizeCoupon(coupon);
    recordActivityLog({
      req,
      companyId: req.companyId,
      action: "coupon.created",
      entityType: "coupon",
      entityId: normalized.id,
      entityLabel: normalized.code,
      summary: `Coupon ${normalized.code} created`,
      afterData: {
        code: normalized.code,
        discountType: normalized.discountType,
        discountValue: normalized.discountValue,
        isActive: normalized.isActive,
      },
    });
    return res.status(201).json(normalized);
  } catch (error) {
    return sendError(res, error);
  }
});

adminRouter.get("/:couponId", requireAuth, couponManage, (req, res) => {
  try {
    return res.json(findCoupon(req.companyId, req.params.couponId));
  } catch (error) {
    return sendError(res, error);
  }
});

adminRouter.patch("/:couponId", requireAuth, couponManage, async (req, res) => {
  try {
    const current = findCoupon(req.companyId, req.params.couponId);
    const data = sanitizeCouponInput(req.body, { partial: true });
    if (data.code && data.code !== current.code) {
      const duplicate = findCouponByCode(req.companyId, data.code);
      if (duplicate && duplicate.id !== current.id) {
        const error = new Error("A coupon with this code already exists.");
        error.statusCode = 409;
        throw error;
      }
    }
    const now = new Date().toISOString();
    const coupon = couponRepository.updateForCompany(req.companyId, current.id, {
      ...current,
      ...data,
      usedCount: current.usedCount,
      updatedBy: req.user.id,
      updatedAt: now,
    });
    await persistCompanyStore(req.companyId);
    const normalized = normalizeCoupon(coupon);
    const deactivated = current.isActive && !normalized.isActive;
    recordActivityLog({
      req,
      companyId: req.companyId,
      action: deactivated ? "coupon.deactivated" : "coupon.updated",
      entityType: "coupon",
      entityId: normalized.id,
      entityLabel: normalized.code,
      summary: deactivated
        ? `Coupon ${normalized.code} deactivated`
        : `Coupon ${normalized.code} updated`,
      beforeData: {
        code: current.code,
        discountType: current.discountType,
        discountValue: current.discountValue,
        isActive: current.isActive,
      },
      afterData: {
        code: normalized.code,
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

adminRouter.delete("/:couponId", requireAuth, couponManage, async (req, res) => {
  try {
    const current = findCoupon(req.companyId, req.params.couponId);
    const now = new Date().toISOString();
    const coupon = couponRepository.updateForCompany(req.companyId, current.id, {
      ...current,
      isActive: false,
      updatedBy: req.user.id,
      updatedAt: now,
    });
    await persistCompanyStore(req.companyId);
    const normalized = normalizeCoupon(coupon);
    recordActivityLog({
      req,
      companyId: req.companyId,
      action: "coupon.deactivated",
      entityType: "coupon",
      entityId: current.id,
      entityLabel: current.code,
      summary: `Coupon ${current.code} deactivated`,
      beforeData: { isActive: current.isActive },
      afterData: { isActive: false },
    });
    return res.json(normalized);
  } catch (error) {
    return sendError(res, error);
  }
});

/**
 * Public validation for checkout UX. Backend revalidates again at order create.
 * Never trusts client-submitted discount amounts.
 */
publicRouter.post("/validate", optionalAuth, (req, res) => {
  try {
    const code = normalizeCouponCode(req.body?.code || req.body?.couponCode);
    const subtotal = safeMoney(req.body?.subtotal);
    const coupon = findCouponByCode(req.companyId, code);
    if (!coupon) {
      return res.status(404).json({ message: "Coupon not found.", valid: false });
    }
    const { discount } = assertCouponApplicable(coupon, { subtotal });
    return res.json({
      valid: true,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discountAmount: discount,
      minOrderAmount: coupon.minOrderAmount,
    });
  } catch (error) {
    return res.status(error.statusCode || 400).json({
      valid: false,
      message: error.statusCode ? error.message : "Unable to validate coupon.",
    });
  }
});

export { adminRouter, publicRouter, findCouponByCode };

/**
 * Consume one coupon use (in-memory path).
 * Order creation must use createOrderWithOptionalCouponConsumption so coupon
 * consumption and order insert share one atomic boundary (Postgres when configured).
 */
export function consumeCouponUsage(companyId, couponId) {
  const current = couponRepository.findByCompany(companyId, couponId);
  if (!current) {
    const error = new Error("Coupon not found.");
    error.statusCode = 404;
    throw error;
  }
  const normalized = normalizeCoupon(current);
  if (normalized.isActive === false) {
    const error = new Error("This coupon is inactive.");
    error.statusCode = 400;
    throw error;
  }
  if (normalized.usageLimit != null && normalized.usedCount >= normalized.usageLimit) {
    const error = new Error("This coupon has reached its usage limit.");
    error.statusCode = 400;
    throw error;
  }
  return normalizeCoupon(
    couponRepository.updateForCompany(companyId, couponId, {
      ...normalized,
      usedCount: normalized.usedCount + 1,
      updatedAt: new Date().toISOString(),
    }),
  );
}

export function previewCouponDiscount(coupon, subtotal) {
  return computeCouponDiscount(subtotal, coupon);
}
