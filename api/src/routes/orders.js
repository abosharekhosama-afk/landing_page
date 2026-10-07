import { Router } from "express";
import {
  automaticDiscountRepository,
  createOrderWithOptionalCouponConsumption,
  deliveryZoneRepository,
  orderRepository,
  persistCompanyStore,
  productBundleItemRepository,
  productBundleRepository,
  productRepository,
  userRepository,
  visitorSessionRepository,
} from "../data/store.js";
import { effectiveTenantRole, optionalAuth, publicUser, requireAuth } from "../middleware/auth.js";
import { findEnabledZone } from "../delivery/schema.js";
import { isVariantVisible } from "../products/variantVisibility.js";
import { filterActiveProducts } from "../products/trashLifecycle.js";
import { purchaseQuantityViolation } from "../products/productSettings.js";
import { recordActivityLog } from "../activityLog/logger.js";
import { priceRetailOrder, safeMoney } from "../pricing/retailPricing.js";
import { normalizeAutomaticDiscount } from "../discounts/schema.js";
import { assertCouponApplicable, normalizeCouponCode } from "../coupons/schema.js";
import { findCouponByCode } from "./coupons.js";
import { normalizeBundle } from "../bundles/schema.js";
import { mergeBundleItems, priceBundle } from "../bundles/bundlePricing.js";
import { recordPurchaseEvent } from "../analytics/purchaseFunnel.js";
import { normalizeAttribution } from "../analytics/visitorAnalytics.js";

const router = Router();

function isStaffRole(role) {
  return role === "employee" || role === "staff";
}

function requireOrderPermission(permission) {
  return (req, res, next) => {
    if (
      ["admin", "company_admin", "super_admin"].includes(effectiveTenantRole(req))
      || req.user?.permissions?.includes(permission)
    ) {
      return next();
    }
    return res.status(403).json({ message: "Order permission required." });
  };
}

function cleanText(value, maxLength) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function normalizePhone(phone) {
  if (!phone) return "";
  const digits = String(phone).replace(/[^\d]/g, "");
  if (digits.startsWith("970")) return digits.slice(3);
  if (digits.startsWith("972")) return digits.slice(3);
  return digits.replace(/^0+/, "") || digits;
}

function safeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const completedStatuses = new Set(["completed", "confirmed", "paid"]);
const cancelledStatuses = new Set(["cancelled", "canceled", "refunded", "returned", "void", "voided"]);

function normalizedStatus(value) {
  return String(value || "").trim().toLowerCase();
}

function productSubtotal(items) {
  return items.reduce(
    (sum, item) => sum + Math.max(0, safeNumber(item.lineTotal, item.price * item.quantity)),
    0,
  );
}

function redemptionForOrder(user, requestedPoints, subtotal) {
  const requested = Math.max(0, Math.floor(safeNumber(requestedPoints)));
  if (requested % 100 !== 0) {
    const error = new Error("EB Points must be redeemed in increments of 100.");
    error.statusCode = 400;
    throw error;
  }
  const available = Math.max(0, Math.floor(safeNumber(user?.ebPoints)));
  const maxByBalance = Math.floor(available / 100) * 100;
  const maxBySubtotal = Math.floor(Math.max(0, subtotal) / 5) * 100;
  const maximum = Math.min(maxByBalance, maxBySubtotal);
  if (requested > maximum) {
    const error = new Error("The requested EB Points exceed the available balance or product subtotal.");
    error.statusCode = 400;
    throw error;
  }
  return {
    points: requested,
    discount: requested / 20,
  };
}

function orderCustomer(companyId, order) {
  if (!order.customerUserId) return null;
  return userRepository.findByCompany(companyId, order.customerUserId);
}

function pointsUserForOrder(companyId, order) {
  const rawPhone = order?.customer?.phone;
  if (!rawPhone) return orderCustomer(companyId, order) || null;
  const phone = normalizePhone(rawPhone);
  return userRepository.findByCompany(companyId, (u) => normalizePhone(u.phone) === phone)
    || orderCustomer(companyId, order)
    || null;
}

