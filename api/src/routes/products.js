import { Router } from "express";
import {
  companyProductSchemaRepository,
  companyRepository,
  deleteProductWithTenantCatalogLock,
  listProductRelations,
  listProductsPageForCompany,
  listProductSortIdsForCompany,
  offerRepository,
  orderRepository,
  persistCompanyStore,
  productRepository,
  replaceProductRelations,
  restoreProductWithTenantCatalogLock,
  saveProductWithTenantCatalogLock,
  tenantBrandRepository,
  tenantCategoryRepository,
  trashProductWithTenantCatalogLock,
} from "../data/store.js";
import { isVariantVisible, withVariantVisibility } from "../products/variantVisibility.js";
import { normalizeStockValue, preserveOmittedVariantStock } from "../products/productStock.js";
import { attachSalesCounts, salesCountForProduct, buildSalesCountByProductId } from "../products/salesCount.js";
import { buildDuplicatedProduct } from "../products/duplicateProduct.js";
import {
  cleanupUnreferencedProductMedia,
  deleteProductRecordThenCleanupMedia,
} from "../products/permanentDeleteMedia.js";
import {
  filterActiveProducts,
  filterTrashedProducts,
  findActiveSlugOrSkuConflict,
  isProductTrashed,
} from "../products/trashLifecycle.js";
import {
  FBT_MAX,
  isAdminSelectableRelationTarget,
  normalizeRelationType,
  validateRelationTargetIds,
} from "../products/productRelations.js";
import { recordActivityLog } from "../activityLog/logger.js";
import { resolveDefaultProductSchema, sanitizeProductSchemaData } from "../productSchema/schema.js";
import { effectiveTenantRole, optionalAuth, requireAuth, requirePermission } from "../middleware/auth.js";
import { listTenantProductFieldValues } from "../productSchema/fieldValues.js";
import { normalizeCatalogHierarchyInput, validateCatalogHierarchy } from "./catalogHierarchy.js";
import {
  assertConditionMutationAllowed,
  assertCostPriceMutationAllowed,
  canAccessCostPrice,
  isProductConditionEnabled,
  normalizeOptionalBarcode,
  normalizeOptionalCostPrice,
  normalizeOptionalProductCondition,
  presentProductForCaller,
  stripProductCondition,
  validatePurchaseQuantityPair,
} from "../products/productSettings.js";
import {
  applyMerchandisingFlags,
  merchandisingFlagSnapshot,
  merchandisingFlagsChanged,
} from "../products/merchandisingFlags.js";
import { scrubProductIdFromOffers } from "../products/homepageOfferProducts.js";
import {
  DEFAULT_LOW_STOCK_THRESHOLD,
  filterProductsForAdminList,
  parseProductListQuery,
  sortProductsBySortOrder,
} from "../products/productListQuery.js";

const router = Router();
const placeholderImage = "/images/products/product-placeholder.svg";
const emptyImage = "";
// Brand-only products (Main/Sub omitted) are limited to Kids Velvet workbook
// outside-tree rows. Other tenants keep requireFullHierarchy unchanged.
const KIDS_VELVET_COMPANY_ID = "kids-velvet";

function isRealImageUrl(value) {
  return typeof value === "string"
    && value.trim()
    && !value.trim().includes("/images/products/product-placeholder");
}

function preserveImageUrl(existingValue, incomingValue) {
  if (isRealImageUrl(incomingValue)) return incomingValue.trim();
  const existing = isRealImageUrl(existingValue) ? existingValue : "";
  return existing || incomingValue || "";
}

