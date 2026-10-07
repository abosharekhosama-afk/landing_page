import { filterActiveProducts } from "../products/trashLifecycle.js";

function cleanText(value, maxLength = 240) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function asIdList(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((id) => String(id || "").trim()).filter(Boolean))];
}

function parseOptionalDate(value, fieldName) {
  if (value == null || value === "") return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    const error = new Error(`${fieldName} must be a valid date.`);
    error.statusCode = 400;
    throw error;
  }
  return date.toISOString();
}

function discountError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

export function normalizeAutomaticDiscount(record = {}) {
  return {
    id: String(record.id || ""),
    name: cleanText(record.name, 160),
    discountType: record.discountType === "fixed" ? "fixed" : "percentage",
    discountValue: Math.max(0, Number(record.discountValue || 0)),
    minQuantity: Math.max(1, Math.floor(Number(record.minQuantity || 1)) || 1),
    productIds: asIdList(record.productIds),
    categoryIds: asIdList(record.categoryIds),
    brandIds: asIdList(record.brandIds),
    startsAt: record.startsAt || null,
    endsAt: record.endsAt || null,
    roundFinalPrice: record.roundFinalPrice === true,
    isActive: record.isActive !== false,
    createdBy: cleanText(record.createdBy || record.created_by, 160),
    updatedBy: cleanText(record.updatedBy || record.updated_by, 160),
    createdAt: record.createdAt || record.created_at || null,
    updatedAt: record.updatedAt || record.updated_at || null,
  };
}

function validateTargets(productIds, categoryIds, brandIds, { products, categories, brands, companyId }) {
  const activeProducts = filterActiveProducts(products || []);
  const productMap = new Map(activeProducts.map((product) => [String(product.id), product]));
  for (const productId of productIds) {
    const product = productMap.get(productId);
    if (!product) {
      throw discountError(`Product ${productId} is not available for this company.`, 400);
    }
    if (product.isActive === false) {
      throw discountError(`Product ${productId} is inactive.`, 400);
    }
  }

  const categoryMap = new Map((categories || []).map((category) => [String(category.id), category]));
  for (const categoryId of categoryIds) {
    const category = categoryMap.get(categoryId);
    if (!category || String(category.company_id || category.companyId || companyId) !== String(companyId)) {
      throw discountError(`Category ${categoryId} is not available for this company.`, 400);
    }
  }

  const brandMap = new Map((brands || []).map((brand) => [String(brand.id), brand]));
  for (const brandId of brandIds) {
    const brand = brandMap.get(brandId);
    if (!brand || String(brand.company_id || brand.companyId || companyId) !== String(companyId)) {
      throw discountError(`Brand ${brandId} is not available for this company.`, 400);
    }
  }
}

export function sanitizeAutomaticDiscountInput(body = {}, context = {}) {
  const name = cleanText(body.name, 160);
  if (!name) throw discountError("Discount name is required.");

  const discountType = body.discountType === "fixed" || body.type === "fixed" ? "fixed" : "percentage";
  const discountValue = Number(body.discountValue ?? body.value);
  if (!Number.isFinite(discountValue) || discountValue < 0) {
    throw discountError("Discount value must be a non-negative number.");
  }
  if (discountType === "percentage" && discountValue > 100) {
    throw discountError("Percentage discount cannot exceed 100.");
  }
  if (discountValue === 0) {
    throw discountError("Discount value must be greater than zero.");
  }

  const minQuantity = Math.floor(Number(body.minQuantity ?? 1));
  if (!Number.isFinite(minQuantity) || minQuantity < 1) {
    throw discountError("Minimum quantity must be an integer of at least 1.");
  }

  const productIds = asIdList(body.productIds);
  const categoryIds = asIdList(body.categoryIds);
  const brandIds = asIdList(body.brandIds);
  validateTargets(productIds, categoryIds, brandIds, context);

  const startsAt = parseOptionalDate(body.startsAt, "startsAt");
  const endsAt = parseOptionalDate(body.endsAt, "endsAt");
  if (startsAt && endsAt && new Date(startsAt) > new Date(endsAt)) {
    throw discountError("startsAt must be before endsAt.");
  }

  return {
    name,
    discountType,
    discountValue,
    minQuantity,
    productIds,
    categoryIds,
    brandIds,
    startsAt,
    endsAt,
    roundFinalPrice: body.roundFinalPrice === true,
    isActive: body.isActive !== false && body.active !== false,
  };
}