function applyLoyaltyForStatus(companyId, order, nextStatus) {
  const customer = pointsUserForOrder(companyId, order) || orderCustomer(companyId, order);
  if (!customer) return;
  const status = normalizedStatus(nextStatus);
  const now = new Date().toISOString();

  if (completedStatuses.has(status) && !order.pointsAwardedAt) {
    const earned = Math.max(0, Math.floor(safeNumber(order.pointsEarned)));
    customer.ebPoints = Math.max(0, safeNumber(customer.ebPoints)) + earned;
    customer.totalPointsEarned = Math.max(0, safeNumber(customer.totalPointsEarned)) + earned;
    order.pointsAwardedAt = now;
    order.pointsReversedAt = null;
  }

  if (cancelledStatuses.has(status)) {
    if (order.pointsAwardedAt && !order.pointsReversedAt) {
      const earned = Math.max(0, Math.floor(safeNumber(order.pointsEarned)));
      customer.ebPoints = Math.max(0, safeNumber(customer.ebPoints) - earned);
      customer.totalPointsEarned = Math.max(0, safeNumber(customer.totalPointsEarned) - earned);
      order.pointsReversedAt = now;
    }
    if (order.pointsRedeemed > 0 && order.pointsRedemptionAppliedAt && !order.pointsRedemptionRestoredAt) {
      const redeemed = Math.max(0, Math.floor(safeNumber(order.pointsRedeemed)));
      customer.ebPoints = Math.max(0, safeNumber(customer.ebPoints)) + redeemed;
      customer.totalPointsRedeemed = Math.max(0, safeNumber(customer.totalPointsRedeemed) - redeemed);
      order.pointsRedemptionRestoredAt = now;
    }
  }
}

function guestOrderCustomer(input) {
  return {
    name: cleanText(input?.name, 120),
    phone: normalizePhone(cleanText(input?.phone, 40)),
    city: cleanText(input?.city, 120),
    address: cleanText(input?.address, 300),
    notes: cleanText(input?.notes, 1000),
  };
}

function orderItems(input) {
  if (!Array.isArray(input)) return [];
  return input.slice(0, 100).map((item) => {
    const rawQuantity = Number(item?.quantity);
    // Preserve raw numeric intent for authoritative min/max checks (Decision 22).
    // Non-finite values become 0 and fail purchaseQuantityViolation.
    const quantity = Number.isFinite(rawQuantity) ? Math.trunc(rawQuantity) : 0;
    const price = Math.max(0, safeNumber(item?.price));
    return {
      productId: cleanText(item?.productId, 160),
      productName: cleanText(item?.productName, 240),
      slug: cleanText(item?.slug, 240),
      selectedSize: cleanText(item?.selectedSize || item?.size, 120),
      size: cleanText(item?.size || item?.selectedSize, 120),
      variantId: cleanText(item?.variantId, 160),
      selectedColor: cleanText(item?.selectedColor || item?.colorName, 120),
      colorName: cleanText(item?.colorName || item?.selectedColor, 120),
      colorValue: cleanText(item?.colorValue, 80),
      bundleId: cleanText(item?.bundleId, 160),
      bundleSlug: cleanText(item?.bundleSlug, 240),
      bundleName: cleanText(item?.bundleName, 240),
      quantity,
      price,
      lineTotal: Math.max(0, safeNumber(item?.lineTotal, price * Math.max(0, quantity))),
    };
  }).filter((item) => item.productId || item.slug || item.bundleId);
}

function hasUnavailableVariant(items, companyId) {
  const products = filterActiveProducts(productRepository.getByCompany(companyId));
  return items.some((item) => {
    if (item.bundleId) return false;
    const product = products.find(
      (candidate) => candidate.id === item.productId || candidate.slug === item.slug,
    );
    if (!product) return true;

    const variants = Array.isArray(product.variants) ? product.variants : [];
    if (!variants.length) return false;

    const matchingVariant = item.variantId
      ? variants.find((variant) => variant.id === item.variantId)
      : variants.find((variant) => {
          const sameSize = String(variant.size || "") === String(item.selectedSize || item.size || "");
          const selectedColor = item.colorName || item.selectedColor || "";
          const variantColor = variant.color_name || variant.colorName || "";
          return sameSize && (!selectedColor || selectedColor === variantColor);
        });

    return !matchingVariant || !isVariantVisible(matchingVariant);
  });
}

