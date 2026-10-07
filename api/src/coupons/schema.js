import { isWithinSchedule, computeCouponDiscount, safeMoney } from "../pricing/retailPricing.js";

function cleanText(value, maxLength = 240) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function couponError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

export function normalizeCouponCode(value) {
  return cleanText(value, 64).toUpperCase().replace(/\s+/g, "");
}

export function normalizeCoupon(record = {}) {
  return {
    id: String(record.id || ""),
    code: normalizeCouponCode(record.code),
    name: cleanText(record.name, 160),
    adminNote: cleanText(record.adminNote || record.admin_note, 500),
    discountType: record.discountType === "fixed" || record.discount_type === "fixed" ? "fixed" : "percentage",
    discountValue: Math.max(0, Number(record.discountValue ?? record.discount_value ?? 0)),
    usageLimit: record.usageLimit == null && record.usage_limit == null
      ? null
      : Math.max(0, Math.floor(Number(record.usageLimit ?? record.usage_limit))),
    usedCount: Math.max(0, Math.floor(Number(record.usedCount ?? record.used_count ?? 0))),
    minOrderAmount: Math.max(0, Number(record.minOrderAmount ?? record.min_order_amount ?? 0)),
    startsAt: record.startsAt || record.starts_at || null,
    endsAt: record.endsAt || record.ends_at || null,
    isActive: record.isActive !== false && record.is_active !== false,
    createdBy: cleanText(record.createdBy || record.created_by, 160),
    updatedBy: cleanText(record.updatedBy || record.updated_by, 160),
    createdAt: record.createdAt || record.created_at || null,
    updatedAt: record.updatedAt || record.updated_at || null,
  };
}

function parseOptionalDate(value, fieldName) {
  if (value == null || value === "") return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw couponError(`${fieldName} must be a valid date.`);
  }
  return date.toISOString();
}

export function sanitizeCouponInput(body = {}, { partial = false } = {}) {
  const patch = {};

  if (!partial || body.code != null) {
    const code = normalizeCouponCode(body.code);
    if (!code) throw couponError("Coupon code is required.");
    if (!/^[A-Z0-9_-]{3,64}$/.test(code)) {
      throw couponError("Coupon code must be 3–64 characters (A–Z, 0–9, _ or -).");
    }
    patch.code = code;
  }

  if (!partial || body.name != null) {
    patch.name = cleanText(body.name, 160);
  }

  if (!partial || body.adminNote != null || body.admin_note != null) {
    patch.adminNote = cleanText(body.adminNote ?? body.admin_note, 500);
  }

  if (!partial || body.discountType != null || body.type != null) {
    patch.discountType = body.discountType === "fixed" || body.type === "fixed" ? "fixed" : "percentage";
  }

  if (!partial || body.discountValue != null || body.value != null) {
    const discountValue = Number(body.discountValue ?? body.value);
    if (!Number.isFinite(discountValue) || discountValue < 0) {
      throw couponError("Discount value must be a non-negative number.");
    }
    if (discountValue === 0) throw couponError("Discount value must be greater than zero.");
    patch.discountValue = discountValue;
  }

  const discountType = patch.discountType
    || (body.discountType === "fixed" || body.type === "fixed" ? "fixed" : "percentage");
  if (patch.discountValue != null && discountType === "percentage" && patch.discountValue > 100) {
    throw couponError("Percentage discount cannot exceed 100.");
  }

  if (!partial || body.usageLimit != null || body.usage_limit != null) {
    if (body.usageLimit == null && body.usage_limit == null) {
      patch.usageLimit = null;
    } else {
      const usageLimit = Math.floor(Number(body.usageLimit ?? body.usage_limit));
      if (!Number.isFinite(usageLimit) || usageLimit < 0) {
        throw couponError("Usage limit must be a non-negative integer or null.");
      }
      patch.usageLimit = usageLimit;
    }
  }

  if (!partial || body.minOrderAmount != null || body.min_order != null || body.min_order_amount != null) {
    const minOrderAmount = Number(body.minOrderAmount ?? body.min_order ?? body.min_order_amount ?? 0);
    if (!Number.isFinite(minOrderAmount) || minOrderAmount < 0) {
      throw couponError("Minimum order amount must be a non-negative number.");
    }
    patch.minOrderAmount = minOrderAmount;
  }

  if (!partial || body.startsAt != null) {
    patch.startsAt = parseOptionalDate(body.startsAt, "startsAt");
  }
  if (!partial || body.endsAt != null) {
    patch.endsAt = parseOptionalDate(body.endsAt, "endsAt");
  }
  if (patch.startsAt && patch.endsAt && new Date(patch.startsAt) > new Date(patch.endsAt)) {
    throw couponError("startsAt must be before endsAt.");
  }

  if (!partial || body.isActive != null || body.active != null) {
    patch.isActive = body.isActive !== false && body.active !== false;
  }

  return patch;
}

export function assertCouponApplicable(coupon, { subtotal = 0, now = new Date() } = {}) {
  if (!coupon) throw couponError("Coupon not found.", 404);
  if (coupon.isActive === false) throw couponError("This coupon is inactive.", 400);
  if (!isWithinSchedule(coupon, now)) {
    throw couponError("This coupon is expired or not yet valid.", 400);
  }
  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) {
    throw couponError("This coupon has reached its usage limit.", 400);
  }
  const orderAmount = safeMoney(subtotal);
  if (orderAmount < safeMoney(coupon.minOrderAmount)) {
    throw couponError(
      `This coupon requires a minimum order of ${safeMoney(coupon.minOrderAmount)}.`,
      400,
    );
  }
  const discount = computeCouponDiscount(orderAmount, coupon);
  if (discount <= 0) throw couponError("This coupon does not provide a valid discount.", 400);
  return { coupon, discount };
}