function normalizeGalleryImages(product) {
  const source = product.gallery_images || product.galleryImages || [];
  return source
    .map((entry, index) => {
      const imageUrl = typeof entry === "string" ? entry : entry?.image_url || entry?.image || entry?.url;
      if (!imageUrl) return null;
      return {
        id: typeof entry === "object" && entry?.id ? entry.id : `gallery-${index}-${Date.now()}`,
        image_url: imageUrl,
        sort_order: Number(typeof entry === "object" ? entry?.sort_order ?? entry?.sortOrder ?? index : index),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.sort_order - b.sort_order);
}

function positivePriceOrNull(value) {
  if (value === undefined || value === null || value === "") return null;
  const price = Number(value);
  return Number.isFinite(price) && price > 0 ? price : null;
}

// An empty/zero variant price must never shadow a valid product price with 0.
function resolveVariantPrice(variantPrice, productPrice) {
  return positivePriceOrNull(variantPrice)
    ?? positivePriceOrNull(productPrice)
    ?? 0;
}

function normalizeVariants(product) {
  const variants = Array.isArray(product.variants) ? product.variants : [];
  if (variants.length) {
    return variants
      .map((variant, index) => {
        const normalized = withVariantVisibility({
          ...variant,
          id: variant.id || `${product.id || "product"}-variant-${index}-${Date.now()}`,
          color_name: variant.color_name || variant.colorName || "Default",
          color_value: variant.color_value || variant.colorValue || variant.colorHex || "",
          size: variant.size || "",
          price: resolveVariantPrice(variant.price, product.price),
          wholesalePrice: variant.wholesalePrice != null ? Number(variant.wholesalePrice) : undefined,
          stock: normalizeStockValue(variant.stock ?? variant.stockQty ?? product.stockQty, {
            fallback: 0,
            label: `Variant ${index + 1} stock`,
          }),
          image_url: variant.image_url || variant.imageUrl || variant.image || "",
          sort_order: Number(variant.sort_order ?? variant.sortOrder ?? index),
        });
        const costSource = Object.prototype.hasOwnProperty.call(variant, "costPrice")
          ? variant.costPrice
          : Object.prototype.hasOwnProperty.call(variant, "cost_price")
            ? variant.cost_price
            : undefined;
        if (costSource !== undefined) {
          const costPrice = normalizeOptionalCostPrice(costSource, `Variant ${index + 1} costPrice`);
          if (costPrice !== undefined) normalized.costPrice = costPrice;
          else {
            delete normalized.costPrice;
            delete normalized.cost_price;
          }
        } else {
          delete normalized.costPrice;
          delete normalized.cost_price;
        }
        return normalized;
      })
      .sort((a, b) => a.sort_order - b.sort_order);
  }

  return (product.sizes || []).map((sizeOption, index) => withVariantVisibility({
    id: `${product.id || "product"}-variant-${index}`,
    color_name: "Default",
    color_value: "",
    size: sizeOption.size || "",
    price: resolveVariantPrice(sizeOption.price, product.price),
    wholesalePrice: sizeOption.wholesalePrice != null ? Number(sizeOption.wholesalePrice) : undefined,
    stock: normalizeStockValue(product.stockQty, { fallback: 24, label: `Variant ${index + 1} stock` }),
    image_url: product.image || "",
    sort_order: index,
  }));
}

function sizesFromVariants(variants, fallbackSizes = []) {
  const bySize = new Map();
  variants.filter(isVariantVisible).forEach((variant) => {
    const price = positivePriceOrNull(variant.price);
    if (price === null) return;
    const current = bySize.get(variant.size);
    if (!current || price < current.price) {
      bySize.set(variant.size, { size: variant.size, price });
    }
  });
  if (bySize.size) return Array.from(bySize.values());
  return variants.length ? [] : fallbackSizes;
}

function normalizeProduct(product) {
  const primarySource = product.image || product.primaryImage || product.primary_image || "";
  const hoverSource = product.hoverImage || product.secondaryImage || product.secondary_image || "";
  const image = isRealImageUrl(primarySource) ? primarySource.trim() : emptyImage;
  const hoverImage = isRealImageUrl(hoverSource) ? hoverSource.trim() : emptyImage;

  const galleryImages = normalizeGalleryImages(product);
  const variants = normalizeVariants({ ...product, image: image || placeholderImage });
  const quantityLimits = validatePurchaseQuantityPair(
    product.minPurchaseQuantity,
    product.maxPurchaseQuantity,
  );

  const { productCondition: _productCondition, ...productWithoutAlias } = product;
  return applyMerchandisingFlags({
    ...productWithoutAlias,
    image,
    hoverImage,
    barcode: normalizeOptionalBarcode(product.barcode),
    condition: normalizeOptionalProductCondition(product.condition),
    minPurchaseQuantity: quantityLimits.minPurchaseQuantity,
    maxPurchaseQuantity: quantityLimits.maxPurchaseQuantity,
    variants,
    sizes: sizesFromVariants(variants, product.sizes || []),
    gallery_images: galleryImages,
    galleryImages: galleryImages.map((entry) => entry.image_url),
    fallbackImage: product.fallbackImage || placeholderImage,
    usageVideo: product.usageVideo || product.usage_video || null,
    usageVideoPoster: product.usageVideoPoster || product.usage_video_poster || null,
  });
}

function presentNormalizedProduct(product, req) {
  const company = companyRepository.getCompanyById(req.companyId) || req.company;
  const includeCostPrice = Boolean(req.user) && canAccessCostPrice(req, company);
  let presented = presentProductForCaller(product, { includeCostPrice });
  // Unauthenticated callers only see condition when the company gate is on.
  // Admin GET may still return a stored value while the feature is disabled.
  if (!req.user && !isProductConditionEnabled(company)) {
    presented = stripProductCondition(presented);
  }
  return presented;
}

function normalizeProductForRequest(product, authenticated) {
  const normalized = normalizeProduct(product);
  return authenticated
    ? normalized
    : { ...normalized, variants: (normalized.variants || []).filter(isVariantVisible) };
}

function productSchemaForCompany(companyId) {
  return companyProductSchemaRepository.findByCompany(companyId, () => true)?.schema || resolveDefaultProductSchema(companyId);
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function sendProductPersistenceError(req, res, error, operation) {
  if (error?.statusCode) return res.status(error.statusCode).json({ message: error.message });
  console.error(`Product ${operation} failed`, {
    code: error?.code || "UNKNOWN",
    constraint: error?.constraint || "",
  });
  const arabic = String(req.headers["accept-language"] || "").toLowerCase().startsWith("ar");
  if (error?.code === "23505") {
    return res.status(409).json({
      code: "PRODUCT_VARIANT_CONFLICT",
      message: arabic
        ? "تعذر حفظ متغيرات المنتج بأمان. أعد تحميل المنتج وحاول مرة أخرى."
        : "Product variants could not be saved safely. Reload the product and try again.",
    });
  }
  return res.status(500).json({
    code: "PRODUCT_SAVE_FAILED",
    message: arabic ? "تعذر حفظ المنتج. يرجى المحاولة مرة أخرى." : "Product could not be saved. Please try again.",
  });
}

function variantSignature(variant = {}) {
  return `${variant.color_name || variant.colorName || ""}__${variant.size || ""}`.toLowerCase();
}

function mergeVariantImageUrls(existingProduct, incomingVariants) {
  if (!Array.isArray(incomingVariants)) {
    return incomingVariants;
  }

  const existingVariants = normalizeVariants(existingProduct);
  const existingById = new Map(existingVariants.map((variant) => [variant.id, variant]));
  const existingBySignature = new Map(existingVariants.map((variant) => [variantSignature(variant), variant]));

  return incomingVariants.map((variant) => {
    const existing =
      existingById.get(variant.id) ||
      existingBySignature.get(variantSignature(variant));
    let withStock = preserveOmittedVariantStock(existing || {}, variant);
    // Preserve variant costPrice unless the client explicitly sent the field.
    if (!hasOwn(withStock, "costPrice") && !hasOwn(withStock, "cost_price") && existing?.costPrice != null) {
      withStock = { ...withStock, costPrice: existing.costPrice };
    }
    // Preserve a valid existing price when the incoming price is empty/zero.
    if (positivePriceOrNull(withStock.price) === null) {
      const existingPrice = positivePriceOrNull(existing?.price);
      if (existingPrice !== null) withStock = { ...withStock, price: existingPrice };
      else delete withStock.price;
    }
    if (variant.clearImage === true) {
      const { clearImage, ...cleared } = withStock;
      return { ...cleared, image_url: "" };
    }
    const incomingImage = variant.image_url || variant.imageUrl || variant.image || "";
    if (isRealImageUrl(incomingImage)) {
      return withStock;
    }

    const existingImage = existing?.image_url || existing?.imageUrl || existing?.image || "";
    return existingImage ? { ...withStock, image_url: existingImage } : withStock;
  });
}

function mergeProductUpdate(existingProduct, incomingProduct) {
  const removedImageFields = new Set(Array.isArray(incomingProduct.removedImageFields) ? incomingProduct.removedImageFields : []);
  const cleanIncoming = { ...incomingProduct };
  delete cleanIncoming.removedImageFields;
  delete cleanIncoming.clearGalleryImages;
  const detailFieldMap = {
    dsiHowItWorks: "howItWorks", dsiHowItWorks1: "howItWorks1", dsiHowItWorks2: "howItWorks2",
    dsiHowItWorks3: "howItWorks3", dsiImpact: "impact", dsiImpact1: "impact1", dsiImpact2: "impact2",
    dsiSafeToUse: "safeToUse", dsiPracticalBanner: "practicalBanner", dsiIngredients: "ingredients",
    dsiFaq: "faq", dsiMainImage: "mainImage",
  };
  const detailSectionImages = {
    ...(existingProduct.detailSectionImages || existingProduct.detail_section_images || {}),
    ...(cleanIncoming.detailSectionImages || cleanIncoming.detail_section_images || {}),
  };
  for (const [formField, detailKey] of Object.entries(detailFieldMap)) {
    if (removedImageFields.has(formField)) detailSectionImages[detailKey] = "";
  }
  const merged = {
    ...existingProduct,
    ...cleanIncoming,
    image: removedImageFields.has("image") ? "" : preserveImageUrl(
      existingProduct.image || existingProduct.primaryImage || existingProduct.primary_image || "",
      cleanIncoming.image || cleanIncoming.primaryImage || cleanIncoming.primary_image || "",
    ),
    hoverImage: removedImageFields.has("hoverImage") ? "" : preserveImageUrl(
      existingProduct.hoverImage || existingProduct.secondaryImage || existingProduct.secondary_image || "",
      cleanIncoming.hoverImage || cleanIncoming.secondaryImage || cleanIncoming.secondary_image || "",
    ),
    productsPageImage: removedImageFields.has("productsPageImage") ? "" : preserveImageUrl(existingProduct.productsPageImage || "", cleanIncoming.productsPageImage),
    productsPageHoverImage: removedImageFields.has("productsPageHoverImage") ? "" : preserveImageUrl(existingProduct.productsPageHoverImage || "", cleanIncoming.productsPageHoverImage),
    detailSectionImages,
    updatedAt: new Date().toISOString(),
  };

  if (hasOwn(incomingProduct, "variants")) {
    merged.variants = mergeVariantImageUrls(existingProduct, incomingProduct.variants);
  }

  if (hasOwn(incomingProduct, "gallery_images") || hasOwn(incomingProduct, "galleryImages")) {
    const incomingGallery = normalizeGalleryImages(incomingProduct);
    const existingGallery = normalizeGalleryImages(existingProduct);
    const shouldClearGallery = incomingProduct.clearGalleryImages === true;
    const mergedGallery = shouldClearGallery ? [] : incomingGallery.length ? incomingGallery : existingGallery;
    merged.gallery_images = mergedGallery;
    merged.galleryImages = mergedGallery.map((entry) => entry.image_url);
  }

  return merged;
}

function normalizedReferenceValue(value, field) {
  if (value === null || value === "") return null;
  if (typeof value !== "string" || !value.trim()) {
    const error = new Error(`${field} must be a non-empty string or null.`);
    error.statusCode = 400;
    throw error;
  }
  return value.trim();
}

function canonicalNormalizedCatalogReferences(incoming) {
  if (hasOwn(incoming, "category_id") || hasOwn(incoming, "brand_id")) {
    const error = new Error("category_id and brand_id are not accepted; use categoryId and brandId.");
    error.statusCode = 400;
    throw error;
  }
  const references = {};
  for (const field of ["categoryId", "brandId", "mainCategoryId", "subcategoryId"]) {
    if (hasOwn(incoming, field)) {
      references[field] = normalizedReferenceValue(incoming[field], field) ?? null;
    }
  }
  // The concrete product category (the FK consumed by the rest of the catalog)
  // mirrors the Subcategory whenever one is supplied. This keeps the legacy
  // `categoryId` path intact while adding the Main/Subcategory hierarchy.
  if (hasOwn(references, "subcategoryId") && !hasOwn(references, "categoryId")) {
    references.categoryId = references.subcategoryId;
  }
  return references;
}

// Validates the product's Brand -> Main Category -> Subcategory hierarchy and
// its filter attributes against the company's real catalog records. Also merges
// the normalized hierarchy/filter values into the product for persistence.
async function applyCatalogHierarchyAndFilters(companyId, product) {
  const [brands, categories] = await Promise.all([
    tenantBrandRepository.listByCompany(companyId),
    tenantCategoryRepository.listByCompany(companyId),
  ]);
  const validated = validateCatalogHierarchy({
    brands,
    categories,
    product,
    requireFullHierarchy: true,
    allowBrandOnly: companyId === KIDS_VELVET_COMPANY_ID,
  });
  return { ...product, ...validated };
}

export function requireProductListPermission(req, res, next) {
  if (!req.user) return next();
  const role = effectiveTenantRole(req);
  if (["admin", "company_admin", "super_admin", "manager"].includes(role)) return next();
  if (["employee", "staff"].includes(role) && req.user?.permissions?.includes("products.view")) return next();
  return res.status(403).json({ message: "Product view permission required." });
}

router.get("/", optionalAuth, requireProductListPermission, async (req, res) => {
  const trashOnly = String(req.query.trash || "").toLowerCase() === "true";
  const listQuery = parseProductListQuery(req.query, {
    lowStockThreshold: Number(req.company?.settings?.lowStockThreshold) || DEFAULT_LOW_STOCK_THRESHOLD,
  });

  // Authenticated admin list: repository/DB COUNT + LIMIT/OFFSET (or memory fallback).
  if (req.user && listQuery.view === "ids" && !trashOnly) {
    const ids = await listProductSortIdsForCompany(req.companyId);
    return res.json({ ids });
  }

  if (req.user && listQuery.wantsPagination) {
    const pageResult = await listProductsPageForCompany(req.companyId, {
      ...listQuery,
      trashOnly,
    });
    const normalized = pageResult.items.map((product) => {
      const base = normalizeProductForRequest(product, true);
      return presentNormalizedProduct(base, req);
    });
    const withSales = attachSalesCounts(normalized, orderRepository.getByCompany(req.companyId));
    return res.json({
      items: withSales,
      total: pageResult.total,
      page: pageResult.page,
      limit: pageResult.limit,
    });
  }

  const allProducts = productRepository.getByCompany(req.companyId);
  let products;
  if (trashOnly) {
    if (!req.user) {
      return res.status(403).json({ message: "Product view permission required." });
    }
    products = filterTrashedProducts(allProducts);
  } else {
    products = filterActiveProducts(allProducts);
  }
  // CPanel users must see inactive records so they can manage them. Public
  // storefront callers receive only active, visible products.
  const visibleProducts = req.user
    ? products
    : products.filter((product) => product.isActive !== false && product.visible !== false);

  let working = visibleProducts;
  if (req.user && (listQuery.q || listQuery.brand !== "all" || listQuery.category !== "all" || listQuery.status !== "all" || listQuery.stock !== "all" || listQuery.merchandising !== "all")) {
    working = filterProductsForAdminList(visibleProducts, listQuery);
  }
  working = sortProductsBySortOrder(working);

  const normalized = working.map((product) => {
    const base = normalizeProductForRequest(product, Boolean(req.user));
    return presentNormalizedProduct(base, req);
  });

  // Decision 12: authenticated list includes tenant-scoped backend salesCount.
  const withSales = req.user
    ? attachSalesCounts(normalized, orderRepository.getByCompany(req.companyId))
    : normalized;

  return res.json(withSales);
});

router.get("/:id/details", optionalAuth, requireProductListPermission, async (req, res, next) => {
  const product = productRepository.findByCompany(req.companyId, req.params.id);
  if (!product || isProductTrashed(product) || product.isActive === false || (!req.user && product.visible === false)) {
    return res.status(404).json({ message: "Product not found." });
  }
  try {
    const values = await listTenantProductFieldValues(req.companyId, req.params.id);
    const fields = {};
    for (const entry of values) {
      const key = entry.storefront_mapping_key || entry.field_key;
      if (entry.locale === "neutral") fields[key] = entry.value;
      else fields[key] = { ...(fields[key] || {}), [entry.locale]: entry.value };
    }
    const normalized = presentNormalizedProduct(
      normalizeProductForRequest(product, Boolean(req.user)),
      req,
    );
    if (req.user) {
      const counts = buildSalesCountByProductId(orderRepository.getByCompany(req.companyId));
      return res.json({ ...normalized, fields, salesCount: salesCountForProduct(counts, product.id) });
    }
    return res.json({ ...normalized, fields });
  } catch (error) {
    return next(error);
  }
});

function relationTypeFromQuery(req, res) {
  const type = normalizeRelationType(req.query.type);
  if (!type) {
    res.status(400).json({ message: "Query parameter type must be 'related' or 'fbt'." });
    return null;
  }
  return type;
}

function adminRelationProductSummary(product, req) {
  const base = presentNormalizedProduct(
    normalizeProductForRequest(product, true),
    req,
  );
  return {
    id: base.id,
    slug: base.slug,
    sku: base.sku || "",
    name: base.name,
    image: base.image || base.primaryImage || "",
    categoryId: base.categoryId || null,
    subcategoryId: base.subcategoryId || null,
    mainCategoryId: base.mainCategoryId || null,
    isActive: base.isActive !== false,
    sortOrder: Number(base.sortOrder || 0),
  };
}

router.get("/:id/relations", requireAuth, requireProductListPermission, async (req, res, next) => {
  const type = relationTypeFromQuery(req, res);
  if (!type) return undefined;

  const source = productRepository.findByCompany(req.companyId, req.params.id);
  if (!source || isProductTrashed(source)) {
    return res.status(404).json({ message: "Product not found." });
  }

  try {
    const rows = await listProductRelations(req.companyId, source.id, type);
    const productsById = new Map(
      productRepository.getByCompany(req.companyId).map((product) => [product.id, product]),
    );
    const targets = [];
    for (const row of rows) {
      const target = productsById.get(row.targetProductId);
      if (!target || !isAdminSelectableRelationTarget(target)) continue;
      targets.push(adminRelationProductSummary(target, req));
    }
    return res.json({
      sourceProductId: source.id,
      type,
      targetProductIds: targets.map((item) => item.id),
      products: targets,
    });
  } catch (error) {
    return next(error);
  }
});

router.put("/:id/relations", requireAuth, requirePermission("products.update"), async (req, res, next) => {
  const type = relationTypeFromQuery(req, res);
  if (!type) return undefined;

  const source = productRepository.findByCompany(req.companyId, req.params.id);
  if (!source || isProductTrashed(source)) {
    return res.status(404).json({ message: "Product not found." });
  }

  try {
    const rawIds = Array.isArray(req.body?.targetProductIds) ? req.body.targetProductIds : null;
    if (!rawIds) {
      return res.status(400).json({ message: "targetProductIds array is required." });
    }

    const productsById = new Map(
      productRepository.getByCompany(req.companyId).map((product) => [product.id, product]),
    );
    const previousRows = await listProductRelations(req.companyId, source.id, type);
    const validatedIds = validateRelationTargetIds({
      sourceProductId: source.id,
      targetProductIds: rawIds,
      productsById,
      maxTargets: type === "fbt" ? FBT_MAX : null,
    });

    const rows = await replaceProductRelations(req.companyId, source.id, type, validatedIds);
    const products = validatedIds
      .map((id) => productsById.get(id))
      .filter(Boolean)
      .map((product) => adminRelationProductSummary(product, req));

    const sourceName = source.name?.en || source.slug || source.id;
    recordActivityLog({
      req,
      companyId: req.companyId,
      action: "product.relations_updated",
      entityType: "product",
      entityId: source.id,
      entityLabel: sourceName,
      summary: `Product "${sourceName}" ${type} relations updated`,
      beforeData: { type, targetProductIds: previousRows.map((row) => row.targetProductId) },
      afterData: { type, targetProductIds: validatedIds },
      metadata: { type, count: validatedIds.length },
    });

    return res.json({
      sourceProductId: source.id,
      type,
      targetProductIds: validatedIds,
      products,
      relations: rows,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    return next(error);
  }
});

router.post("/:id/duplicate", requireAuth, requirePermission("products.create"), async (req, res) => {
  const source = productRepository.findByCompany(req.companyId, req.params.id);
  if (!source || isProductTrashed(source)) {
    return res.status(404).json({ message: "Product not found." });
  }

  let product;
  try {
    const company = companyRepository.getCompanyById(req.companyId);
    const existingProducts = filterActiveProducts(productRepository.getByCompany(req.companyId));
    let draft = buildDuplicatedProduct(source, { existingProducts });
    if (!isProductConditionEnabled(company)) {
      draft = stripProductCondition(draft);
    }
    product = normalizeProduct(sanitizeProductSchemaData(draft, productSchemaForCompany(req.companyId)));
    product = await applyCatalogHierarchyAndFilters(req.companyId, product);
    product = await saveProductWithTenantCatalogLock(req.companyId, product, { isCreate: true });
  } catch (error) {
    return sendProductPersistenceError(req, res, error, "duplication");
  }

  await recordActivityLog({
    req,
    companyId: req.companyId,
    action: "product.duplicated",
    entityType: "product",
    entityId: product.id,
    entityLabel: product.name?.en || product.slug || "",
    summary: `Product "${source.name?.en || source.slug}" duplicated as "${product.name?.en || product.slug}"`,
    beforeData: { sourceId: source.id, sourceSlug: source.slug, sourceSku: source.sku },
    afterData: {
      id: product.id,
      slug: product.slug,
      sku: product.sku,
      variantCount: Array.isArray(product.variants) ? product.variants.length : 0,
      mediaStrategy: "reference-urls",
    },
  });

  const counts = buildSalesCountByProductId(orderRepository.getByCompany(req.companyId));
  return res.status(201).json({
    ...presentNormalizedProduct(product, req),
    salesCount: salesCountForProduct(counts, product.id),
  });
});

router.post("/:id/restore", requireAuth, requirePermission("products.update"), async (req, res) => {
  const existing = productRepository.findByCompany(req.companyId, req.params.id);
  if (!existing) {
    return res.status(404).json({ message: "Product not found." });
  }
  if (!isProductTrashed(existing)) {
    return res.json(existing);
  }

  const conflict = findActiveSlugOrSkuConflict(productRepository.getByCompany(req.companyId), {
    slug: existing.slug,
    sku: existing.sku,
    excludeProductId: existing.id,
  });
  if (conflict) {
    return res.status(409).json({
      message: `Cannot restore product: another active product already uses this ${conflict.field}.`,
      field: conflict.field,
      value: conflict.value,
    });
  }

  try {
    const restored = await restoreProductWithTenantCatalogLock(req.companyId, req.params.id);
    if (!restored) return res.status(404).json({ message: "Product not found." });
    const restoredName = restored.name?.en || restored.slug || "";
    recordActivityLog({
      req,
      companyId: req.companyId,
      action: "product.restored",
      entityType: "product",
      entityId: restored.id,
      entityLabel: restoredName,
      summary: `Product "${restoredName}" restored from trash`,
      beforeData: { deletedAt: existing.deletedAt || existing.deleted_at },
      afterData: { deletedAt: null },
    });
    return res.json(presentNormalizedProduct(restored, req));
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.statusCode ? error.message : "Product restore failed.",
    });
  }
});

router.post("/", requireAuth, requirePermission("products.create"), async (req, res) => {
  let product;
  try {
    const company = companyRepository.getCompanyById(req.companyId);
    assertCostPriceMutationAllowed(req, company, req.body);
    assertConditionMutationAllowed(req, company, req.body);
    const normalizedReferences = canonicalNormalizedCatalogReferences(req.body);
    const hierarchyInput = normalizeCatalogHierarchyInput(req.body);

    const { removedImageFields, clearGalleryImages, ...productBody } = req.body;
    product = normalizeProduct(sanitizeProductSchemaData({
      ...productBody,
      ...normalizedReferences,
      ...hierarchyInput,

      id: req.body.id || `product-${Date.now()}`,
      slug: req.body.slug || `product-${Date.now()}`,
    }, productSchemaForCompany(req.companyId), { preserveUnknownShowcaseSections: false }));
    product = await applyCatalogHierarchyAndFilters(req.companyId, product);

    product = await saveProductWithTenantCatalogLock(req.companyId, product, { isCreate: true });
  } catch (error) {
    return sendProductPersistenceError(req, res, error, "creation");
  }
  recordActivityLog({
    req,
    companyId: req.companyId,
    action: "product.created",
    entityType: "product",
    entityId: product.id,
    entityLabel: product.name?.en || product.slug || "",
    summary: `Product "${product.name?.en || product.slug}" created`,
    afterData: { name: product.name?.en || product.slug, category: product.categoryId },
  });
  res.status(201).json(presentNormalizedProduct(product, req));
});

router.put("/:id", requireAuth, requirePermission("products.update"), async (req, res) => {
  const existing = productRepository.findByCompany(req.companyId, req.params.id);
  if (!existing || isProductTrashed(existing)) {
    return res.status(404).json({ message: "Product not found." });
  }
  let normalizedUpdate;
  try {
    const company = companyRepository.getCompanyById(req.companyId);
    assertCostPriceMutationAllowed(req, company, req.body);
    assertConditionMutationAllowed(req, company, req.body, existing);
    const normalizedReferences = canonicalNormalizedCatalogReferences(req.body);
    const hierarchyInput = normalizeCatalogHierarchyInput(req.body);

    // Image/catalog edits must not fail because existing products still carry
    // legacy showcase keys (e.g. faq) outside the current tenant schema.
    // Explicit customShowcase on PUT stays strictly validated.
    const showcaseExplicitlyProvided = hasOwn(req.body, "customShowcase");
    normalizedUpdate = normalizeProduct(sanitizeProductSchemaData(mergeProductUpdate(existing, {
      ...req.body,
      ...normalizedReferences,
      ...hierarchyInput,

      id: req.params.id,
    }), productSchemaForCompany(req.companyId), {
      preserveUnknownShowcaseSections: !showcaseExplicitlyProvided,
    }));
    // Never allow a normal update to clear trash state — restore is explicit.
    normalizedUpdate.deletedAt = null;
    normalizedUpdate.deleted_at = null;
    normalizedUpdate = await applyCatalogHierarchyAndFilters(req.companyId, normalizedUpdate);

    normalizedUpdate = await saveProductWithTenantCatalogLock(req.companyId, normalizedUpdate);
  } catch (error) {
    return sendProductPersistenceError(req, res, error, "update");
  }
  const updated = normalizedUpdate;
  const updatedName = updated.name?.en || updated.slug || "";
  const wasVisible = existing.visible !== false;
  const nowVisible = updated.visible !== false;
  const visibilityChanged = wasVisible !== nowVisible;
  const flagsChanged = merchandisingFlagsChanged(existing, updated);
  const beforeFlags = merchandisingFlagSnapshot(existing);
  const afterFlags = merchandisingFlagSnapshot(updated);
  const conditionChanged = (existing.condition || null) !== (updated.condition || null);
  let action = "product.updated";
  let summary = `Product "${updatedName}" updated`;
  if (visibilityChanged) {
    action = "product.visibility_changed";
    summary = `Product "${updatedName}" ${nowVisible ? "shown" : "hidden"}`;
  } else if (flagsChanged) {
    action = "product.merchandising_updated";
    summary = `Product "${updatedName}" merchandising updated`;
  }
  recordActivityLog({
    req,
    companyId: req.companyId,
    action,
    entityType: "product",
    entityId: existing.id,
    entityLabel: updatedName,
    summary,
    beforeData: {
      name: existing.name?.en || existing.slug,
      visible: existing.visible !== false,
      ...(flagsChanged ? beforeFlags : {}),
      ...(conditionChanged ? { condition: existing.condition || null } : {}),
    },
    afterData: {
      name: updatedName,
      visible: updated.visible !== false,
      ...(flagsChanged ? afterFlags : {}),
      ...(conditionChanged ? { condition: updated.condition || null } : {}),
    },
  });
  return res.json(presentNormalizedProduct(updated, req));
});

router.delete("/:id/permanent", requireAuth, requirePermission("products.permanent_delete"), async (req, res) => {
  const existing = productRepository.findByCompany(req.companyId, req.params.id);
  if (!existing) return res.status(404).json({ message: "Product not found." });
  // Permanent delete is only allowed from Trash — never from Active.
  if (!isProductTrashed(existing)) {
    return res.status(409).json({
      message: "Only trashed products can be permanently deleted.",
    });
  }

  try {
    const { removed } = await deleteProductRecordThenCleanupMedia({
      deleteProductRecord: () => deleteProductWithTenantCatalogLock(req.companyId, req.params.id),
      cleanupMedia: async () => {
        const tenantProducts = productRepository.getByCompany(req.companyId);
        return cleanupUnreferencedProductMedia(req.companyId, existing, { tenantProducts });
      },
    });
    if (!removed) return res.status(404).json({ message: "Product not found." });

    // Phase J — scrub permanently deleted product from homepage offer attachments.
    const offerScrubs = scrubProductIdFromOffers(
      offerRepository.getByCompany(req.companyId),
      existing.id,
    );
    for (const offer of offerScrubs) {
      offerRepository.updateForCompany(req.companyId, offer.id, offer);
    }
    if (offerScrubs.length) {
      await persistCompanyStore(req.companyId);
    }

    const removedName = removed.name?.en || removed.slug || existing.name?.en || existing.slug || "";
    recordActivityLog({
      req,
      companyId: req.companyId,
      action: "product.permanently_deleted",
      entityType: "product",
      entityId: existing.id,
      entityLabel: removedName,
      summary: `Product "${removedName}" permanently deleted`,
      beforeData: {
        name: removedName,
        category: existing.categoryId,
        deletedAt: existing.deletedAt || existing.deleted_at || null,
        scrubbedHomepageOffers: offerScrubs.map((offer) => offer.id),
      },
    });
    return res.status(204).end();
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.statusCode ? error.message : "Permanent product deletion failed.",
    });
  }
});

router.delete("/:id", requireAuth, requirePermission("products.delete"), async (req, res) => {
  try {
    const existing = productRepository.findByCompany(req.companyId, req.params.id);
    if (!existing) return res.status(404).json({ message: "Product not found." });
    const trashed = await trashProductWithTenantCatalogLock(req.companyId, req.params.id);
    if (!trashed) return res.status(404).json({ message: "Product not found." });
    const trashedName = trashed.name?.en || trashed.slug || "";
    recordActivityLog({
      req,
      companyId: req.companyId,
      action: "product.trashed",
      entityType: "product",
      entityId: trashed.id,
      entityLabel: trashedName,
      summary: `Product "${trashedName}" moved to trash`,
      beforeData: { name: trashedName, category: trashed.categoryId, deletedAt: existing.deletedAt || existing.deleted_at || null },
      afterData: { deletedAt: trashed.deletedAt || trashed.deleted_at },
    });
    return res.status(204).end();
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.statusCode ? error.message : "Product trash failed.",
    });
  }
});

// Exported for focused tests covering the zero-price variant fallback rules.
export { positivePriceOrNull, resolveVariantPrice, normalizeVariants, normalizeProduct, sizesFromVariants };

export default router;