function hasUnavailableBundle(items, companyId) {
  const products = filterActiveProducts(productRepository.getByCompany(companyId));
  return items.some((item) => {
    if (!item.bundleId) return false;
    const bundle = productBundleRepository.findByCompany(
      companyId,
      (entry) => entry.id === item.bundleId || entry.slug === item.bundleSlug,
    );
    if (!bundle || bundle.isActive === false) return true;
    const normalized = normalizeBundle(bundle);
    const bundleItems = productBundleItemRepository
      .getByCompany(companyId)
      .filter((entry) => entry.bundleId === bundle.id);
    const withItems = mergeBundleItems(normalized, bundleItems);
    const priced = priceBundle(withItems, withItems.items, products);
    return !priced.available;
  });
}

function purchaseQuantityError(items, companyId) {
  const products = filterActiveProducts(productRepository.getByCompany(companyId));
  for (const item of items) {
    if (item.bundleId) continue;
    const product = products.find(
      (candidate) => candidate.id === item.productId || candidate.slug === item.slug,
    );
    if (!product) continue;
    const violation = purchaseQuantityViolation(product, item.quantity);
    if (violation) {
      const label = product.name?.en || product.slug || item.productName || item.productId;
      return `${label}: ${violation}`;
    }
  }
  return null;
}

function matchingVariantForItem(item, products) {
  const product = products.find(
    (candidate) => candidate.id === item.productId || candidate.slug === item.slug,
  );
  if (!product) return null;
  const variants = Array.isArray(product.variants) ? product.variants : [];
  if (!variants.length) return null;
  const match = item.variantId
    ? variants.find((variant) => variant.id === item.variantId)
    : variants.find((variant) => {
        const sameSize = String(variant.size || "") === String(item.selectedSize || item.size || "");
        const selectedColor = item.colorName || item.selectedColor || "";
        const variantColor = variant.color_name || variant.colorName || "";
        return sameSize && (!selectedColor || selectedColor === variantColor);
      });
  return match || null;
}

function priceBundleLine(item, companyId) {
  const products = filterActiveProducts(productRepository.getByCompany(companyId));
  const bundle = productBundleRepository.findByCompany(
    companyId,
    (entry) => entry.id === item.bundleId || entry.slug === item.bundleSlug,
  );
  if (!bundle || bundle.isActive === false) {
    const error = new Error("Product bundle not found or inactive.");
    error.statusCode = 409;
    throw error;
  }
  const normalized = normalizeBundle(bundle);
  const bundleItems = productBundleItemRepository
    .getByCompany(companyId)
    .filter((entry) => entry.bundleId === bundle.id);
  const withItems = mergeBundleItems(normalized, bundleItems);
  const priced = priceBundle(withItems, withItems.items, products);
  if (!priced.available) {
    const error = new Error("One or more products in this bundle are unavailable.");
    error.statusCode = 409;
    throw error;
  }
  const quantity = Math.max(0, Math.trunc(Number(item.quantity) || 0));
  return {
    ...item,
    bundleId: bundle.id,
    bundleSlug: bundle.slug,
    bundleName: bundle.name,
    pricingMode: priced.pricingMode,
    discountValue: priced.discountValue,
    fixedPrice: priced.fixedPrice,
    bundleSubtotal: priced.subtotal,
    bundleSavings: priced.savings,
    bundleComponents: priced.items.map((component) => ({
      productId: component.productId,
      productName: component.productName,
      slug: component.slug,
      variantId: component.variantId,
      size: component.size,
      colorName: component.colorName,
      quantity: component.quantity,
      unitPrice: component.unitPrice,
      lineTotal: component.lineTotal,
    })),
    price: priced.finalPrice,
    lineTotal: Math.max(0, priced.finalPrice * quantity),
    automaticDiscountAmount: 0,
    automaticDiscountId: null,
  };
}

function enforceItemPrices(items, user, companyId) {
  const isTrader = user?.accountType === "trader" || user?.accountType === "wholesale";
  const products = filterActiveProducts(productRepository.getByCompany(companyId));

  if (isTrader) {
    return items.map((item) => {
      if (item.bundleId) return priceBundleLine(item, companyId);
      const product = products.find(
        (candidate) => candidate.id === item.productId || candidate.slug === item.slug,
      );
      const variant = matchingVariantForItem(item, products);
      let correctPrice = Number(item.price || 0);
      if (variant?.wholesalePrice != null && Number(variant.wholesalePrice) > 0) {
        correctPrice = Number(variant.wholesalePrice);
      } else if (product?.wholesalePrice != null && Number(product.wholesalePrice) > 0) {
        correctPrice = Number(product.wholesalePrice);
      }
      return {
        ...item,
        price: correctPrice,
        lineTotal: correctPrice * item.quantity,
        automaticDiscountAmount: 0,
        automaticDiscountId: null,
      };
    });
  }

  const discounts = automaticDiscountRepository
    .getByCompany(companyId)
    .map(normalizeAutomaticDiscount);
  const priced = priceRetailOrder({
    items: items.filter((item) => !item.bundleId),
    products,
    automaticDiscounts: discounts,
    coupon: null,
    pointsDiscount: 0,
  });
  const bundleLines = items
    .filter((item) => item.bundleId)
    .map((item) => priceBundleLine(item, companyId));
  return [...priced.items, ...bundleLines];
}

function resolveOrderCoupon(companyId, code, subtotalAfterAuto) {
  const normalizedCode = normalizeCouponCode(code);
  if (!normalizedCode) return { coupon: null, discount: 0 };
  const coupon = findCouponByCode(companyId, normalizedCode);
  if (!coupon) {
    const error = new Error("Coupon not found.");
    error.statusCode = 400;
    throw error;
  }
  const { discount } = assertCouponApplicable(coupon, { subtotal: subtotalAfterAuto });
  return { coupon, discount };
}

async function safeRecordActivityLog(params) {
  try {
    await recordActivityLog(params);
  } catch (error) {
    console.error("Activity log failed (non-fatal):", error.message);
  }
}

async function safePersist(companyId) {
  try {
    await persistCompanyStore(companyId);
  } catch (error) {
    console.error("Store persistence failed (non-fatal):", error.message);
  }
}

router.get("/", requireAuth, (req, res) => {
  const orders = orderRepository.getByCompany(req.companyId);
  if (
    ["admin", "company_admin", "super_admin"].includes(effectiveTenantRole(req))
    || req.user.permissions?.includes("orders.view")
  ) {
    const isRestrictedStaff = isStaffRole(req.membershipRole) && !req.user.permissions?.includes("orders.view");
    if (isRestrictedStaff) {
      return res.json(
        orders.filter(
          (order) =>
            order.handledByEmployeeId === req.user.id ||
            order.assignedToEmployeeId === req.user.id ||
            order.createdByEmployeeId === req.user.id,
        ),
      );
    }
    return res.json(orders);
  }
  return res.status(403).json({ message: "Orders access denied." });
});

router.get("/my-orders", requireAuth, (req, res) => {
  const userPhone = normalizePhone(req.user.phone);
  res.json(
    orderRepository
      .getByCompany(req.companyId)
      .filter((order) =>
        order.customerUserId === req.user.id
        || (userPhone && order.customer?.phone && normalizePhone(order.customer.phone) === userPhone)
      ),
  );
});

router.post("/", optionalAuth, async (req, res) => {
  try {
    const user = req.user;
    const customer = guestOrderCustomer(req.body.customer);
    let items = orderItems(req.body.items);

    // Look up or create a points user by phone number (points follow the phone, not the login)
    let pointsUser = customer.phone
      ? userRepository.findByCompany(req.companyId, (u) => normalizePhone(u.phone) === customer.phone)
      : null;
    if (!pointsUser && customer.phone) {
      pointsUser = {
        id: `points-${Date.now()}`,
        name: customer.name || `Customer ${customer.phone}`,
        email: `points-${customer.phone}@ep-chemical.com`,
        phone: customer.phone,
        role: "customer",
        accountType: "retail",
        permissions: [],
        ebPoints: 0,
        totalPointsEarned: 0,
        totalPointsRedeemed: 0,
        isActive: true,
      };
      userRepository.createForCompany(req.companyId, pointsUser);
    }

    if (!customer.name || !customer.phone || !customer.city || !customer.address) {
      return res.status(400).json({ message: "Name, phone, city, and address are required." });
    }
    if (!items.length) {
      return res.status(400).json({ message: "At least one order item is required." });
    }
    if (hasUnavailableVariant(items, req.companyId)) {
      return res.status(409).json({ message: "One or more selected product variants are unavailable." });
    }
    if (hasUnavailableBundle(items, req.companyId)) {
      return res.status(409).json({ message: "One or more selected product bundles are unavailable." });
    }

    const quantityError = purchaseQuantityError(items, req.companyId);
    if (quantityError) {
      return res.status(400).json({ message: quantityError });
    }

    // Enforce server-side pricing (wholesale for traders, retail chain for others)
    const isTrader = user?.accountType === "trader" || user?.accountType === "wholesale";
    items = enforceItemPrices(items, user, req.companyId);

    // Delivery zone lookup
    // Match the public storefront contract: only enabled, non-deleted zones
    // activate zone-aware checkout. Disabled zones must not block the legacy
    // checkout fallback when a tenant has no available delivery areas.
    const activeDeliveryZones = deliveryZoneRepository
      .getByCompany(req.companyId)
      .filter((z) => !z.deleted_at && z.enabled !== false);
    let deliveryPrice = 0;
    let deliveryZone = null;
    if (activeDeliveryZones.length > 0) {
      const deliveryZoneId = cleanText(req.body.delivery_zone_id || req.body.deliveryZoneId, 160);
      const cityKey = cleanText(req.body.delivery_city_key || req.body.deliveryCityKey, 120);
      deliveryZone = findEnabledZone(activeDeliveryZones, deliveryZoneId, cityKey);
      if (!deliveryZone) {
        return res.status(400).json({ message: "Selected delivery city is not available." });
      }
      deliveryPrice = deliveryZone.delivery_price;
    }

    const subtotalAfterAuto = productSubtotal(items);
    const automaticDiscountTotal = items.reduce(
      (sum, item) => sum + safeMoney(item.automaticDiscountAmount),
      0,
    );
    const merchandiseSubtotal = Math.max(0, subtotalAfterAuto + automaticDiscountTotal);

    let coupon = null;
    let couponDiscount = 0;
    if (!isTrader) {
      try {
        const resolved = resolveOrderCoupon(
          req.companyId,
          req.body.couponCode || req.body.coupon_code,
          subtotalAfterAuto,
        );
        coupon = resolved.coupon;
        couponDiscount = resolved.discount;
      } catch (error) {
        if (error.statusCode) {
          return res.status(error.statusCode).json({ message: error.message });
        }
        throw error;
      }
    }

    const afterCoupon = Math.max(0, subtotalAfterAuto - couponDiscount);
    const freeDeliveryThreshold = 500;
    const isFreeDelivery = afterCoupon >= freeDeliveryThreshold;
    if (isFreeDelivery) {
      deliveryPrice = 0;
    }
    const isCustomer = pointsUser?.role === "customer";
    const isStaff = isStaffRole(user?.role);
    const isPortalOperator = user?.role === "admin" || user?.role === "manager";
    let redemption = { points: 0, discount: 0 };
    try {
      if (isCustomer && !isTrader) {
        redemption = redemptionForOrder(pointsUser, req.body.pointsRedeemed, afterCoupon);
      }
    } catch (error) {
      console.warn("EB Points redemption skipped during order creation:", error.message);
      redemption = { points: 0, discount: 0 };
    }
    const pointsRedeemed = redemption.points;
    const discountFromPoints = redemption.discount;
    const paidProductSubtotal = Math.max(0, afterCoupon - discountFromPoints);
    const pointsEarned = isCustomer ? Math.floor(paidProductSubtotal) : 0;
    const orderTotal = paidProductSubtotal + deliveryPrice;
    const discountTotal = Math.max(0, automaticDiscountTotal + couponDiscount + discountFromPoints);

    const now = new Date().toISOString();

    // Campaign attribution for this backend-confirmed order. The session the
    // storefront recorded is authoritative; the checkout payload is a fallback
    // when that session is no longer in the store. Staff/operator orders are
    // never campaign-attributed.
    const analyticsSessionKey = cleanText(req.body?.analyticsSessionKey, 120);
    const sessionAttribution = analyticsSessionKey
      ? visitorSessionRepository.getByCompany(req.companyId)
        .find((session) => session.sessionKey === analyticsSessionKey)
        ?.attribution
      : null;
    const attribution = !isStaff && !isPortalOperator
      ? normalizeAttribution(
        sessionAttribution && Object.keys(sessionAttribution).length
          ? sessionAttribution
          : req.body?.attribution,
      )
      : {};

    const order = {
      id: `ORD-${Date.now()}`,
      attribution,
      analyticsSessionKey: attribution && Object.keys(attribution).length ? analyticsSessionKey || null : null,
      customer,
      customerUserId: user?.role === "customer"
        ? user.id
        : isPortalOperator
          ? cleanText(req.body.customerUserId, 160) || null
          : null,
      items,
      merchandiseSubtotal,
      automaticDiscountTotal,
      couponCode: coupon?.code || null,
      couponDiscount,
      discountTotal,
      subtotal: paidProductSubtotal,
      total: orderTotal,
      pointsEarned,
      pointsRedeemed,
      discountFromPoints,
      pointsAwardedAt: pointsEarned > 0 ? now : null,
      pointsReversedAt: null,
      pointsRedemptionAppliedAt: pointsRedeemed > 0 ? now : null,
      pointsRedemptionRestoredAt: null,
      delivery_city_key: deliveryZone ? deliveryZone.city_key : "",
      delivery_city_name: deliveryZone ? deliveryZone.city_name : "",
      delivery_region: deliveryZone ? deliveryZone.region : "",
      delivery_price: deliveryPrice,
      delivery_currency: deliveryZone ? deliveryZone.currency : "",
      paymentMethod: cleanText(req.body.paymentMethod, 80) || "Cash on delivery",
      status: "Awaiting Employee Review",
      handledByEmployeeId: isStaff ? user.id : "",
      assignedToEmployeeId: isStaff ? user.id : "",
      createdByEmployeeId:
        isStaff ? user.id : isPortalOperator ? cleanText(req.body.createdByEmployeeId, 160) : "",
      createdByEmployeeName:
        isStaff ? user.name : isPortalOperator ? cleanText(req.body.createdByEmployeeName, 120) : "",
      createdBy: publicUser(user),
      lastUpdatedBy: publicUser(user),
      createdAt: now,
      updatedAt: now,
    };

    if (isCustomer && pointsRedeemed > 0) {
      pointsUser.ebPoints = Math.max(0, Number(pointsUser.ebPoints || 0) - pointsRedeemed);
      pointsUser.totalPointsRedeemed = Math.max(0, Number(pointsUser.totalPointsRedeemed || 0)) + pointsRedeemed;
    }

    if (isCustomer && pointsEarned > 0) {
      pointsUser.ebPoints = Math.max(0, Number(pointsUser.ebPoints || 0)) + pointsEarned;
      pointsUser.totalPointsEarned = Math.max(0, Number(pointsUser.totalPointsEarned || 0)) + pointsEarned;
    }

    // Coupon consumption + authoritative order create share one atomic boundary
    // (Postgres transaction when configured; in-memory compensate otherwise).
    try {
      await createOrderWithOptionalCouponConsumption(req.companyId, {
        order,
        couponId: coupon?.id || null,
      });
    } catch (error) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({ message: error.message });
      }
      throw error;
    }

    // Purchase funnel: written only after the order above committed, and only
    // for storefront checkouts (staff/operator orders are not funnel purchases).
    if (!isStaff && !isPortalOperator) {
      await recordPurchaseEvent(req.companyId, order.id);
    }

    // Persist points/user side-effects — non-fatal; coupon+order already committed atomically when Postgres is configured.
    await safePersist(req.companyId);

    // Fire activity log — never throws
    safeRecordActivityLog({
      req,
      companyId: req.companyId,
      action: "order.created",
      entityType: "order",
      entityId: order.id,
      entityLabel: order.id || "",
      summary: `Order ${order.id} created for ${customer.name}`,
      afterData: {
        customer_name: customer.name,
        total: orderTotal,
        item_count: items.length,
        coupon_code: order.couponCode,
        coupon_discount: couponDiscount,
        automatic_discount_total: automaticDiscountTotal,
      },
    });
    if (coupon) {
      safeRecordActivityLog({
        req,
        companyId: req.companyId,
        action: "coupon.redeemed",
        entityType: "coupon",
        entityId: coupon.id,
        entityLabel: coupon.code,
        summary: `Coupon ${coupon.code} redeemed on order ${order.id}`,
        afterData: { orderId: order.id, discount: couponDiscount },
      });
    }

    return res.status(201).json({
      ...order,
      orderId: order.id,
      orderNumber: order.number || order.orderNumber || order.id,
      status: order.status,
    });
  } catch (error) {
    console.error("Order creation failed:", error);
    return res.status(error.statusCode || 500).json({
      message: error.statusCode ? error.message : "Unable to create order. Please try again.",
    });
  }
});

router.put("/:id/status", requireAuth, async (req, res) => {
  try {
    if (!["admin", "company_admin", "super_admin"].includes(effectiveTenantRole(req)) && !req.user.permissions?.includes("orders.updateStatus")) {
      return res.status(403).json({ message: "Order status permission required." });
    }
    const order = orderRepository.findByCompany(req.companyId, req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found." });

    const prevStatus = order.status;
    const nextStatus = cleanText(req.body.status, 40) || order.status;
    applyLoyaltyForStatus(req.companyId, order, nextStatus);
    order.status = nextStatus;
    order.lastUpdatedBy = publicUser(req.user);
    order.updatedAt = new Date().toISOString();

    // Persist main data — non-fatal; update is already applied in memory
    await safePersist(req.companyId);

    safeRecordActivityLog({
      req,
      companyId: req.companyId,
      action: "order.status_updated",
      entityType: "order",
      entityId: order.id,
      entityLabel: order.id || "",
      summary: `Order ${order.id} status changed from ${prevStatus} to ${order.status}`,
      beforeData: { status: prevStatus },
      afterData: { status: order.status },
    });
    return res.json(order);
  } catch (error) {
    console.error("Order status update failed:", error);
    return res.status(error.statusCode || 500).json({
      message: error.statusCode ? error.message : "Unable to update order status. Please try again.",
    });
  }
});

router.put("/:id/assign-employee", requireAuth, requireOrderPermission("orders.update"), async (req, res) => {
  try {
    const order = orderRepository.findByCompany(req.companyId, req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found." });

    const employeeId = cleanText(req.body.employeeId, 160);
    if (employeeId) {
      const employee = userRepository.findByCompany(req.companyId, employeeId);
      if (!employee || !isStaffRole(employee.role) || employee.isActive === false) {
        return res.status(404).json({ message: "Employee not found." });
      }
    }

    order.handledByEmployeeId = employeeId;
    order.assignedToEmployeeId = employeeId;
    order.lastUpdatedBy = publicUser(req.user);
    order.updatedAt = new Date().toISOString();

    // Persist main data — non-fatal; update is already applied in memory
    await safePersist(req.companyId);

    safeRecordActivityLog({
      req,
      companyId: req.companyId,
      action: "order.employee_assigned",
      entityType: "order",
      entityId: order.id,
      entityLabel: order.id || "",
      summary: `Employee assigned to order ${order.id}`,
      beforeData: { handledByEmployeeId: order.handledByEmployeeId },
      afterData: { handledByEmployeeId: req.body.employeeId || "" },
    });
    return res.json(order);
  } catch (error) {
    console.error("Order assign employee failed:", error);
    return res.status(error.statusCode || 500).json({
      message: error.statusCode ? error.message : "Unable to assign employee. Please try again.",
    });
  }
});

router.delete("/:id", requireAuth, requireOrderPermission("orders.delete"), async (req, res) => {
  try {
    const existing = orderRepository.findByCompany(req.companyId, req.params.id);
    if (existing) applyLoyaltyForStatus(req.companyId, existing, "Cancelled");
    const removed = orderRepository.deleteForCompany(req.companyId, req.params.id);
    if (!removed) return res.status(404).json({ message: "Order not found." });

    await persistCompanyStore(req.companyId, { pruneMissing: true });
    return res.status(204).end();
  } catch (error) {
    console.error("Order delete failed:", error);
    return res.status(error.statusCode || 500).json({
      message: error.statusCode ? error.message : "Unable to delete order. Please try again.",
    });
  }
});

export default router;
