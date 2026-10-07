import { products } from "./products.js";
import { homepageCategoryCards, homepageOffers, reviews as initialReviews } from "./seeds/homeContent.js";
import { defaultWebsiteMedia } from "./seeds/websiteMedia.js";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assignablePlatformUserRoleError, assignablePlatformUserRoles } from "../auth/roles.js";
import {
  findUsersByEmailFromSupabase,
  findPlatformUserByIdFromSupabase,
  categoryParentWouldCycleInSupabase,
  countCategoryChildrenFromSupabase,
  countBrandProductReferencesFromSupabase,
  countCategoryProductReferencesFromSupabase,
  createBrandForCompanyInSupabase,
  createCategoryWithTenantLockInSupabase,
  deleteCompanyMembershipFromSupabase,
  deleteBrandWithTenantLockInSupabase,
  deleteCategoryWithTenantLockInSupabase,
  deleteProductWithTenantCatalogLockInSupabase,
  trashProductWithTenantCatalogLockInSupabase,
  restoreProductWithTenantCatalogLockInSupabase,
  findBrandByCompanyFromSupabase,
  findBrandBySlugFromSupabase,
  findCategoryByCompanyFromSupabase,
  findCategoryBySlugFromSupabase,
  isSupabaseConfigured,
  listBrandsByCompanyFromSupabase,
  listCategoriesByCompanyFromSupabase,
  listProductsPageFromSupabase,
  listProductsForValuationFromSupabase,
  listProductSortIdsFromSupabase,
  listInventoryPageFromSupabase,
  listPlatformUsersFromSupabase,
  listCompanyMembershipsFromSupabase,
  listUserMembershipsFromSupabase,
  loadPlatformStoreFromSupabase,
  saveCompanyToSupabase,
  saveCompanyMembershipToSupabase,
  savePlatformUserToSupabase,
  saveStoreToSupabase,
  saveSuperAdminUserToSupabase,
  saveProductWithTenantCatalogLockInSupabase,
  createOrderConsumingCouponInSupabase,
  reorderProductsWithTenantCatalogLockInSupabase,
  listProductRelationsFromSupabase,
  listAllProductRelationsFromSupabase,
  replaceProductRelationsInSupabase,
  listProductDisplayModesFromSupabase,
  listProductDisplayOrderFromSupabase,
  saveProductDisplayConfigurationInSupabase,
  deleteProductDisplayConfigurationInSupabase,
  saveActivityLogEntryToSupabase,
  saveAnalyticsStoreToSupabase,
  saveInboxStateToSupabase,
  updateBrandForCompanyInSupabase,
  updateBrandStatusForCompanyInSupabase,
  updateCategoryWithTenantLockInSupabase,
  updateCategoryStatusForCompanyInSupabase,
  updateCompanyBrandingAndSettingsInSupabase,
} from "./postgresStore.js";
import { normalizeRelationRow } from "../products/productRelations.js";
import {
  normalizeDisplayModeRow,
  normalizeDisplayPositionRow,
  normalizeMatchMode,
  normalizeOrderingKey,
  normalizeSelection,
  normalizeSurface,
} from "../products/displayPriority.js";
import {
  COMPANY_STATUSES,
  DEFAULT_COMPANY_DOMAIN,
  DEFAULT_COMPANY_ID,
  defaultCompany,
  hasResolvableStorefront,
  isSafeCompanySlug,
  isSharedStorefrontHost,
  normalizeCompanyHost,
  normalizeCompanyId,
  normalizeCompanyStorefrontPath,
  normalizeCompanyStorefrontUrl,
  resolveStorefrontCompany,
  selectPreferredCompanyDomains,
} from "../tenancy/company.js";

export const companyDomains = [];
export function initializeDomainRegistry(domainRows = []) {
  companyDomains.length = 0;
  for (const row of domainRows) {
    companyDomains.push({
      id: row.id,
      company_id: row.company_id || row.companyId,
      domain: String(row.domain || "").toLowerCase(),
      is_primary: row.is_primary === true,
      is_active: row.is_active !== false,
      is_verified: row.is_verified === true,
      created_at: row.created_at || row.createdAt || new Date().toISOString(),
      updated_at: row.updated_at || row.updatedAt || new Date().toISOString(),
    });
  }
}

export function resolveByActiveVerifiedDomain(normalizedHost) {
  if (!normalizedHost) return null;
  for (const entry of companyDomains) {
    if (
      entry.is_active
      && entry.is_verified
      && normalizeCompanyHost(entry.domain) === normalizedHost
    ) {
      return entry;
    }
  }
  return null;
}

export function getCompanyDomainsByCompany(companyId) {
  return companyDomains.filter((d) => d.company_id === companyId);
}

export function getDomainEntryById(id) {
  return companyDomains.find((d) => d.id === id) || null;
}

export function upsertDomainEntry(entry) {
  const existing = companyDomains.findIndex((d) => d.id === entry.id);
  if (existing >= 0) {
    companyDomains[existing] = { ...companyDomains[existing], ...entry };
    return companyDomains[existing];
  }
  companyDomains.push(entry);
  return entry;
}

export function removeDomainEntry(id) {
  const idx = companyDomains.findIndex((d) => d.id === id);
  if (idx >= 0) companyDomains.splice(idx, 1);
}
import { hashPassword, isPasswordHash } from "../auth/passwords.js";
import { isVariantVisible, withVariantVisibility } from "../products/variantVisibility.js";
import { filterActiveProducts, filterTrashedProducts } from "../products/trashLifecycle.js";
import { inventoryProduct } from "../products/inventory.js";
import {
  filterProductsForAdminList,
  paginateProducts,
  sortProductsBySortOrder,
} from "../products/productListQuery.js";
import { inputCompanyId, tagRecord, withoutCompanyFields, getRecordCompanyId } from "./recordTenancy.js";

const catalogMemoryAllowed = process.env.NODE_ENV === "test"
  || (process.env.NODE_ENV === "development" && process.env.ALLOW_LOCAL_CATALOG_STORAGE === "true");
if (!isSupabaseConfigured() && !catalogMemoryAllowed) {
  throw new Error(
    "PostgreSQL catalog storage is required. Configure DATABASE_URL or POSTGRES_URL; isolated memory is test-only.",
  );
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.DATA_STORE_DIR
  ? path.resolve(process.env.DATA_STORE_DIR)
  : path.resolve(__dirname, "../data-store");
const dataFile = path.join(dataDir, "store.json");

export const allPermissions = [
  "sms.view", "sms.send", "sms.manage", "sms.logs.view", "sms.providers.manage",
  "announcements.view", "announcements.manage", "splash_ads.view", "splash_ads.manage",
  "policies.view", "policies.manage", "legal_information.view", "legal_information.manage",
  "security.login_history.view", "security.ip_blocks.view", "security.ip_blocks.manage", "security.settings.manage",
  "banners.view", "banners.manage",
  "dashboard.view",
  "products.view",
  "products.create",
  "products.update",
  "products.delete",
  "products.permanent_delete",
  "products.cost_price.manage",
  "coupons.manage",
  "products.read",
  "products.manage",
  "product_media.manage",
  "product_content.manage",
  "product_settings.view",
  "product_settings.manage",
  "categories.view",
  "categories.create",
  "categories.update",
  "categories.delete",
  "brands.view",
  "brands.create",
  "brands.update",
  "brands.delete",
  "company_settings.view",
  "company_settings.update",
  "orders.view",
  "orders.create",
  "orders.update",
  "orders.delete",
  "orders.updateStatus",
  "customers.view",
  "customers.create",
  "customers.update",
  "customers.archive",
  "customers.manage",
  "inbox.view",
  "inbox.create",
  "inbox.reply",
  "inbox.assign",
  "inbox.update",
  "inbox.archive",
  "inbox.manage",
  "employees.view",
  "website_media.manage",
  "website_texts.manage",
  "site_editor.access",
  "site_editor.edit",
  "site_editor.save",
  "site_editor.connection.manage",
  "site_editor.manifest.sync",
  "sites.manage",
  "invoices.view",
  "invoices.manage",
  "reviews.view",
  "reviews.manage",
  "delivery.view",
  "delivery.manage",
  "activity_log.view",
  "reports.view",
  "dropshipping.marketers.read",
  "dropshipping.marketers.manage",
  "dropshipping.products.read",
  "dropshipping.products.manage",
  "dropshipping.orders.read",
  "dropshipping.orders.manage",
  "dropshipping.earnings.read",
  "dropshipping.earnings.manage",
  "dropshipping.withdrawals.read",
  "dropshipping.withdrawals.manage",
  "dropshipping.reports.read",
  "dropshipping.settings.manage",
];

const seedUsers = [
  {
    id: "admin-demo",
    name: "EB Chemical Admin",
    email: "admin@epchemical.com",
    phone: "+970599000000",
    password: "admin123",
    role: "admin",
    permissions: allPermissions,
    isActive: true,
  },
  {
    id: "employee-demo",
    name: "EB Chemical Employee",
    email: "employee@epchemical.com",
    phone: "+970599000001",
    password: "employee123",
    role: "employee",
    department: "Sales",
    permissions: [
      "dashboard.view",
      "products.view",
      "orders.view",
      "orders.create",
      "orders.updateStatus",
    ],
    isActive: true,
  },
];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeTenantRecords(source, fallback, normalizer) {
  return ensureArray(source, fallback).map((record, index) => {
    const companyId = inputCompanyId(record);
    return tagRecord(normalizer(withoutCompanyFields(record), index), companyId);
  });
}

export { getRecordCompanyId } from "./recordTenancy.js";

function readPersistedStore() {
  try {
    if (!fs.existsSync(dataFile)) return null;
    return JSON.parse(fs.readFileSync(dataFile, "utf8"));
  } catch (error) {
    console.warn("Could not read persistent store, using safe defaults.", error.message);
    return null;
  }
}

function ensureArray(value, fallback) {
  return Array.isArray(value) ? value : clone(fallback);
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

function normalizeVariants(product) {
  const variants = Array.isArray(product.variants) ? product.variants : [];
  if (variants.length) {
    return variants
      .map((variant, index) => withVariantVisibility({
        ...variant,
        id: variant.id || `${product.id || "product"}-variant-${index}-${Date.now()}`,
        color_name: variant.color_name || variant.colorName || "Default",
        color_value: variant.color_value || variant.colorValue || variant.colorHex || "",
        size: variant.size || "",
        price: Number(variant.price || 0),
        wholesalePrice: variant.wholesalePrice != null ? Number(variant.wholesalePrice) : undefined,
        stock: Math.max(0, Number(variant.stock ?? variant.stockQty ?? product.stockQty ?? 0)),
        image_url: variant.image_url || variant.imageUrl || variant.image || "",
        sort_order: Number(variant.sort_order ?? variant.sortOrder ?? index),
      }))
      .sort((a, b) => a.sort_order - b.sort_order);
  }

  return (product.sizes || []).map((sizeOption, index) => withVariantVisibility({
    id: `${product.id || "product"}-variant-${index}`,
    color_name: "Default",
    color_value: "",
    size: sizeOption.size || "",
    price: Number(sizeOption.price || 0),
    wholesalePrice: sizeOption.wholesalePrice != null ? Number(sizeOption.wholesalePrice) : undefined,
    stock: Math.max(0, Number(product.stockQty ?? 24)),
    image_url: product.image || "",
    sort_order: index,
  }));
}

function normalizeGlobalUsers(source, fallback) {
  const byId = new Map();
  ensureArray(source, fallback).forEach((record, index) => {
    const user = normalizeUser(withoutCompanyFields(record), index);
    if (!byId.has(user.id)) byId.set(user.id, user);
  });
  return [...byId.values()];
}

function sizesFromVariants(variants, fallbackSizes = []) {
  const bySize = new Map();
  variants.filter(isVariantVisible).forEach((variant) => {
    const current = bySize.get(variant.size);
    if (!current || Number(variant.price) < Number(current.price)) {
      bySize.set(variant.size, { size: variant.size, price: Number(variant.price || 0) });
    }
  });
  if (bySize.size) return Array.from(bySize.values());
  return variants.length ? [] : fallbackSizes;
}

function isRealUrl(value) {
  return typeof value === "string" && value.trim() && !value.trim().includes("/images/products/product-placeholder");
}

function normalizeProduct(product, index = 0) {
  const primarySource = product.image || product.primaryImage || product.primary_image || "";
  const hoverSource = product.hoverImage || product.secondaryImage || product.secondary_image || "";
  const image = isRealUrl(primarySource) ? primarySource.trim() : "";
  const hoverImage = isRealUrl(hoverSource) ? hoverSource.trim() : "";
  const galleryImages = normalizeGalleryImages(product);
  const variants = normalizeVariants({ ...product, image: image || "/images/products/product-placeholder.svg" });
  return {
    ...product,
    id: product.id || `product-${index}-${Date.now()}`,
    image,
    hoverImage,
    variants,
    sizes: sizesFromVariants(variants, product.sizes || []),
    gallery_images: galleryImages,
    galleryImages: galleryImages.map((entry) => entry.image_url),
    fallbackImage: product.fallbackImage || "/images/products/product-placeholder.svg",
    usageVideo: product.usageVideo || product.usage_video || null,
    usageVideoPoster: product.usageVideoPoster || product.usage_video_poster || null,
  };
}

function normalizeUser(user) {
  const previousBrand = [String.fromCharCode(69, 80), "Chemical"].join(" ");
  const name = user.name?.replace?.(previousBrand, "EB Chemical") || user.name;
  const ebPoints = Math.max(0, Number(user.ebPoints || 0));
  const totalPointsEarned = Math.max(0, Number(user.totalPointsEarned || 0));
  const totalPointsRedeemed = Math.max(0, Number(user.totalPointsRedeemed || 0));
  const validAccountTypes = new Set(["retail", "trader", "wholesale"]);
  return {
    ...user,
    name,
    role: user.role || "customer",
    permissions: user.permissions || [],
    accountType: validAccountTypes.has(user.accountType) ? user.accountType : "retail",
    ebPoints,
    totalPointsEarned,
    totalPointsRedeemed,
    isActive: user.isActive !== false,
    avatarUrl: user.avatarUrl || "",
  };
}

function normalizeOrder(order) {
  const createdByEmployeeId = order.createdByEmployeeId || "";
  const handledByEmployeeId = order.handledByEmployeeId || order.assignedToEmployeeId || "";
  return {
    ...order,
    id: order.id || `ORD-${Date.now()}`,
    customer: order.customer || {},
    items: order.items || [],
    subtotal: Number(order.subtotal || order.total || 0),
    total: Number(order.total || order.subtotal || 0),
    pointsEarned: Math.max(0, Number(order.pointsEarned || 0)),
    pointsRedeemed: Math.max(0, Number(order.pointsRedeemed || 0)),
    discountFromPoints: Math.max(0, Number(order.discountFromPoints || 0)),
    automaticDiscountTotal: Math.max(0, Number(order.automaticDiscountTotal || 0)),
    couponCode: order.couponCode || null,
    couponDiscount: Math.max(0, Number(order.couponDiscount || 0)),
    discountTotal: Math.max(0, Number(order.discountTotal || 0)),
    status: order.status || "Awaiting Employee Review",
    handledByEmployeeId,
    assignedToEmployeeId: order.assignedToEmployeeId || handledByEmployeeId,
    createdByEmployeeId,
    createdByEmployeeName: order.createdByEmployeeName || "",
    createdAt: order.createdAt || new Date().toISOString(),
    updatedAt: order.updatedAt || order.createdAt || new Date().toISOString(),
  };
}

function normalizeAutomaticDiscountRecord(record = {}) {
  return {
    ...record,
    id: record.id || `discount-${Date.now()}`,
    name: record.name || "",
    discountType: record.discountType === "fixed" ? "fixed" : "percentage",
    discountValue: Math.max(0, Number(record.discountValue || 0)),
    minQuantity: Math.max(1, Math.floor(Number(record.minQuantity || 1)) || 1),
    productIds: Array.isArray(record.productIds) ? record.productIds.map(String) : [],
    categoryIds: Array.isArray(record.categoryIds) ? record.categoryIds.map(String) : [],
    brandIds: Array.isArray(record.brandIds) ? record.brandIds.map(String) : [],
    startsAt: record.startsAt || null,
    endsAt: record.endsAt || null,
    roundFinalPrice: record.roundFinalPrice === true,
    isActive: record.isActive !== false,
  };
}

function normalizeCouponRecord(record = {}) {
  return {
    ...record,
    id: record.id || `coupon-${Date.now()}`,
    code: String(record.code || "").trim().toUpperCase(),
    name: record.name || "",
    adminNote: record.adminNote || "",
    discountType: record.discountType === "fixed" ? "fixed" : "percentage",
    discountValue: Math.max(0, Number(record.discountValue || 0)),
    usageLimit: record.usageLimit == null ? null : Math.max(0, Math.floor(Number(record.usageLimit))),
    usedCount: Math.max(0, Math.floor(Number(record.usedCount || 0))),
    minOrderAmount: Math.max(0, Number(record.minOrderAmount || 0)),
    startsAt: record.startsAt || null,
    endsAt: record.endsAt || null,
    isActive: record.isActive !== false,
  };
}

function normalizeProductBundleRecord(record = {}) {
  return {
    ...record,
    id: record.id || `bundle-${Date.now()}`,
    slug: String(record.slug || "").trim().toLowerCase(),
    name: record.name || "",
    description: record.description || "",
    pricingMode: ["auto_sum", "percent_discount", "fixed_discount", "fixed_price"].includes(record.pricingMode)
      ? record.pricingMode
      : "auto_sum",
    discountValue: Math.max(0, Number(record.discountValue || 0)),
    fixedPrice: record.fixedPrice == null ? null : Math.max(0, Number(record.fixedPrice)),
    imageUrl: record.imageUrl || "",
    isActive: record.isActive !== false,
    startsAt: record.startsAt || null,
    endsAt: record.endsAt || null,
  };
}

function normalizeProductBundleItemRecord(record = {}) {
  return {
    ...record,
    id: record.id || `bundle-item-${Date.now()}`,
    bundleId: record.bundleId || record.bundle_id || "",
    productId: record.productId || record.product_id || "",
    variantId: record.variantId || record.variant_id || "",
    quantity: Math.max(1, Math.trunc(Number(record.quantity || 1)) || 1),
    sortOrder: Number(record.sortOrder ?? record.sort_order ?? 0),
  };
}

function normalizeOffer(offer, index = 0) {
  const productIds = Array.isArray(offer.productIds)
    ? [...new Set(offer.productIds.map((id) => String(id || "").trim()).filter(Boolean))]
    : [];
  return {
    ...offer,
    id: offer.id || `offer-${index}-${Date.now()}`,
    title: offer.title || { en: "", ar: "" },
    description: offer.description || { en: "", ar: "" },
    ctaText: offer.ctaText || { en: "Shop now", ar: "تسوق الآن" },
    ctaLink: offer.ctaLink || "products",
    displayOrder: Number(offer.displayOrder || index + 1),
    isActive: offer.isActive !== false,
    productIds,
  };
}

function normalizeCategoryCard(card, index = 0) {
  return {
    ...card,
    key: card.key || `card-${index}`,
    image: card.image || "/images/products/product-placeholder.svg",
    label: card.label || { en: "", ar: "" },
    title: card.title || { en: "", ar: "" },
    displayOrder: Number(card.displayOrder || index + 1),
    isActive: card.isActive !== false,
  };
}

// Review types that must survive save/reload untouched. Anything else falls
// back to "store" (legacy default) — valid types are never collapsed.
const VALID_REVIEW_TYPES = new Set(["product", "website", "order", "employee", "store", "site"]);

function normalizeReviewType(value, fallback = "store") {
  if (VALID_REVIEW_TYPES.has(value)) return value;
  return fallback;
}

function normalizeReview(review, index = 0) {
  // Preserve a valid stored type as-is; only infer "employee" from a leftover
  // employeeId when the stored type itself is missing/invalid.
  const storedType = review?.type;
  const type = VALID_REVIEW_TYPES.has(storedType)
    ? storedType
    : review?.employeeId
      ? "employee"
      : "store";
  const status = review.status || (review.isApproved === false ? "rejected" : "approved");
  return {
    ...review,
    id: review.id || `review-${index}-${Date.now()}`,
    type,
    rating: Math.max(1, Math.min(5, Number(review.rating || 5))),
    customerName: review.customerName || "Customer",
    comment: review.comment || { en: "", ar: "" },
    productId: type === "product" ? review.productId || "" : "",
    employeeId: type === "employee" ? review.employeeId || "" : "",
    employeeName: type === "employee" ? review.employeeName || "" : "",
    orderId: review.orderId || "",
    status,
    isApproved: status === "approved",
    createdAt: review.createdAt || new Date().toISOString(),
    isActive: review.isActive !== false && status !== "rejected",
  };
}

function normalizeWebsiteMedia(item, index = 0) {
  const videoUrl = item.videoUrl ?? item.video_url ?? "";
  const mediaType = item.mediaType || item.media_type || (videoUrl ? "video" : "image");
  return {
    ...item,
    id: item.id || `website-media-${index}`,
    sectionKey: item.sectionKey || item.section_key || `custom_section_${index}`,
    sectionLabel: item.sectionLabel || item.section_label || item.sectionKey || "Website image",
    groupKey: item.groupKey || item.group_key || "sections",
    fallbackImageUrl: item.fallbackImageUrl || item.fallback_image_url || "",
    imageUrl: item.imageUrl ?? item.image_url ?? "",
    videoUrl,
    mediaType,
    title: item.title || "",
    subtitle: item.subtitle || "",
    linkUrl: item.linkUrl || item.link_url || "",
    sortOrder: Number(item.sortOrder ?? item.sort_order ?? index),
    isActive: item.isActive !== false && item.is_active !== false,
  };
}

function defaultWebsiteMediaDefinition(item) {
  return {
    ...item,
    fallbackImageUrl: item.fallbackImageUrl || item.imageUrl || "",
    imageUrl: "",
  };
}

function mediaTimestamp(item) {
  const timestamp = new Date(item?.updatedAt || item?.updated_at || item?.createdAt || item?.created_at || 0).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function preferWebsiteMediaItem(current, next) {
  if (!current) return next;

  const currentHasMedia = Boolean(current.imageUrl || current.image_url || current.videoUrl || current.video_url);
  const nextHasMedia = Boolean(next.imageUrl || next.image_url || next.videoUrl || next.video_url);

  const preferred =
    nextHasMedia && !currentHasMedia
      ? next
      : !nextHasMedia && currentHasMedia
        ? current
        : mediaTimestamp(next) >= mediaTimestamp(current)
          ? next
          : current;

  const videoUrl = preferred.videoUrl ?? preferred.video_url ?? current.videoUrl ?? current.video_url ?? "";

  return {
    ...current,
    ...preferred,
    id: preferred.id || current.id,
    sectionKey: preferred.sectionKey || preferred.section_key || current.sectionKey || current.section_key,
    sectionLabel: preferred.sectionLabel || preferred.section_label || current.sectionLabel || current.section_label,
    groupKey: preferred.groupKey || preferred.group_key || current.groupKey || current.group_key,
    fallbackImageUrl: current.fallbackImageUrl || current.fallback_image_url || preferred.fallbackImageUrl || "",
    imageUrl: preferred.imageUrl ?? preferred.image_url ?? "",
    videoUrl,
    mediaType: preferred.mediaType ?? preferred.media_type ?? current.mediaType ?? (videoUrl ? "video" : "image"),
  };
}

const allowedCompanyStatuses = new Set(COMPANY_STATUSES);

function normalizeCompanyRecord(company = {}, index = 0) {
  const id = String(company.id || company.slug || `company-${index}`).trim().toLowerCase();
  const isDefault = id === DEFAULT_COMPANY_ID;
  const now = new Date().toISOString();
  const settings = company.settings && typeof company.settings === "object" && !Array.isArray(company.settings)
    ? clone(company.settings)
    : company.publicSettings && typeof company.publicSettings === "object"
      ? clone(company.publicSettings)
      : {};
  const storefrontUrl = normalizeCompanyStorefrontUrl(
    Object.prototype.hasOwnProperty.call(company, "storefrontUrl")
      ? company.storefrontUrl
      : settings.storefrontUrl,
  );
  const storefrontPath = normalizeCompanyStorefrontPath(
    Object.prototype.hasOwnProperty.call(company, "storefrontPath")
      ? company.storefrontPath
      : settings.storefrontPath,
  );
  const persistedSettings = { ...settings };
  if (storefrontUrl) persistedSettings.storefrontUrl = storefrontUrl;
  else delete persistedSettings.storefrontUrl;
  if (storefrontPath) persistedSettings.storefrontPath = storefrontPath;
  else delete persistedSettings.storefrontPath;
  const preferredDomains = selectPreferredCompanyDomains([
    ...(Array.isArray(company.domains) ? company.domains : []),
    company.domain,
    ...(isDefault ? [DEFAULT_COMPANY_DOMAIN] : []),
  ]);
  return {
    id,
    slug: isDefault ? DEFAULT_COMPANY_ID : String(company.slug || id).trim().toLowerCase(),
    name: String(company.name || (isDefault ? defaultCompany.name : "Unnamed company")).trim(),
    status: isDefault
      ? "active"
      : allowedCompanyStatuses.has(company.status)
        ? company.status
        : "inactive",
    isDefault,
    domain: preferredDomains[0]?.domain || (isDefault ? DEFAULT_COMPANY_DOMAIN : ""),
    domains: preferredDomains.map((entry) => entry.domain),
    storefrontUrl,
    storefrontPath,
    settings: persistedSettings,
    createdAt: company.createdAt || company.created_at || now,
    updatedAt: company.updatedAt || company.updated_at || company.createdAt || now,
    _domainId: company._domainId || "",
  };
}

function membershipRoleForUser(user) {
  if (user?.role === "super_admin") return "super_admin";
  if (user?.role === "admin") return "company_admin";
  if (["employee", "staff", "manager"].includes(user?.role)) return "employee";
  return "customer";
}

function normalizeMembership(membership = {}, index = 0) {
  const companyId = normalizeCompanyId(membership.companyId || membership.company_id);
  const userId = String(membership.userId || membership.user_id || "").trim();
  const now = new Date().toISOString();
  return {
    id: String(membership.id || `${companyId}:${userId || index}`),
    companyId,
    userId,
    role: String(membership.role || "customer"),
    status: membership.status === "inactive" || membership.is_active === false
      ? "inactive"
      : "active",
    _permissions: Array.isArray(membership._permissions)
      ? clone(membership._permissions)
      : Array.isArray(membership.permissions)
        ? clone(membership.permissions)
        : [],
    createdAt: membership.createdAt || membership.created_at || now,
    updatedAt: membership.updatedAt || membership.updated_at || membership.createdAt || now,
  };
}

function initializeCompanies(source) {
  const byId = new Map();
  ensureArray(source, []).forEach((company, index) => {
    const normalized = normalizeCompanyRecord(company, index);
    if (isSafeCompanySlug(normalized.id)) byId.set(normalized.id, normalized);
  });

  const persistedDefault = byId.get(DEFAULT_COMPANY_ID) || {};
  byId.set(DEFAULT_COMPANY_ID, normalizeCompanyRecord({
    ...defaultCompany,
    ...persistedDefault,
    id: DEFAULT_COMPANY_ID,
    slug: DEFAULT_COMPANY_ID,
    status: "active",
    isDefault: true,
    domain: DEFAULT_COMPANY_DOMAIN,
  }));

  return [
    byId.get(DEFAULT_COMPANY_ID),
    ...[...byId.values()].filter((company) => company.id !== DEFAULT_COMPANY_ID),
  ];
}

function serializeCompany(company) {
  const { _domainId: _internalDomainId, ...record } = company;
  return clone(record);
}

async function readInitialStore() {
  if (!isSupabaseConfigured()) {
    const persisted = readPersistedStore();
    if (Array.isArray(persisted?.domains)) {
      initializeDomainRegistry(persisted.domains);
    } else {
      initializeDomainRegistry((persisted?.companies || []).flatMap((c) => {
        const d = c.domain;
        return d ? [{ id: c._domainId || `domain-${c.id}`, company_id: c.id, domain: d, is_primary: true, is_active: true, is_verified: false }] : [];
      }));
    }
    return { persisted, canPersistToSupabase: false };
  }

  try {
    const result = await loadPlatformStoreFromSupabase();
    const localFallback = readPersistedStore();
    const store = result.isEmpty
      ? { ...(localFallback || {}), companies: result.store.companies || [] }
      : result.store;
    initializeDomainRegistry(result.rawDomains || []);
    return {
      persisted: store,
      canPersistToSupabase: true,
    };
  } catch (error) {
    console.warn("Could not read Supabase store, using local fallback without remote writes.", error.message);
    const persisted = readPersistedStore();
    if (Array.isArray(persisted?.domains)) {
      initializeDomainRegistry(persisted.domains);
    } else {
      initializeDomainRegistry((persisted?.companies || []).flatMap((c) => {
        const d = c.domain;
        return d ? [{ id: c._domainId || `domain-${c.id}`, company_id: c.id, domain: d, is_primary: true, is_active: true, is_verified: false }] : [];
      }));
    }
    return { persisted, canPersistToSupabase: false };
  }
}

let initialStore;
try {
  initialStore = await readInitialStore();
} catch (error) {
  console.error("Store initialization failed, using empty in-memory store.", error?.message || error);
  initialStore = { persisted: null, canPersistToSupabase: false };
}
const persisted = initialStore.persisted;
let canPersistToSupabase = initialStore.canPersistToSupabase;

export const companies = initializeCompanies(persisted?.companies);
export const users = normalizeGlobalUsers(persisted?.users, seedUsers);
const membershipSource = Array.isArray(persisted?.memberships)
  ? persisted.memberships
  : users.map((user) => ({
      id: `${getRecordCompanyId(user)}:${user.id}`,
      companyId: getRecordCompanyId(user),
      userId: user.id,
      role: membershipRoleForUser(user),
      status: user.isActive === false ? "inactive" : "active",
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }));
export const companyMemberships = membershipSource
  .map(normalizeMembership)
  .filter((membership) => membership.userId);
export const orders = normalizeTenantRecords(persisted?.orders, [], normalizeOrder);
export const sessions = new Map();
export const carts = new Map();
export const workSessions = normalizeTenantRecords(
  persisted?.workSessions,
  [],
  (session) => session,
);
export const productCatalog = normalizeTenantRecords(
  persisted?.products,
  products,
  normalizeProduct,
);
export const offers = normalizeTenantRecords(persisted?.offers, homepageOffers, normalizeOffer);
export const categoryCards = normalizeTenantRecords(
  persisted?.categoryCards,
  homepageCategoryCards,
  normalizeCategoryCard,
);
export const categories = normalizeTenantRecords(persisted?.categories, [], normalizeCategory);
export const brands = normalizeTenantRecords(persisted?.brands, [], normalizeBrand);
export const reviews = normalizeTenantRecords(persisted?.reviews, initialReviews, normalizeReview);
const persistedWebsiteMedia = Array.isArray(persisted?.websiteMedia) ? persisted.websiteMedia : [];
const websiteMediaBySection = new Map(
  clone(defaultWebsiteMedia).map((item) => {
    const definition = defaultWebsiteMediaDefinition(item);
    return [definition.sectionKey || definition.id, definition];
  }),
);
persistedWebsiteMedia
  .filter((item) => inputCompanyId(item) === DEFAULT_COMPANY_ID)
  .forEach((item, index) => {
  const sectionKey = item.sectionKey || item.section_key || item.id || `persisted-website-media-${index}`;
  websiteMediaBySection.set(sectionKey, preferWebsiteMediaItem(websiteMediaBySection.get(sectionKey), item));
});
const deletedWebsiteMediaKeys = Array.isArray(persisted?.deletedWebsiteMediaKeys) ? persisted.deletedWebsiteMediaKeys : [];
const defaultCompanyWebsiteMedia = [...websiteMediaBySection.values()]
  .filter((item) => !deletedWebsiteMediaKeys.includes(item.sectionKey || item.id))
  .map((item, index) =>
    tagRecord(normalizeWebsiteMedia(withoutCompanyFields(item), index), DEFAULT_COMPANY_ID),
  );
const nonDefaultWebsiteMedia = normalizeTenantRecords(
  persistedWebsiteMedia.filter((item) => inputCompanyId(item) !== DEFAULT_COMPANY_ID),
  [],
  normalizeWebsiteMedia,
);
export const websiteMedia = [...defaultCompanyWebsiteMedia, ...nonDefaultWebsiteMedia];
const legacyHiddenWebsiteMediaKeys = deletedWebsiteMediaKeys.map((sectionKey) => ({
  id: `hidden-media-${DEFAULT_COMPANY_ID}-${sectionKey}`,
  company_id: DEFAULT_COMPANY_ID,
  sectionKey,
}));
export const websiteMediaHiddenKeys = normalizeTenantRecords(
  persisted?.websiteMediaHiddenKeys,
  legacyHiddenWebsiteMediaKeys,
  (item, index) => ({
    ...item,
    id: item.id || `hidden-media-${index}-${Date.now()}`,
    sectionKey: item.sectionKey || item.section_key || "",
    createdAt: item.createdAt || item.created_at || new Date().toISOString(),
    updatedAt: item.updatedAt || item.updated_at || new Date().toISOString(),
  }),
).filter((item) => item.sectionKey);
export const websiteTexts = normalizeTenantRecords(
  persisted?.websiteTexts,
  [],
  (item, index) => ({
    ...item,
    id: item.id || `website-text-${index}-${Date.now()}`,
    key: item.key || item.text_key || `text_${index}`,
    group: item.group || item.group_key || "general",
    label: item.label || "",
    valueEn: item.valueEn || item.value?.en || item.value_en || "",
    valueAr: item.valueAr || item.value?.ar || item.value_ar || "",
    valueHe: item.valueHe || item.value?.he || item.value_he || "",
    isActive: item.isActive !== false,
    sortOrder: Number(item.sortOrder ?? item.sort_order ?? 0),
    createdAt: item.createdAt || item.created_at || new Date().toISOString(),
    updatedAt: item.updatedAt || item.updated_at || new Date().toISOString(),
    deletedAt: item.deletedAt || item.deleted_at || null,
  }),
);
export const customAdminModules = normalizeTenantRecords(
  persisted?.customAdminModules,
  [],
  normalizeCustomAdminModule,
);
export const customAdminModuleEntries = normalizeTenantRecords(
  persisted?.customAdminModuleEntries,
  [],
  normalizeCustomAdminModuleEntry,
);
export const companyProductSchemas = normalizeTenantRecords(
  persisted?.companyProductSchemas,
  [],
  normalizeCompanyProductSchema,
);

export const invoices = normalizeTenantRecords(
  persisted?.invoices,
  [],
  (inv) => inv,
);

export const deliveryZones = normalizeTenantRecords(
  persisted?.deliveryZones,
  [],
  (z) => z,
);

export const automaticDiscounts = normalizeTenantRecords(
  persisted?.automaticDiscounts,
  [],
  normalizeAutomaticDiscountRecord,
);

export const coupons = normalizeTenantRecords(
  persisted?.coupons,
  [],
  normalizeCouponRecord,
);

export const productBundles = normalizeTenantRecords(
  persisted?.productBundles,
  [],
  normalizeProductBundleRecord,
);

export const productBundleItems = normalizeTenantRecords(
  persisted?.productBundleItems,
  [],
  normalizeProductBundleItemRecord,
);

export const activityLogs = normalizeTenantRecords(
  persisted?.activityLogs,
  [],
  (log) => log,
);

export const productRelations = normalizeTenantRecords(
  persisted?.productRelations,
  [],
  (row) => normalizeRelationRow(row),
);

export const productDisplayModes = normalizeTenantRecords(
  persisted?.productDisplayModes,
  [],
  (row) => normalizeDisplayModeRow(row),
);

export const productDisplayPositions = normalizeTenantRecords(
  persisted?.productDisplayPositions,
  [],
  (row) => normalizeDisplayPositionRow(row),
);

export const searchEvents = normalizeTenantRecords(
  persisted?.searchEvents,
  [],
  (event) => event,
);

export const searchRedirects = normalizeTenantRecords(
  persisted?.searchRedirects,
  [],
  (redirect) => redirect,
);

export const visitorSessions = normalizeTenantRecords(
  persisted?.visitorSessions,
  [],
  (session) => session,
);

export const visitorEvents = normalizeTenantRecords(
  persisted?.visitorEvents,
  [],
  (event) => event,
);
export const inboxConversations = normalizeTenantRecords(
  persisted?.inboxConversations,
  [],
  (conversation) => conversation,
);
export const inboxMessages = normalizeTenantRecords(
  persisted?.inboxMessages,
  [],
  (message) => message,
);
export const smsLogs = normalizeTenantRecords(persisted?.smsLogs, [], (entry) => entry);
export const smsAutomations = normalizeTenantRecords(persisted?.smsAutomations, [], (entry) => entry);
export const smsProviders = normalizeTenantRecords(persisted?.smsProviders, [], (entry) => entry);
export const announcements = normalizeTenantRecords(persisted?.announcements, [], (entry) => entry);
export const splashAds = normalizeTenantRecords(persisted?.splashAds, [], (entry) => entry);
export const splashAdEvents = normalizeTenantRecords(persisted?.splashAdEvents, [], (entry) => entry);
export const storePolicies = normalizeTenantRecords(persisted?.storePolicies, [], (entry) => entry);
export const legalInformation = normalizeTenantRecords(persisted?.legalInformation, [], (entry) => entry);
export const loginHistory = normalizeTenantRecords(persisted?.loginHistory, [], (entry) => entry);
export const loginSecurity = normalizeTenantRecords(persisted?.loginSecurity, [], (entry) => entry);
export const ipBlocks = normalizeTenantRecords(persisted?.ipBlocks, [], (entry) => entry);
export const ipSecurity = normalizeTenantRecords(persisted?.ipSecurity, [], (entry) => entry);
export const companySites = normalizeTenantRecords(
  persisted?.companySites,
  [],
  (site) => ({
    ...site,
    id: site.id || `site-${crypto.randomUUID()}`,
    slug: String(site.slug || "").trim().toLowerCase(),
    name: String(site.name || "").trim(),
    status: ["active", "draft", "archived"].includes(site.status) ? site.status : "active",
    defaultLocale: site.defaultLocale || site.default_locale || "en",
    settings: site.settings && typeof site.settings === "object" && !Array.isArray(site.settings)
      ? clone(site.settings)
      : {},
    createdAt: site.createdAt || site.created_at || new Date().toISOString(),
    updatedAt: site.updatedAt || site.updated_at || new Date().toISOString(),
  }),
);
export const inboxConversationReads = normalizeTenantRecords(
  persisted?.inboxConversationReads,
  [],
  (read) => ({
    ...read,
    id: read.id || `${read.conversationId || read.conversation_id}:${read.userId || read.user_id}`,
    conversationId: read.conversationId || read.conversation_id,
    userId: read.userId || read.user_id,
    lastReadAt: read.lastReadAt || read.last_read_at,
  }),
);

class TenantRepository {
  constructor(collection, idKey = "id") {
    this.collection = collection;
    this.idKey = idKey;
  }

  getByCompany(companyId) {
    if (companyId == null) return [];
    const normalized = normalizeCompanyId(companyId);
    return this.collection.filter((record) => getRecordCompanyId(record) === normalized);
  }

  findByCompany(companyId, predicateOrId) {
    const predicate =
      typeof predicateOrId === "function"
        ? predicateOrId
        : (record) => record?.[this.idKey] === predicateOrId;
    return this.getByCompany(companyId).find(predicate) || null;
  }

  createForCompany(companyId, record, options = {}) {
    tagRecord(record, companyId);
    if (options.prepend) this.collection.unshift(record);
    else this.collection.push(record);
    return record;
  }

  updateForCompany(companyId, id, update) {
    const normalized = normalizeCompanyId(companyId);
    const index = this.collection.findIndex(
      (record) => getRecordCompanyId(record) === normalized && record?.[this.idKey] === id,
    );
    if (index === -1) return null;

    const current = this.collection[index];
    const next = typeof update === "function" ? update(current) : { ...current, ...update };
    tagRecord(next, normalized);
    this.collection[index] = next;
    return next;
  }

  deleteForCompany(companyId, id) {
    const normalized = normalizeCompanyId(companyId);
    const index = this.collection.findIndex(
      (record) => getRecordCompanyId(record) === normalized && record?.[this.idKey] === id,
    );
    if (index === -1) return null;
    return this.collection.splice(index, 1)[0];
  }
}

class MembershipBackedUserRepository extends TenantRepository {
  activeMembershipsForCompany(companyId) {
    const normalized = normalizeCompanyId(companyId);
    return companyMemberships.filter(
      (membership) => membership.companyId === normalized && membership.status === "active",
    );
  }

  allMembershipsForCompany(companyId) {
    const normalized = normalizeCompanyId(companyId);
    return companyMemberships.filter(
      (membership) => membership.companyId === normalized,
    );
  }

  membershipsForCompany(companyId, options = {}) {
    return options.includeInactive
      ? this.allMembershipsForCompany(companyId)
      : this.activeMembershipsForCompany(companyId);
  }

  getByCompany(companyId, options = {}) {
    const usersById = new Map(this.collection.map((user) => [user.id, user]));
    return this.membershipsForCompany(companyId, options)
      .map((membership) => {
        const user = usersById.get(membership.userId);
        if (!user || user.role === "super_admin") return null;
        if (user.isActive === false && !options.includeInactive) return null;
        return this.projectTenantUser(user, membership);
      })
      .filter(Boolean);
  }

  projectTenantUser(user, membership) {
    return {
      ...clone(user),
      globalRole: user.role,
      globalPermissions: clone(user.permissions || []),
      role: membership.role,
      permissions: clone(membership._permissions || []),
      companyId: membership.companyId,
      membershipId: membership.id,
      membershipRole: membership.role,
      isActive: user.isActive !== false && membership.status === "active",
    };
  }

  findByCompany(companyId, predicateOrId, options = {}) {
    const predicate =
      typeof predicateOrId === "function"
        ? predicateOrId
        : (record) => record?.[this.idKey] === predicateOrId;
    return this.getByCompany(companyId, options).find(predicate) || null;
  }

  createForCompany(companyId, record, options = {}) {
    const normalized = normalizeCompanyId(companyId);
    const requestedId = String(options.requestedId || record?.id || "").trim();
    const normalizedEmail = String(record?.email || "").trim().toLowerCase();
    if (requestedId && this.collection.some((entry) => entry.id === requestedId)) {
      throw membershipRepositoryError(
        "This global user identity already exists; use the platform membership workflow.",
        409,
      );
    }
    if (normalizedEmail && this.collection.some(
      (entry) => String(entry.email || "").trim().toLowerCase() === normalizedEmail,
    )) {
      throw membershipRepositoryError(
        "This email already belongs to a global user; use the platform membership workflow.",
        409,
      );
    }
    const user = normalizeUser(withoutCompanyFields({
      ...record,
      id: String(record?.id || "").trim() || `user-${crypto.randomUUID()}`,
      email: normalizedEmail,
    }));
    this.collection.push(user);
    const membershipId = `${normalized}:${user.id}`;
    const membership = normalizeMembership({
      id: membershipId,
      companyId: normalized,
      userId: user.id,
      role: membershipRoleForUser(user),
      _permissions: clone(record.permissions || []),
      status: "active",
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
    companyMemberships.push(membership);
    return this.projectTenantUser(user, membership);
  }

  updateForCompany(companyId, id, update, options = {}) {
    const current = this.findByCompany(companyId, id, options);
    if (!current) return null;
    const normalized = normalizeCompanyId(companyId);
    const index = this.collection.findIndex((user) => user.id === id);
    const membershipIndex = companyMemberships.findIndex(
      (membership) => membership.companyId === normalized && membership.userId === id,
    );
    if (membershipIndex < 0) return null;
    const next = typeof update === "function" ? update(current) : { ...current, ...update };
    const nextEmail = String(next.email || "").trim().toLowerCase();
    if (nextEmail && this.collection.some(
      (user) => user.id !== id && String(user.email || "").trim().toLowerCase() === nextEmail,
    )) {
      throw membershipRepositoryError("This email already belongs to another global user.", 409);
    }
    const {
      role: _tenantRole,
      permissions: _tenantPermissions,
      globalRole: _globalRole,
      globalPermissions: _globalPermissions,
      membershipId: _membershipId,
      membershipRole: _membershipRole,
      isActive: _tenantActive,
      ...identityFields
    } = withoutCompanyFields(next);
    const globalUser = normalizeUser({
      ...this.collection[index],
      ...identityFields,
      email: nextEmail,
      role: this.collection[index].role,
      permissions: this.collection[index].permissions,
      isActive: this.collection[index].isActive,
    });
    // touchMembership defaults to true so role/permission/status changes keep
    // revoking existing sessions (membership.updatedAt drives the JWT
    // membershipVersion). Pass { touchMembership: false } for writes that only
    // mutate global user fields (favorites/addresses/profile) so the current
    // access token stays valid without re-login.
    const touchMembership = options.touchMembership !== false;
    const membership = normalizeMembership({
      ...companyMemberships[membershipIndex],
      role: next.role || companyMemberships[membershipIndex].role,
      _permissions: clone(next.permissions || []),
      status: next.isActive === false ? "inactive" : "active",
      updatedAt: touchMembership
        ? new Date().toISOString()
        : companyMemberships[membershipIndex].updatedAt,
    });
    this.collection[index] = globalUser;
    companyMemberships[membershipIndex] = membership;
    return this.projectTenantUser(globalUser, membership);
  }

  deleteForCompany(companyId, id, options = {}) {
    const normalized = normalizeCompanyId(companyId);
    const current = this.findByCompany(normalized, id, options);
    if (!current) return null;
    for (let index = companyMemberships.length - 1; index >= 0; index -= 1) {
      const membership = companyMemberships[index];
      if (membership.companyId === normalized && membership.userId === id) {
        companyMemberships.splice(index, 1);
      }
    }
    return current;
  }

  deleteGlobal(id) {
    const index = this.collection.findIndex((user) => user.id === id);
    return index >= 0 ? this.collection.splice(index, 1)[0] : null;
  }

  createGlobal(record) {
    const existing = this.collection.find((user) => user.id === record.id);
    if (existing) return existing;
    const user = normalizeUser(withoutCompanyFields(record));
    this.collection.push(user);
    return user;
  }
}

class CategoryRepository extends TenantRepository {
  countChildReferences(companyId, categoryId) {
    return this.getByCompany(companyId).filter((category) => category.parentId === categoryId).length;
  }

  countProductReferences(companyId, category) {
    const legacyNames = new Set([
      category.slug,
      category.name?.en,
      category.name?.ar,
    ].filter(Boolean).map((value) => String(value).trim().toLowerCase()));
    return productRepository.getByCompany(companyId).filter((product) => {
      const referenceId = product.categoryId || product.category_id;
      if (referenceId) return referenceId === category.id;
      const legacy = typeof product.category === "object"
        ? [product.category.en, product.category.ar]
        : [product.category, product.categoryAr, product.category_ar];
      return legacy.some((value) => legacyNames.has(String(value || "").trim().toLowerCase()));
    }).length;
  }
}

class BrandRepository extends TenantRepository {
  countProductReferences(companyId, brand) {
    const name = brand?.name;
    const names = name && typeof name === "object" && !Array.isArray(name)
      ? [name.en, name.ar]
      : [name];
    const legacyNames = new Set([brand.slug, ...names]
      .filter(Boolean)
      .map((value) => String(value).trim().toLowerCase()));
    return productRepository.getByCompany(companyId).filter((product) => {
      const referenceId = product.brandId || product.brand_id;
      if (referenceId) return referenceId === brand.id;
      return legacyNames.has(String(product.brand || "").trim().toLowerCase());
    }).length;
  }
}

function cartKey(companyId, userId) {
  return `${normalizeCompanyId(companyId)}:${userId}`;
}

const initialCompanyCarts = persisted?.companyCarts || {
  [DEFAULT_COMPANY_ID]: persisted?.carts || {},
};
Object.entries(initialCompanyCarts).forEach(([companyId, companyCart]) => {
  Object.entries(companyCart || {}).forEach(([userId, items]) => {
    carts.set(cartKey(companyId, userId), items);
  });
});

export const cartRepository = {
  getByCompany(companyId) {
    const prefix = `${normalizeCompanyId(companyId)}:`;
    return [...carts.entries()]
      .filter(([key]) => key.startsWith(prefix))
      .map(([key, items]) => ({ userId: key.slice(prefix.length), items }));
  },
  findByCompany(companyId, userId) {
    return carts.get(cartKey(companyId, userId)) || null;
  },
  createForCompany(companyId, { userId, items = [] }) {
    carts.set(cartKey(companyId, userId), items);
    return items;
  },
  updateForCompany(companyId, userId, items = []) {
    carts.set(cartKey(companyId, userId), items);
    return items;
  },
  deleteForCompany(companyId, userId) {
    return carts.delete(cartKey(companyId, userId));
  },
};

export const userRepository = new MembershipBackedUserRepository(users);

export async function deleteTenantUserMembership(companyId, userId, dependencies = {}) {
  const normalized = normalizeCompanyId(companyId);
  const membershipIndex = companyMemberships.findIndex(
    (membership) => membership.companyId === normalized && membership.userId === userId,
  );
  if (membershipIndex < 0) return null;
  const membership = companyMemberships[membershipIndex];
  const user = users.find((entry) => entry.id === userId) || null;
  if (!user || user.role === "super_admin" || membership.role === "super_admin") {
    throw membershipRepositoryError("Tenant membership cannot be deleted.", 403);
  }
  const projection = userRepository.projectTenantUser(user, membership);

  if (isSupabaseConfigured()) {
    if (!canPersistToSupabase) {
      throw membershipRepositoryError(
        "Supabase persistence is configured but unavailable. Refusing membership deletion.",
        503,
      );
    }
    const deleteRemote = dependencies.deleteRemote || deleteCompanyMembershipFromSupabase;
    const deletedRows = await deleteRemote(normalized, userId, membership.id);
    if (!Array.isArray(deletedRows) || deletedRows.length !== 1) {
      throw membershipRepositoryError("Tenant membership was not deleted.", 409);
    }
    companyMemberships.splice(membershipIndex, 1);
    return projection;
  }

  companyMemberships.splice(membershipIndex, 1);
  try {
    persistLocalMembershipDirectory();
    return projection;
  } catch (error) {
    companyMemberships.splice(membershipIndex, 0, membership);
    throw error;
  }
}

export const orderRepository = new TenantRepository(orders);
export const workSessionRepository = new TenantRepository(workSessions);
export const productRepository = new TenantRepository(productCatalog);

/**
 * Admin Products list page. Prefer Postgres COUNT + LIMIT/OFFSET when configured;
 * memory fallback keeps local/test environments working without loading a second SoT.
 */
export async function listProductsPageForCompany(companyId, filters = {}) {
  const normalized = normalizeCompanyId(companyId);
  if (isSupabaseConfigured()) {
    return listProductsPageFromSupabase(normalized, filters);
  }

  const trashOnly = Boolean(filters.trashOnly);
  const all = productRepository.getByCompany(normalized);
  const scoped = trashOnly ? filterTrashedProducts(all) : filterActiveProducts(all);
  const filtered = filterProductsForAdminList(scoped, filters);
  const sorted = sortProductsBySortOrder(filtered);
  const pageResult = paginateProducts(sorted, filters.page, filters.limit);
  return { ...pageResult, source: "memory" };
}

export async function listProductSortIdsForCompany(companyId) {
  const normalized = normalizeCompanyId(companyId);
  if (isSupabaseConfigured()) {
    return listProductSortIdsFromSupabase(normalized);
  }
  return sortProductsBySortOrder(filterActiveProducts(productRepository.getByCompany(normalized)))
    .map((product) => product.id)
    .filter(Boolean);
}

export async function listInventoryPageForCompany(companyId, filters = {}) {
  const normalized = normalizeCompanyId(companyId);
  if (isSupabaseConfigured()) {
    return listInventoryPageFromSupabase(normalized, filters);
  }

  const all = filterActiveProducts(productRepository.getByCompany(normalized));
  const q = String(filters.q || "").trim().toLowerCase();
  const brand = String(filters.brand || "all");
  const mainCategory = String(filters.mainCategory || "all");
  const stock = String(filters.stock || "all");
  const threshold = Number(filters.lowStockThreshold) || 5;

  function stockTone(product) {
    const qty = inventoryProduct(product).stock;
    if (qty <= 0) return "out";
    if (qty <= threshold) return "low";
    return "in";
  }

  const scoped = all.filter((product) => {
    const haystack = [
      typeof product.name === "object" ? `${product.name?.en || ""} ${product.name?.ar || ""}` : product.name,
      product.sku,
      product.id,
      product.slug,
      ...(Array.isArray(product.variants) ? product.variants.map((variant) => variant?.sku) : []),
    ].join(" ").toLowerCase();
    if (q && !haystack.includes(q)) return false;
    if (brand !== "all" && String(product.brandId || "") !== brand) return false;
    if (mainCategory !== "all" && String(product.mainCategoryId || "") !== mainCategory) return false;
    return true;
  });

  const summary = scoped.reduce((acc, product) => {
    const tone = stockTone(product);
    acc[tone] += 1;
    return acc;
  }, { in: 0, low: 0, out: 0 });

  const listed = stock === "all" ? scoped : scoped.filter((product) => stockTone(product) === stock);
  const sorted = sortProductsBySortOrder(listed);
  const pageResult = paginateProducts(sorted, filters.page, filters.limit);
  return {
    ...pageResult,
    summary: {
      total: scoped.length,
      in: summary.in,
      low: summary.low,
      out: summary.out,
    },
    source: "memory",
  };
}

/**
 * T2 #8 — products backing inventory valuation, single batched fetch.
 * Memory path reuses the tenant repository (no second SoT, no per-product queries).
 */
export async function listProductsForValuation(companyId, filters = {}) {
  const normalized = normalizeCompanyId(companyId);
  if (isSupabaseConfigured()) {
    return listProductsForValuationFromSupabase(normalized, filters);
  }
  return filterActiveProducts(productRepository.getByCompany(normalized));
}
export const productRelationRepository = new TenantRepository(productRelations);
export const productDisplayModeRepository = new TenantRepository(productDisplayModes);
export const productDisplayPositionRepository = new TenantRepository(productDisplayPositions);
export const offerRepository = new TenantRepository(offers);
export const categoryCardRepository = new TenantRepository(categoryCards, "key");
export const categoryRepository = new CategoryRepository(categories);
export const brandRepository = new BrandRepository(brands);
export const reviewRepository = new TenantRepository(reviews);
export const websiteMediaRepository = new TenantRepository(websiteMedia);
export const websiteMediaHiddenKeysRepository = new TenantRepository(websiteMediaHiddenKeys);
export const websiteTextsRepository = new TenantRepository(websiteTexts);
export const customAdminModuleRepository = new TenantRepository(customAdminModules);
export const customAdminModuleEntryRepository = new TenantRepository(customAdminModuleEntries);
export const companyProductSchemaRepository = new TenantRepository(companyProductSchemas);
export const invoiceRepository = new TenantRepository(invoices);
export const deliveryZoneRepository = new TenantRepository(deliveryZones);
export const automaticDiscountRepository = new TenantRepository(automaticDiscounts);
export const couponRepository = new TenantRepository(coupons);
export const productBundleRepository = new TenantRepository(productBundles);
export const productBundleItemRepository = new TenantRepository(productBundleItems);
export const activityLogRepository = new TenantRepository(activityLogs);
export const searchEventRepository = new TenantRepository(searchEvents);
export const searchRedirectRepository = new TenantRepository(searchRedirects);
export const visitorSessionRepository = new TenantRepository(visitorSessions);
export const visitorEventRepository = new TenantRepository(visitorEvents);
export const smsLogRepository = new TenantRepository(smsLogs);
export const smsAutomationRepository = new TenantRepository(smsAutomations);
export const smsProviderRepository = new TenantRepository(smsProviders);
export const announcementRepository = new TenantRepository(announcements);
export const splashAdRepository = new TenantRepository(splashAds);
export const splashAdEventRepository = new TenantRepository(splashAdEvents);
export const storePolicyRepository = new TenantRepository(storePolicies);
export const legalInformationRepository = new TenantRepository(legalInformation);
export const loginHistoryRepository = new TenantRepository(loginHistory);
export const loginSecurityRepository = new TenantRepository(loginSecurity);
export const ipBlockRepository = new TenantRepository(ipBlocks);
export const ipSecurityRepository = new TenantRepository(ipSecurity);
export const companySiteRepository = new TenantRepository(companySites);
export const inboxConversationRepository = new TenantRepository(inboxConversations);
export const inboxMessageRepository = Object.freeze({
  getByCompany(companyId) {
    return new TenantRepository(inboxMessages).getByCompany(companyId);
  },
  findByCompany(companyId, id) {
    return new TenantRepository(inboxMessages).findByCompany(companyId, id);
  },
  listForConversation(companyId, conversationId) {
    return this.getByCompany(companyId)
      .filter((message) => message.conversationId === conversationId)
      .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)) || a.id.localeCompare(b.id));
  },
  appendForCompany(companyId, message) {
    return new TenantRepository(inboxMessages).createForCompany(companyId, message);
  },
});
export const inboxConversationReadRepository = Object.freeze({
  getByCompany(companyId) {
    return new TenantRepository(inboxConversationReads).getByCompany(companyId);
  },
  findForUser(companyId, conversationId, userId) {
    return this.getByCompany(companyId).find(
      (read) => read.conversationId === conversationId && read.userId === userId,
    ) || null;
  },
  markRead(companyId, conversationId, userId, lastReadAt) {
    const current = this.findForUser(companyId, conversationId, userId);
    if (current) {
      current.lastReadAt = lastReadAt;
      return current;
    }
    return new TenantRepository(inboxConversationReads).createForCompany(companyId, {
      id: `${conversationId}:${userId}`,
      conversationId,
      userId,
      lastReadAt,
    });
  },
});

export function captureInboxMutationState(companyId) {
  const normalized = normalizeCompanyId(companyId);
  return {
    companyId: normalized,
    conversations: clone(inboxConversationRepository.getByCompany(normalized)),
    messages: clone(inboxMessageRepository.getByCompany(normalized)),
    reads: clone(inboxConversationReadRepository.getByCompany(normalized)),
  };
}

function restoreInboxCollection(collection, companyId, records) {
  for (let index = collection.length - 1; index >= 0; index -= 1) {
    if (getRecordCompanyId(collection[index]) === companyId) collection.splice(index, 1);
  }
  for (const record of records) collection.push(tagRecord(record, companyId));
}

export async function persistInboxMutation(companyId, checkpoint) {
  const normalized = normalizeCompanyId(companyId);
  if (!checkpoint || checkpoint.companyId !== normalized) {
    throw new Error("A matching Inbox mutation checkpoint is required.");
  }
  try {
    if (isSupabaseConfigured()) {
      if (!canPersistToSupabase) {
        throw new Error("PostgreSQL Inbox persistence is configured but unavailable.");
      }
      const snapshot = currentStoreSnapshot(normalized);
      return await saveInboxStateToSupabase(snapshot, normalized);
    }
    return await persistCompanyStore(normalized);
  } catch (error) {
    restoreInboxCollection(inboxConversations, normalized, checkpoint.conversations);
    restoreInboxCollection(inboxMessages, normalized, checkpoint.messages);
    restoreInboxCollection(inboxConversationReads, normalized, checkpoint.reads);
    throw error;
  }
}

async function persistInMemoryCatalog(companyId) {
  await persistCompanyStore(normalizeCompanyId(companyId));
}

export const tenantCategoryRepository = {
  async listByCompany(companyId) {
    return isSupabaseConfigured()
      ? listCategoriesByCompanyFromSupabase(companyId)
      : categoryRepository.getByCompany(companyId)
        .slice().sort((a, b) => a.sortOrder - b.sortOrder || a.slug.localeCompare(b.slug));
  },
  async findByCompany(companyId, id) {
    return isSupabaseConfigured()
      ? findCategoryByCompanyFromSupabase(companyId, id)
      : categoryRepository.findByCompany(companyId, id);
  },
  async findBySlugForCompany(companyId, slug) {
    return isSupabaseConfigured()
      ? findCategoryBySlugFromSupabase(companyId, slug)
      : categoryRepository.findByCompany(companyId, (entry) => entry.slug === slug);
  },
  async createForCompany(companyId, data) {
    if (isSupabaseConfigured()) return createCategoryWithTenantLockInSupabase(companyId, data);
    const created = categoryRepository.createForCompany(companyId, data);
    try {
      await persistInMemoryCatalog(companyId);
    } catch (error) {
      categoryRepository.deleteForCompany(companyId, created.id);
      throw error;
    }
    return created;
  },
  async updateForCompany(companyId, id, patch) {
    if (isSupabaseConfigured()) return updateCategoryWithTenantLockInSupabase(companyId, id, patch);
    const previous = categoryRepository.findByCompany(companyId, id);
    const updated = categoryRepository.updateForCompany(companyId, id, patch);
    if (updated) {
      try {
        await persistInMemoryCatalog(companyId);
      } catch (error) {
        categoryRepository.updateForCompany(companyId, id, previous);
        throw error;
      }
    }
    return updated;
  },
  async updateStatusForCompany(companyId, id, isActive) {
    if (isSupabaseConfigured()) return updateCategoryStatusForCompanyInSupabase(companyId, id, isActive);
    return this.updateForCompany(companyId, id, { isActive, updatedAt: new Date().toISOString() });
  },
  async deleteForCompany(companyId, id) {
    if (isSupabaseConfigured()) return deleteCategoryWithTenantLockInSupabase(companyId, id);
    const removed = categoryRepository.deleteForCompany(companyId, id);
    if (removed) {
      try {
        await persistInMemoryCatalog(companyId);
      } catch (error) {
        categoryRepository.createForCompany(companyId, removed);
        throw error;
      }
    }
    return removed;
  },
  async countChildrenForCompany(companyId, id) {
    return isSupabaseConfigured()
      ? countCategoryChildrenFromSupabase(companyId, id)
      : categoryRepository.countChildReferences(companyId, id);
  },
  async countProductReferencesForCompany(companyId, id) {
    const category = await this.findByCompany(companyId, id);
    if (!category) return 0;
    return isSupabaseConfigured()
      ? countCategoryProductReferencesFromSupabase(companyId, category)
      : categoryRepository.countProductReferences(companyId, category);
  },
  async validateParentForCompany(companyId, parentId) {
    return parentId ? this.findByCompany(companyId, parentId) : null;
  },
  async parentWouldCycle(companyId, categoryId, parentId) {
    if (isSupabaseConfigured()) {
      return categoryParentWouldCycleInSupabase(companyId, categoryId, parentId);
    }
    const seen = new Set(categoryId ? [categoryId] : []);
    let cursor = parentId ? categoryRepository.findByCompany(companyId, parentId) : null;
    while (cursor) {
      if (seen.has(cursor.id)) return true;
      seen.add(cursor.id);
      cursor = cursor.parentId ? categoryRepository.findByCompany(companyId, cursor.parentId) : null;
    }
    return false;
  },
};

export const tenantBrandRepository = {
  async listByCompany(companyId) {
    return isSupabaseConfigured()
      ? listBrandsByCompanyFromSupabase(companyId)
      : brandRepository.getByCompany(companyId)
        .slice().sort((a, b) => a.sortOrder - b.sortOrder || a.slug.localeCompare(b.slug));
  },
  async findByCompany(companyId, id) {
    return isSupabaseConfigured()
      ? findBrandByCompanyFromSupabase(companyId, id)
      : brandRepository.findByCompany(companyId, id);
  },
  async findBySlugForCompany(companyId, slug) {
    return isSupabaseConfigured()
      ? findBrandBySlugFromSupabase(companyId, slug)
      : brandRepository.findByCompany(companyId, (entry) => entry.slug === slug);
  },
  async createForCompany(companyId, data) {
    if (isSupabaseConfigured()) return createBrandForCompanyInSupabase(companyId, data);
    const created = brandRepository.createForCompany(companyId, data);
    try {
      await persistInMemoryCatalog(companyId);
    } catch (error) {
      brandRepository.deleteForCompany(companyId, created.id);
      throw error;
    }
    return created;
  },
  async updateForCompany(companyId, id, patch) {
    if (isSupabaseConfigured()) return updateBrandForCompanyInSupabase(companyId, id, patch);
    const previous = brandRepository.findByCompany(companyId, id);
    const updated = brandRepository.updateForCompany(companyId, id, patch);
    if (updated) {
      try {
        await persistInMemoryCatalog(companyId);
      } catch (error) {
        brandRepository.updateForCompany(companyId, id, previous);
        throw error;
      }
    }
    return updated;
  },
  async updateStatusForCompany(companyId, id, isActive) {
    if (isSupabaseConfigured()) return updateBrandStatusForCompanyInSupabase(companyId, id, isActive);
    return this.updateForCompany(companyId, id, { isActive, updatedAt: new Date().toISOString() });
  },
  async deleteForCompany(companyId, id) {
    if (isSupabaseConfigured()) return deleteBrandWithTenantLockInSupabase(companyId, id);
    const removed = brandRepository.deleteForCompany(companyId, id);
    if (removed) {
      try {
        await persistInMemoryCatalog(companyId);
      } catch (error) {
        brandRepository.createForCompany(companyId, removed);
        throw error;
      }
    }
    return removed;
  },
  async countProductReferencesForCompany(companyId, id) {
    const brand = await this.findByCompany(companyId, id);
    if (!brand) return 0;
    return isSupabaseConfigured()
      ? countBrandProductReferencesFromSupabase(companyId, brand)
      : brandRepository.countProductReferences(companyId, brand);
  },
};

export async function saveProductWithTenantCatalogLock(companyId, product, { isCreate = false } = {}) {
  const normalized = normalizeCompanyId(companyId);
  if (isSupabaseConfigured()) {
    const persistedProduct = await saveProductWithTenantCatalogLockInSupabase(normalized, product, { isCreate });
    return isCreate
      ? productRepository.createForCompany(normalized, persistedProduct, { prepend: true })
      : productRepository.updateForCompany(normalized, persistedProduct.id, persistedProduct);
  }
  for (const [field, repository, label] of [
    ["categoryId", categoryRepository, "Category"],
    ["brandId", brandRepository, "Brand"],
  ]) {
    if (!product[field]) continue;
    const reference = repository.findByCompany(normalized, product[field]);
    if (!reference) throw companyRepositoryError(`${label} not found.`, 404);
    if (reference.isActive === false) throw companyRepositoryError(`${label} is inactive.`);
  }
  const previous = productRepository.findByCompany(normalized, product.id);
  const saved = isCreate
    ? productRepository.createForCompany(normalized, product, { prepend: true })
    : productRepository.updateForCompany(normalized, product.id, product);
  try {
    await persistCompanyStore(normalized);
    return saved;
  } catch (error) {
    if (isCreate) productRepository.deleteForCompany(normalized, product.id);
    else if (previous) productRepository.updateForCompany(normalized, product.id, previous);
    throw error;
  }
}

function deleteProductRelationsForProductLocal(companyId, productId) {
  const normalized = normalizeCompanyId(companyId);
  const id = String(productId || "");
  const matching = productRelationRepository.getByCompany(normalized).filter(
    (row) => row.sourceProductId === id || row.targetProductId === id,
  );
  for (const row of matching) {
    productRelationRepository.deleteForCompany(normalized, row.id);
  }
  return matching;
}

export async function deleteProductWithTenantCatalogLock(companyId, id) {
  const normalized = normalizeCompanyId(companyId);
  if (isSupabaseConfigured()) {
    const removed = await deleteProductWithTenantCatalogLockInSupabase(normalized, id);
    if (removed) {
      productRepository.deleteForCompany(normalized, id);
      // Postgres cascades product_relations; keep in-memory mirror consistent.
      deleteProductRelationsForProductLocal(normalized, id);
    }
    return removed;
  }
  const removed = productRepository.deleteForCompany(normalized, id);
  if (!removed) return null;
  const removedRelations = deleteProductRelationsForProductLocal(normalized, id);
  try {
    await persistCompanyStore(normalized, { pruneMissing: true });
    return removed;
  } catch (error) {
    productRepository.createForCompany(normalized, removed);
    for (const row of removedRelations) {
      productRelationRepository.createForCompany(normalized, row);
    }
    throw error;
  }
}

/**
 * Create an order and optionally consume a coupon in the same atomic boundary.
 * Postgres: single tenant write transaction (atomic used_count + order insert).
 * File/memory: sync consume + create with coupon rollback if order creation fails.
 */
export async function createOrderWithOptionalCouponConsumption(
  companyId,
  { order, couponId = null, testHooks = null } = {},
) {
  const normalized = normalizeCompanyId(companyId);
  const couponKey = couponId ? String(couponId) : null;

  if (couponKey && isSupabaseConfigured()) {
    const result = await createOrderConsumingCouponInSupabase(normalized, {
      order,
      couponId: couponKey,
    });
    if (result.coupon) {
      const existing = couponRepository.findByCompany(normalized, couponKey);
      if (existing) {
        couponRepository.updateForCompany(normalized, couponKey, {
          ...existing,
          ...result.coupon,
          usedCount: result.coupon.usedCount,
          updatedAt: result.coupon.updatedAt || new Date().toISOString(),
        });
      } else {
        couponRepository.createForCompany(normalized, result.coupon);
      }
    }
    orderRepository.createForCompany(normalized, order, { prepend: true });
    return result;
  }

  let previousCoupon = null;
  if (couponKey) {
    const current = couponRepository.findByCompany(normalized, couponKey);
    if (!current) {
      const error = new Error("Coupon not found.");
      error.statusCode = 404;
      throw error;
    }
    previousCoupon = { ...current };
    const usageLimit = current.usageLimit == null && current.usage_limit == null
      ? null
      : Math.max(0, Math.floor(Number(current.usageLimit ?? current.usage_limit)));
    const usedCount = Math.max(0, Math.floor(Number(current.usedCount ?? current.used_count ?? 0)));
    if (current.isActive === false || current.is_active === false) {
      const error = new Error("This coupon is inactive.");
      error.statusCode = 400;
      throw error;
    }
    if (usageLimit != null && usedCount >= usageLimit) {
      const error = new Error("This coupon has reached its usage limit.");
      error.statusCode = 400;
      throw error;
    }
    couponRepository.updateForCompany(normalized, couponKey, {
      ...current,
      usedCount: usedCount + 1,
      updatedAt: new Date().toISOString(),
    });
  }

  try {
    if (typeof testHooks?.beforeCreateOrder === "function") {
      await testHooks.beforeCreateOrder({ companyId: normalized, order, couponId: couponKey });
    }
    orderRepository.createForCompany(normalized, order, { prepend: true });
    if (typeof testHooks?.afterCreateOrder === "function") {
      await testHooks.afterCreateOrder({ companyId: normalized, order, couponId: couponKey });
    }
    return {
      order,
      coupon: couponKey ? couponRepository.findByCompany(normalized, couponKey) : null,
    };
  } catch (error) {
    orderRepository.deleteForCompany(normalized, order.id);
    if (previousCoupon) {
      couponRepository.updateForCompany(normalized, couponKey, previousCoupon);
    }
    throw error;
  }
}

/**
 * List relation rows for a source product + type, ordered by sort_order.
 */
export async function listProductRelations(companyId, sourceProductId, type) {
  const normalized = normalizeCompanyId(companyId);
  const sourceId = String(sourceProductId || "");
  if (isSupabaseConfigured()) {
    const rows = await listProductRelationsFromSupabase(normalized, sourceId, type);
    return rows.map(normalizeRelationRow).sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
  }
  return productRelationRepository.getByCompany(normalized)
    .filter((row) => row.sourceProductId === sourceId && row.type === type)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
}

/**
 * All relation rows for a company (bounded catalog helper).
 */
export async function listCompanyProductRelations(companyId) {
  const normalized = normalizeCompanyId(companyId);
  if (isSupabaseConfigured()) {
    const rows = await listAllProductRelationsFromSupabase(normalized);
    return rows.map(normalizeRelationRow);
  }
  return productRelationRepository.getByCompany(normalized)
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
}

/**
 * Atomically replace all relations of a given type for a source product.
 * targetProductIds must already be validated/deduped by the caller.
 */
export async function replaceProductRelations(companyId, sourceProductId, type, targetProductIds) {
  const normalized = normalizeCompanyId(companyId);
  const sourceId = String(sourceProductId || "");
  const now = new Date().toISOString();

  if (isSupabaseConfigured()) {
    const rows = await replaceProductRelationsInSupabase(normalized, sourceId, type, targetProductIds);
    // Mirror into memory for consistency with other catalog collections.
    const existing = productRelationRepository.getByCompany(normalized)
      .filter((row) => row.sourceProductId === sourceId && row.type === type);
    for (const row of existing) {
      productRelationRepository.deleteForCompany(normalized, row.id);
    }
    for (const row of rows) {
      productRelationRepository.createForCompany(normalized, normalizeRelationRow(row));
    }
    return rows.map(normalizeRelationRow);
  }

  const previous = productRelationRepository.getByCompany(normalized)
    .filter((row) => row.sourceProductId === sourceId && row.type === type);
  for (const row of previous) {
    productRelationRepository.deleteForCompany(normalized, row.id);
  }

  const created = targetProductIds.map((targetId, index) => {
    const row = normalizeRelationRow({
      id: crypto.randomUUID(),
      company_id: normalized,
      source_product_id: sourceId,
      target_product_id: targetId,
      type,
      sort_order: index,
      created_at: now,
      updated_at: now,
    });
    return productRelationRepository.createForCompany(normalized, row);
  });

  try {
    await persistCompanyStore(normalized);
    return created;
  } catch (error) {
    for (const row of created) {
      productRelationRepository.deleteForCompany(normalized, row.id);
    }
    for (const row of previous) {
      productRelationRepository.createForCompany(normalized, row);
    }
    throw error;
  }
}

function displayPriorityStoreError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function displayScopeMatches(row, surface, brandId) {
  return row?.surface === surface && (row?.brandId ?? null) === brandId;
}

function normalizeManualProductIdsLocal(productIds) {
  if (productIds === null || productIds === undefined) return [];
  if (!Array.isArray(productIds)) throw displayPriorityStoreError("productIds must be an array.");
  const ids = [];
  for (const value of productIds) {
    const id = String(value ?? "").trim();
    if (!id) throw displayPriorityStoreError("productIds must not contain empty values.");
    if (ids.includes(id)) {
      throw displayPriorityStoreError(`Duplicate manual product id "${id}".`);
    }
    ids.push(id);
  }
  return ids;
}

function buildDisplayConfiguration(companyId, config = {}) {
  const surface = normalizeSurface(config.surface);
  const brandId = config.brandId ? String(config.brandId) : null;
  const orderingKey = normalizeOrderingKey(config.orderingKey ?? null);
  // null selection means "inherit"; an explicit [] means "all eligible
  // products". The two must stay distinct across a save/list round trip.
  const normalizedSelection = normalizeSelection(config.selection ?? null);
  const selectionMatch = normalizedSelection === null
    ? null
    : config.selectionMatch === null || config.selectionMatch === undefined
      ? normalizedSelection.match
      : normalizeMatchMode(config.selectionMatch);

  const productIds = normalizeManualProductIdsLocal(config.productIds);
  if (productIds.length) {
    const owned = new Set(productRepository.getByCompany(companyId).map((product) => String(product.id)));
    if (productIds.some((id) => !owned.has(id))) {
      throw displayPriorityStoreError("Unknown product id.");
    }
  }

  const updatedAt = new Date().toISOString();
  const mode = normalizeDisplayModeRow({
    surface,
    brandId,
    orderingKey,
    selectionMatch,
    selection: normalizedSelection === null ? null : normalizedSelection.rules,
    updated_at: updatedAt,
  });
  const positions = orderingKey === "manual"
    ? productIds.map((productId, index) => normalizeDisplayPositionRow({
      surface,
      brandId,
      product_id: productId,
      position: index,
    }))
    : [];

  return {
    surface,
    brandId,
    orderingKey,
    selectionMatch,
    rules: normalizedSelection === null ? null : normalizedSelection.rules,
    productIds,
    mode,
    positions,
  };
}

function replaceDisplayScopeRows(companyId, mode, positions) {
  for (const row of productDisplayModeRepository.getByCompany(companyId)) {
    if (displayScopeMatches(row, mode.surface, mode.brandId)) {
      productDisplayModeRepository.deleteForCompany(companyId, row.id);
    }
  }
  for (const row of productDisplayPositionRepository.getByCompany(companyId)) {
    if (displayScopeMatches(row, mode.surface, mode.brandId)) {
      productDisplayPositionRepository.deleteForCompany(companyId, row.id);
    }
  }
  productDisplayModeRepository.createForCompany(companyId, mode);
  for (const position of positions) {
    productDisplayPositionRepository.createForCompany(companyId, position);
  }
}

function snapshotDisplayScopeRows(companyId, surface, brandId) {
  return {
    modes: productDisplayModeRepository.getByCompany(companyId)
      .filter((row) => displayScopeMatches(row, surface, brandId)),
    positions: productDisplayPositionRepository.getByCompany(companyId)
      .filter((row) => displayScopeMatches(row, surface, brandId)),
  };
}

function restoreDisplayScopeRows(companyId, surface, brandId, snapshot) {
  for (const row of productDisplayModeRepository.getByCompany(companyId)) {
    if (displayScopeMatches(row, surface, brandId)) {
      productDisplayModeRepository.deleteForCompany(companyId, row.id);
    }
  }
  for (const row of productDisplayPositionRepository.getByCompany(companyId)) {
    if (displayScopeMatches(row, surface, brandId)) {
      productDisplayPositionRepository.deleteForCompany(companyId, row.id);
    }
  }
  for (const row of snapshot.modes) productDisplayModeRepository.createForCompany(companyId, row);
  for (const row of snapshot.positions) productDisplayPositionRepository.createForCompany(companyId, row);
}

/**
 * List stored display configurations for a company (tenant-scoped).
 */
export async function listProductDisplayModes(companyId) {
  const normalized = normalizeCompanyId(companyId);
  if (isSupabaseConfigured()) {
    const rows = await listProductDisplayModesFromSupabase(normalized);
    return rows.map((row) => normalizeDisplayModeRow(row));
  }
  return productDisplayModeRepository.getByCompany(normalized);
}

/**
 * List manual position rows for a company, optionally for one scope.
 * Position rows store product ids only, and exist only for `manual`.
 */
export async function listProductDisplayPositions(companyId, options = {}) {
  const normalized = normalizeCompanyId(companyId);
  if (isSupabaseConfigured()) {
    const rows = await listProductDisplayOrderFromSupabase(normalized, options);
    return rows.map((row) => normalizeDisplayPositionRow(row));
  }
  const brandFilter = Object.prototype.hasOwnProperty.call(options, "brandId")
    ? (options.brandId ? String(options.brandId) : null)
    : undefined;
  return productDisplayPositionRepository.getByCompany(normalized).filter((row) => {
    if (options.surface && row.surface !== normalizeSurface(options.surface)) return false;
    if (brandFilter !== undefined && (row.brandId ?? null) !== brandFilter) return false;
    return true;
  });
}

/**
 * Save one configuration (and its manual positions) under the tenant catalog
 * write lock. Every query includes company_id. Product fields are not copied.
 */
export async function saveProductDisplayConfiguration(companyId, config = {}) {
  const normalized = normalizeCompanyId(companyId);
  const built = buildDisplayConfiguration(normalized, config);

  if (isSupabaseConfigured()) {
    const saved = await saveProductDisplayConfigurationInSupabase(normalized, {
      surface: built.surface,
      brandId: built.brandId,
      orderingKey: built.orderingKey,
      selectionMatch: built.selectionMatch,
      selection: built.rules,
      productIds: built.productIds,
    });
    const mode = normalizeDisplayModeRow(saved.mode);
    const positions = (saved.positions || []).map((row) => normalizeDisplayPositionRow(row));
    // Mirror into memory for consistency with other catalog collections.
    replaceDisplayScopeRows(normalized, mode, positions);
    return { mode, positions };
  }

  const previous = snapshotDisplayScopeRows(normalized, built.surface, built.brandId);
  replaceDisplayScopeRows(normalized, built.mode, built.positions);
  try {
    await persistCompanyStore(normalized);
    return { mode: built.mode, positions: built.positions };
  } catch (error) {
    restoreDisplayScopeRows(normalized, built.surface, built.brandId, previous);
    throw error;
  }
}

/**
 * Remove one configuration scope so the next read inherits again.
 */
export async function deleteProductDisplayConfiguration(companyId, surface, brandId = null) {
  const normalized = normalizeCompanyId(companyId);
  const resolvedSurface = normalizeSurface(surface);
  const resolvedBrandId = brandId ? String(brandId) : null;

  if (isSupabaseConfigured()) {
    const result = await deleteProductDisplayConfigurationInSupabase(
      normalized,
      resolvedSurface,
      resolvedBrandId,
    );
    restoreDisplayScopeRows(normalized, resolvedSurface, resolvedBrandId, { modes: [], positions: [] });
    return result;
  }

  const previous = snapshotDisplayScopeRows(normalized, resolvedSurface, resolvedBrandId);
  restoreDisplayScopeRows(normalized, resolvedSurface, resolvedBrandId, { modes: [], positions: [] });
  try {
    await persistCompanyStore(normalized);
    return {
      deleted: previous.modes.length > 0,
      surface: resolvedSurface,
      brandId: resolvedBrandId,
    };
  } catch (error) {
    restoreDisplayScopeRows(normalized, resolvedSurface, resolvedBrandId, previous);
    throw error;
  }
}

export async function trashProductWithTenantCatalogLock(companyId, id) {
  const normalized = normalizeCompanyId(companyId);
  if (isSupabaseConfigured()) {
    const trashed = await trashProductWithTenantCatalogLockInSupabase(normalized, id);
    if (trashed) {
      productRepository.updateForCompany(normalized, id, trashed)
        || productRepository.createForCompany(normalized, trashed);
    }
    return trashed;
  }
  const existing = productRepository.findByCompany(normalized, id);
  if (!existing) return null;
  if (existing.deletedAt || existing.deleted_at) return existing;
  const now = new Date().toISOString();
  const trashed = {
    ...existing,
    deletedAt: now,
    deleted_at: now,
    updatedAt: now,
  };
  productRepository.updateForCompany(normalized, id, trashed);
  try {
    await persistCompanyStore(normalized);
    return trashed;
  } catch (error) {
    productRepository.updateForCompany(normalized, id, existing);
    throw error;
  }
}

export async function restoreProductWithTenantCatalogLock(companyId, id) {
  const normalized = normalizeCompanyId(companyId);
  if (isSupabaseConfigured()) {
    const restored = await restoreProductWithTenantCatalogLockInSupabase(normalized, id);
    if (restored) {
      productRepository.updateForCompany(normalized, id, restored)
        || productRepository.createForCompany(normalized, restored);
    }
    return restored;
  }
  const existing = productRepository.findByCompany(normalized, id);
  if (!existing) return null;
  const { deletedAt: _deletedAt, deleted_at: _deletedAtSnake, ...rest } = existing;
  const restored = {
    ...rest,
    deletedAt: null,
    deleted_at: null,
    updatedAt: new Date().toISOString(),
  };
  productRepository.updateForCompany(normalized, id, restored);
  try {
    await persistCompanyStore(normalized);
    return restored;
  } catch (error) {
    productRepository.updateForCompany(normalized, id, existing);
    throw error;
  }
}

/**
 * Batch-update product.sortOrder for the current tenant (Phase C).
 * Postgres path uses a single company-locked transaction; file-store path
 * updates memory then persists once, restoring previous values on failure.
 */
export async function reorderProductsWithTenantCatalogLock(companyId, productIds) {
  const normalized = normalizeCompanyId(companyId);
  const { buildReorderPatches } = await import("../products/reorderProducts.js");

  if (isSupabaseConfigured()) {
    const patches = await reorderProductsWithTenantCatalogLockInSupabase(normalized, productIds);
    const updated = [];
    for (const patch of patches) {
      const current = productRepository.findByCompany(normalized, patch.id);
      if (!current) continue;
      updated.push(productRepository.updateForCompany(normalized, patch.id, {
        ...current,
        sortOrder: patch.sortOrder,
        updatedAt: new Date().toISOString(),
      }));
    }
    return { patches, products: updated };
  }

  const productsById = new Map(
    productRepository.getByCompany(normalized).map((product) => [product.id, product]),
  );
  for (const id of productIds) {
    const product = productsById.get(id);
    if (!product) {
      const error = new Error("One or more product IDs are invalid or do not belong to this company.");
      error.statusCode = 400;
      throw error;
    }
    if (product.deletedAt || product.deleted_at) {
      const error = new Error("One or more product IDs are in trash and cannot be reordered.");
      error.statusCode = 400;
      throw error;
    }
  }
  const patches = buildReorderPatches(productsById, productIds);
  const previousById = new Map(
    patches.map((patch) => [patch.id, { ...productsById.get(patch.id) }]),
  );

  for (const patch of patches) {
    productRepository.updateForCompany(normalized, patch.id, patch.product);
  }

  try {
    await persistCompanyStore(normalized);
    return {
      patches,
      products: patches.map((patch) => productRepository.findByCompany(normalized, patch.id)),
    };
  } catch (error) {
    for (const [id, previous] of previousById) {
      productRepository.updateForCompany(normalized, id, previous);
    }
    throw error;
  }
}

export async function persistActivityLogEntry(companyId, log) {
  if (isSupabaseConfigured()) return saveActivityLogEntryToSupabase(companyId, log);
  return persistCompanyStore(companyId);
}

function platformDirectoryError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function normalizeCategory(category, index = 0) {
  const now = new Date().toISOString();
  const {
    parent_id: _parentId,
    image_url: _imageUrl,
    sort_order: _sortOrder,
    is_active: _isActive,
    created_at: _createdAt,
    updated_at: _updatedAt,
    ...data
  } = category;
  return {
    ...data,
    id: String(category.id || `category-${index}-${Date.now()}`),
    slug: String(category.slug || "").trim().toLowerCase(),
    name: category.name && typeof category.name === "object" ? clone(category.name) : { en: "", ar: "" },
    description: category.description && typeof category.description === "object"
      ? clone(category.description)
      : null,
    parentId: category.parentId || category.parent_id || null,
    brandId: category.brandId || category.brand_id || null,
    imageUrl: category.imageUrl || category.image_url || null,
    heroVideo: category.heroVideo || category.hero_video || null,
    sortOrder: Number(category.sortOrder ?? category.sort_order ?? 0),
    isActive: category.isActive !== false && category.is_active !== false,
    createdAt: category.createdAt || category.created_at || now,
    updatedAt: category.updatedAt || category.updated_at || now,
  };
}

function normalizeBrand(brand, index = 0) {
  const now = new Date().toISOString();
  const {
    logo_url: _logoUrl,
    sort_order: _sortOrder,
    is_active: _isActive,
    created_at: _createdAt,
    updated_at: _updatedAt,
    ...data
  } = brand;
  const rawName = brand.name;
  const name = rawName && typeof rawName === "object" && !Array.isArray(rawName)
    ? rawName
    : String(rawName || "").trim();
  return {
    ...data,
    id: String(brand.id || `brand-${index}-${Date.now()}`),
    slug: String(brand.slug || "").trim().toLowerCase(),
    name,
    logoUrl: brand.logoUrl || brand.logo_url || null,
    heroVideo: brand.heroVideo || brand.hero_video || null,
    heroPoster: brand.heroPoster || brand.hero_poster || null,
    headerImage: brand.headerImage || brand.header_image || null,
    menuImage: brand.menuImage || brand.menu_image || null,
    country: brand.country || null,
    sortOrder: Number(brand.sortOrder ?? brand.sort_order ?? 0),
    isActive: brand.isActive !== false && brand.is_active !== false,
    createdAt: brand.createdAt || brand.created_at || now,
    updatedAt: brand.updatedAt || brand.updated_at || now,
  };
}

function normalizeCustomAdminModule(module, index = 0) {
  const now = new Date().toISOString();
  return {
    ...module,
    id: String(module.id || `custom-module-${index}-${Date.now()}`),
    key: String(module.key || `custom_module_${index}`),
    label: String(module.label || "Custom Module"),
    description: String(module.description || ""),
    icon: String(module.icon || "folder"),
    sidebarOrder: Number(module.sidebarOrder ?? module.sidebar_order ?? 100),
    enabled: module.enabled !== false,
    fieldsSchema: Array.isArray(module.fieldsSchema ?? module.fields_schema)
      ? clone(module.fieldsSchema ?? module.fields_schema)
      : [],
    listConfig: clone(module.listConfig ?? module.list_config ?? {}),
    formConfig: clone(module.formConfig ?? module.form_config ?? {}),
    permissions: clone(module.permissions || {}),
    createdBy: module.createdBy || module.created_by || "",
    updatedBy: module.updatedBy || module.updated_by || "",
    createdAt: module.createdAt || module.created_at || now,
    updatedAt: module.updatedAt || module.updated_at || module.createdAt || now,
  };
}

function normalizeCustomAdminModuleEntry(entry, index = 0) {
  const now = new Date().toISOString();
  return {
    ...entry,
    id: String(entry.id || `custom-entry-${index}-${Date.now()}`),
    moduleId: String(entry.moduleId || entry.module_id || ""),
    data: entry.data && typeof entry.data === "object" && !Array.isArray(entry.data)
      ? clone(entry.data)
      : {},
    status: entry.status === "deleted" ? "deleted" : "active",
    createdBy: entry.createdBy || entry.created_by || "",
    updatedBy: entry.updatedBy || entry.updated_by || "",
    createdAt: entry.createdAt || entry.created_at || now,
    updatedAt: entry.updatedAt || entry.updated_at || entry.createdAt || now,
  };
}

function normalizeCompanyProductSchema(record, index = 0) {
  const now = new Date().toISOString();
  return {
    ...record,
    id: String(record.id || `company-product-schema-${index}`),
    schema: record.schema && typeof record.schema === "object" && !Array.isArray(record.schema)
      ? clone(record.schema)
      : record.schema_json && typeof record.schema_json === "object"
        ? clone(record.schema_json)
        : {},
    createdAt: record.createdAt || record.created_at || now,
    updatedAt: record.updatedAt || record.updated_at || record.createdAt || now,
  };
}

function superAdminProvisioningError(message, code) {
  const error = new Error(message);
  error.code = code;
  error.safeForCli = true;
  return error;
}

export async function provisionSuperAdmin({
  email,
  name,
  passwordHash,
  allowUpdate = false,
}) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail || !isPasswordHash(passwordHash)) {
    throw superAdminProvisioningError(
      "Validated email and hashed password are required.",
      "INVALID_SUPER_ADMIN_INPUT",
    );
  }

  if (isSupabaseConfigured() && !canPersistToSupabase) {
    throw superAdminProvisioningError(
      "Supabase company tables are unavailable. Apply and validate the Phase 1 migration in staging first.",
      "SUPER_ADMIN_SUPABASE_NOT_READY",
    );
  }

  let candidates = new Map(
    users
      .filter((user) => String(user.email || "").trim().toLowerCase() === normalizedEmail)
      .map((user) => [user.id, user]),
  );

  if (isSupabaseConfigured()) {
    const remoteUsers = await findUsersByEmailFromSupabase(normalizedEmail);
    candidates = new Map(remoteUsers.map((user) => [user.id, user]));
  }

  if (candidates.size > 1) {
    throw superAdminProvisioningError(
      "Multiple users have the requested email. Resolve duplicate identities before provisioning.",
      "SUPER_ADMIN_EMAIL_AMBIGUOUS",
    );
  }

  const existing = [...candidates.values()][0] || null;
  if (existing && allowUpdate !== true) {
    throw superAdminProvisioningError(
      "A user with this email already exists. Set SUPER_ADMIN_ALLOW_UPDATE=true to promote and update it.",
      "SUPER_ADMIN_UPDATE_NOT_ALLOWED",
    );
  }

  const now = new Date().toISOString();
  const id = existing?.id || `super-admin-${crypto
    .createHash("sha256")
    .update(normalizedEmail)
    .digest("hex")
    .slice(0, 24)}`;
  const next = normalizeUser({
    ...(existing || {}),
    id,
    name: String(name || "").trim() || existing?.name || "Super Admin",
    email: normalizedEmail,
    password: passwordHash,
    role: "super_admin",
    permissions: existing?.permissions || [],
    isActive: true,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  });

  const repositoryIndex = users.findIndex((user) => user.id === id);
  const repositoryCurrent = repositoryIndex >= 0 ? users[repositoryIndex] : null;
  const previous = repositoryCurrent ? clone(repositoryCurrent) : null;
  if (repositoryIndex >= 0) users[repositoryIndex] = next;
  else userRepository.createGlobal(next);

  try {
    await persistSuperAdminUser(next, existing);
  } catch (error) {
    if (previous) users[repositoryIndex] = previous;
    else userRepository.deleteGlobal(id);
    throw error;
  }

  return {
    created: !existing,
    user: {
      id: next.id,
      email: next.email,
      name: next.name,
      role: next.role,
    },
  };
}

function companyRepositoryError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function companyByIdInternal(id) {
  const normalized = String(id || "").trim().toLowerCase();
  return companies.find((company) => company.id === normalized) || null;
}

function assertUniqueCompanyFields(candidate, currentId = "") {
  const duplicateSlug = companies.find(
    (company) => company.id !== currentId && company.slug === candidate.slug,
  );
  if (duplicateSlug) throw companyRepositoryError("Company slug already exists.", 409);

  if (candidate.domain) {
    const duplicateDomain = companies.find(
      (company) => company.id !== currentId && company.domain === candidate.domain,
    );
    if (duplicateDomain) throw companyRepositoryError("Company domain already exists.", 409);
  }

  if (candidate.storefrontUrl) {
    const duplicateUrl = companies.find(
      (company) => company.id !== currentId && company.storefrontUrl === candidate.storefrontUrl,
    );
    if (duplicateUrl) throw companyRepositoryError("Company storefront URL already exists.", 409);
  }
}

export const companyRepository = {
  listCompanies() {
    return companies.map(serializeCompany);
  },

  getCompanyById(id) {
    const company = companyByIdInternal(id);
    return company ? serializeCompany(company) : null;
  },

  getCompanyBySlug(slug) {
    const normalized = String(slug || "").trim().toLowerCase();
    const company = companies.find((entry) => entry.slug === normalized);
    return company ? serializeCompany(company) : null;
  },

  async createCompanyDraft(input) {
    const slug = String(input?.slug || "").trim().toLowerCase();
    const name = String(input?.name || "").trim();
    const status = input?.status || "draft";
    if (!name) throw companyRepositoryError("Company name is required.");
    if (!isSafeCompanySlug(slug)) throw companyRepositoryError("Company slug is invalid.");
    if (!allowedCompanyStatuses.has(status)) throw companyRepositoryError("Company status is invalid.");
    if (companyByIdInternal(slug)) throw companyRepositoryError("Company ID already exists.", 409);

    const now = new Date().toISOString();
    const company = normalizeCompanyRecord({
      id: slug,
      slug,
      name,
      status,
      isDefault: false,
      domain: normalizeCompanyHost(input?.domain),
      storefrontUrl: input?.storefrontUrl,
      storefrontPath: input?.storefrontPath,
      settings: input?.settings || {},
      createdAt: now,
      updatedAt: now,
    });
    assertUniqueCompanyFields(company);
    companies.push(company);

    try {
      await persistCompanyDirectory(company);
    } catch (error) {
      companies.splice(companies.indexOf(company), 1);
      throw error;
    }

    return serializeCompany(company);
  },

  async updateCompanyDraft(id, changes) {
    const current = companyByIdInternal(id);
    if (!current) throw companyRepositoryError("Company not found.", 404);
    if (changes?.id !== undefined && changes.id !== current.id) {
      throw companyRepositoryError("Company ID cannot be changed.");
    }

    if (current.id === DEFAULT_COMPANY_ID) {
      if (changes?.slug !== undefined && changes.slug !== DEFAULT_COMPANY_ID) {
        throw companyRepositoryError("EB Chemical slug cannot be changed.");
      }
      if (changes?.status !== undefined && changes.status !== "active") {
        throw companyRepositoryError("EB Chemical must remain active.");
      }
      if (
        changes?.domain !== undefined
        && normalizeCompanyHost(changes.domain) !== DEFAULT_COMPANY_DOMAIN
      ) {
        throw companyRepositoryError("EB Chemical domain cannot be changed in this phase.");
      }
      if (changes?.isDefault === false) {
        throw companyRepositoryError("EB Chemical must remain the default company.");
      }
    }

    const replacesDomains = Object.prototype.hasOwnProperty.call(changes || {}, "domain");
    const next = normalizeCompanyRecord({
      ...current,
      ...changes,
      ...(replacesDomains ? { domains: [] } : {}),
      id: current.id,
      isDefault: current.id === DEFAULT_COMPANY_ID,
      updatedAt: new Date().toISOString(),
    });
    if (!next.name) throw companyRepositoryError("Company name cannot be empty.");
    if (!isSafeCompanySlug(next.slug)) throw companyRepositoryError("Company slug is invalid.");
    if (!allowedCompanyStatuses.has(next.status)) throw companyRepositoryError("Company status is invalid.");
    assertUniqueCompanyFields(next, current.id);

    const index = companies.indexOf(current);
    companies[index] = next;
    try {
      await persistCompanyDirectory(next);
    } catch (error) {
      companies[index] = current;
      throw error;
    }

    return serializeCompany(next);
  },

  resolveStorefront(host, path = "/") {
    const company = resolveStorefrontCompany(companies, { host, path });
    return company ? serializeCompany(company) : null;
  },

  isSharedStorefrontHost(host) {
    return isSharedStorefrontHost(companies, host);
  },

  hasResolvableStorefront(id) {
    return hasResolvableStorefront(companyByIdInternal(id));
  },

  async updateCompanyBrandingAndSettings(id, { name, settingsPatch = {} } = {}) {
    const current = companyByIdInternal(id);
    if (!current) throw companyRepositoryError("Company not found.", 404);
    if (isSupabaseConfigured()) {
      const persistedUpdate = await updateCompanyBrandingAndSettingsInSupabase(current.id, {
        ...(name !== undefined ? { name } : {}),
        settingsPatch,
      });
      const next = normalizeCompanyRecord({
        ...current,
        name: persistedUpdate.name,
        settings: persistedUpdate.settings,
        updatedAt: persistedUpdate.updatedAt,
      });
      companies[companies.indexOf(current)] = next;
      return serializeCompany(next);
    }
    const currentSettings = current.settings || {};
    const mergedSettings = { ...currentSettings, ...settingsPatch };
    if (settingsPatch.theme) mergedSettings.theme = { ...(currentSettings.theme || {}), ...settingsPatch.theme };
    if (settingsPatch.socialLinks) {
      mergedSettings.socialLinks = { ...(currentSettings.socialLinks || {}), ...settingsPatch.socialLinks };
    }
    if (settingsPatch.websiteContent) {
      mergedSettings.websiteContent = {
        ...(currentSettings.websiteContent || {}),
        ...settingsPatch.websiteContent,
      };
    }
    return this.updateCompanyDraft(current.id, {
      ...(name !== undefined ? { name } : {}),
      settings: mergedSettings,
    });
  },

  async disableCompany(id) {
    const current = companyByIdInternal(id);
    if (!current) throw companyRepositoryError("Company not found.", 404);
    if (current.id === DEFAULT_COMPANY_ID) {
      throw companyRepositoryError("EB Chemical cannot be disabled.");
    }
    return this.updateCompanyDraft(current.id, { status: "inactive" });
  },

  getWebsiteConnection(id) {
    const current = companyByIdInternal(id);
    if (!current) return null;
    const connection = current.settings?.websiteConnection;
    return connection && typeof connection === "object" && !Array.isArray(connection)
      ? JSON.parse(JSON.stringify(connection))
      : null;
  },

  async updateWebsiteConnection(id, connectionPatch) {
    const current = companyByIdInternal(id);
    if (!current) throw companyRepositoryError("Company not found.", 404);
    const previous = current.settings?.websiteConnection || {};
    const merged = { ...previous, ...connectionPatch };
    const updated = await this.updateCompanyBrandingAndSettings(id, {
      settingsPatch: { websiteConnection: merged },
    });
    return updated.settings.websiteConnection || merged;
  },

  async recordWebsiteManifestSync(id, { manifest, syncedAt, siteManifestUrl = "", connectionError = "" } = {}) {
    const current = companyByIdInternal(id);
    if (!current) throw companyRepositoryError("Company not found.", 404);
    const previous = current.settings?.websiteConnection || {};
    const merged = {
      ...previous,
      ...(siteManifestUrl ? { siteManifestUrl } : {}),
      connectionStatus: connectionError ? "error" : "connected",
      connectionError,
      lastManifestSyncAt: syncedAt || new Date().toISOString(),
      manifestSchemaVersion: manifest?.schemaVersion || previous.manifestSchemaVersion || "1.0",
      ...(manifest ? { lastManifest: manifest } : {}),
    };
    const updated = await this.updateCompanyBrandingAndSettings(id, {
      settingsPatch: { websiteConnection: merged },
    });
    return updated.settings.websiteConnection || merged;
  },
};

const allowedMembershipRoles = new Set([
  "admin",
  "manager",
  "company_admin",
  "employee",
  "staff",
  "customer",
]);
const allowedMembershipStatuses = new Set(["active", "inactive"]);

function membershipRepositoryError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function assertMembershipCompany(companyId) {
  const company = companyByIdInternal(companyId);
  if (!company) throw membershipRepositoryError("Company not found.", 404);
  return company;
}

function validateMembershipValues(role, status) {
  if (!allowedMembershipRoles.has(role)) {
    throw membershipRepositoryError("Membership role is invalid.");
  }
  if (!allowedMembershipStatuses.has(status)) {
    throw membershipRepositoryError("Membership status is invalid.");
  }
}

function localMembershipsForCompany(companyId) {
  const normalized = normalizeCompanyId(companyId);
  const usersById = new Map(
    userRepository.getByCompany(normalized).map((user) => [user.id, user]),
  );
  const membershipsByUser = new Map(
    companyMemberships
      .filter((membership) => membership.companyId === normalized)
      .map((membership) => [membership.userId, membership]),
  );

  for (const user of usersById.values()) {
    if (membershipsByUser.has(user.id)) continue;
    membershipsByUser.set(user.id, normalizeMembership({
      id: `${normalized}:${user.id}`,
      companyId: normalized,
      userId: user.id,
      role: membershipRoleForUser(user),
      status: user.isActive === false ? "inactive" : "active",
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }));
  }

  return [...membershipsByUser.values()].map((membership) => ({
    ...clone(membership),
    user: usersById.get(membership.userId) || users.find((user) => user.id === membership.userId) || null,
  }));
}

async function membershipsForCompany(companyId) {
  const normalized = normalizeCompanyId(companyId);
  if (isSupabaseConfigured()) {
    if (!canPersistToSupabase) {
      throw membershipRepositoryError(
        "Supabase membership tables are unavailable. Validate the Phase 1 migration in staging first.",
        503,
      );
    }
    return listCompanyMembershipsFromSupabase(normalized);
  }
  return localMembershipsForCompany(normalized);
}

function assertMutableMembership(membership, user) {
  if (membership?.role === "super_admin" || user?.role === "super_admin") {
    throw membershipRepositoryError(
      "Super Admin identities and memberships remain CLI-managed.",
      403,
    );
  }
}

function assertLastEbAdmin(companyId, current, next, memberships) {
  if (normalizeCompanyId(companyId) !== DEFAULT_COMPANY_ID) return;
  const removesAdmin = current?.role === "company_admin"
    && current?.status === "active"
    && (next.role !== "company_admin" || next.status !== "active");
  if (!removesAdmin) return;
  const activeAdmins = memberships.filter(
    (membership) => membership.role === "company_admin"
      && membership.status === "active"
      && Boolean(membership.user)
      && membership.user?.isActive !== false,
  );
  if (activeAdmins.length <= 1) {
    throw membershipRepositoryError("The last active EB Chemical company admin cannot be disabled.", 409);
  }
}

function globalUsersByEmail(email) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  return new Map(
    users
      .filter((user) => String(user.email || "").trim().toLowerCase() === normalizedEmail)
      .map((user) => [user.id, user]),
  );
}

function createInactiveUserShell(email, name, companyId) {
  const id = `user-${crypto.randomUUID()}`;
  return normalizeUser({
    id,
    name: String(name || "").trim() || email.split("@")[0],
    email,
    phone: "",
    password: "",
    role: "customer",
    permissions: [],
    isActive: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

function createUserWithPassword(email, name, role, passwordHash) {
  const id = `user-${crypto.randomUUID()}`;
  return normalizeUser({
    id,
    name: String(name || "").trim() || email.split("@")[0],
    email,
    phone: "",
    password: passwordHash,
    role: role || "customer",
    permissions: [],
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

async function persistMembershipRecord(membership, user, createUser, previousMembership = null) {
  if (isSupabaseConfigured()) {
    await saveCompanyMembershipToSupabase({ membership, user, createUser });
    return;
  }

  const currentIndex = companyMemberships.findIndex((entry) => entry.id === membership.id);
  const addedUser = createUser ? userRepository.createGlobal(user) : null;
  if (currentIndex === -1) companyMemberships.push(membership);
  else companyMemberships[currentIndex] = membership;

  try {
    persistLocalMembershipDirectory();
  } catch (error) {
    if (currentIndex === -1) {
      companyMemberships.splice(companyMemberships.indexOf(membership), 1);
    } else {
      companyMemberships[currentIndex] = previousMembership;
    }
    if (addedUser) userRepository.deleteGlobal(addedUser.id);
    throw error;
  }
}

export const companyMembershipRepository = {
  async listMembershipsForUser(userId) {
    const normalizedUserId = String(userId || "").trim();
    const memberships = isSupabaseConfigured()
      ? await listUserMembershipsFromSupabase(normalizedUserId)
      : companies
          .flatMap((company) => localMembershipsForCompany(company.id))
          .filter((membership) => membership.userId === normalizedUserId)
          .map(clone);
    return memberships.map((membership) => ({
      ...membership,
      company: companyRepository.getCompanyById(membership.companyId),
    }));
  },

  async listActiveMembershipsForUser(userId) {
    const memberships = await this.listMembershipsForUser(userId);
    return memberships.filter(
      (membership) => membership.status === "active" && membership.company?.status === "active",
    );
  },

  async listAllMemberships() {
    const allMemberships = await Promise.all(
      companies.map(async (company) => {
        const memberships = await membershipsForCompany(company.id);
        return memberships.map((membership) => ({
          ...membership,
          company: serializeCompany(company),
        }));
      }),
    );
    return allMemberships.flat();
  },

  async listUsersForCompany(companyId) {
    assertMembershipCompany(companyId);
    return membershipsForCompany(companyId);
  },

  async getMembershipByCompanyAndUser(companyId, userId) {
    const company = assertMembershipCompany(companyId);
    const memberships = await this.listMembershipsForUser(userId);
    return memberships.find(
      (membership) => membership.companyId === company.id && membership.userId === userId,
    ) || null;
  },

  async createOrUpdateMembership(companyId, input) {
    const company = assertMembershipCompany(companyId);
    const normalizedCompanyId = company.id;
    const email = String(input?.email || "").trim().toLowerCase();
    const role = input?.role;
    const status = input?.status || "active";
    validateMembershipValues(role, status);

    let candidates = globalUsersByEmail(email);
    if (isSupabaseConfigured()) {
      const remoteUsers = await findUsersByEmailFromSupabase(email);
      candidates = new Map(remoteUsers.map((user) => [user.id, user]));
    }
    if (candidates.size > 1) {
      throw membershipRepositoryError(
        "Multiple users match this email. Resolve duplicate identities first.",
        409,
      );
    }

    const existingUser = [...candidates.values()][0] || null;
    let user;
    let isNewUser;
    if (existingUser) {
      user = existingUser;
      isNewUser = false;
    } else {
      const password = typeof input?.password === "string" ? input.password.trim() : "";
      if (!password) {
        throw membershipRepositoryError(
          "Temporary password is required for new users.",
          400,
        );
      }
      const passwordHash = await hashPassword(password);
      user = createUserWithPassword(
        email,
        input?.name,
        role,
        passwordHash,
      );
      isNewUser = true;
    }
    const memberships = await membershipsForCompany(normalizedCompanyId);
    const current = memberships.find((membership) => membership.userId === user.id) || null;
    assertMutableMembership(current, user);

    const now = new Date().toISOString();
    const membership = normalizeMembership({
      ...(current || {}),
      id: `${normalizedCompanyId}:${user.id}`,
      companyId: normalizedCompanyId,
      userId: user.id,
      role,
      status,
      createdAt: current?.createdAt || now,
      updatedAt: now,
    });
    assertLastEbAdmin(normalizedCompanyId, current, membership, memberships);
    await persistMembershipRecord(
      membership,
      user,
      isNewUser,
      current ? normalizeMembership(current) : null,
    );
    return { ...clone(membership), user };
  },

  async createCustomerContact(companyId, input) {
    const company = assertMembershipCompany(companyId);
    const email = String(input?.email || "").trim().toLowerCase();
    let candidates = globalUsersByEmail(email);
    if (isSupabaseConfigured()) {
      const remoteUsers = await findUsersByEmailFromSupabase(email);
      candidates = new Map(remoteUsers.map((user) => [user.id, user]));
    }
    if (candidates.size > 1) {
      throw membershipRepositoryError(
        "Multiple users match this email. Resolve duplicate identities first.",
        409,
      );
    }

    const existingUser = [...candidates.values()][0] || null;
    if (existingUser && existingUser.role !== "customer") {
      throw membershipRepositoryError("This email belongs to a non-customer user.", 409);
    }
    if (existingUser?.isActive === false) {
      throw membershipRepositoryError("This customer identity is inactive.", 409);
    }

    const memberships = await membershipsForCompany(company.id);
    if (existingUser && memberships.some((membership) => membership.userId === existingUser.id)) {
      throw membershipRepositoryError("A contact with this email already exists.", 409);
    }

    const now = new Date().toISOString();
    const user = existingUser || normalizeUser(withoutCompanyFields({
      ...input,
      id: `user-${crypto.randomUUID()}`,
      email,
      password: "",
      role: "customer",
      permissions: [],
      isActive: true,
      createdAt: now,
      updatedAt: now,
    }));
    const membership = normalizeMembership({
      id: `${company.id}:${user.id}`,
      companyId: company.id,
      userId: user.id,
      role: "customer",
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
    await persistMembershipRecord(membership, user, !existingUser);
    return { ...clone(membership), user: clone(user) };
  },

  async updateMembership(companyId, userId, changes) {
    const company = assertMembershipCompany(companyId);
    const memberships = await membershipsForCompany(company.id);
    const current = memberships.find((membership) => membership.userId === userId);
    if (!current) throw membershipRepositoryError("Membership not found.", 404);
    assertMutableMembership(current, current.user);

    const role = changes?.role || current.role;
    const status = changes?.status || current.status;
    validateMembershipValues(role, status);
    const membership = normalizeMembership({
      ...current,
      companyId: company.id,
      role,
      status,
      _permissions: changes?.permissions !== undefined
        ? clone(Array.isArray(changes.permissions) ? changes.permissions : [])
        : current._permissions,
      updatedAt: new Date().toISOString(),
    });
    assertLastEbAdmin(company.id, current, membership, memberships);
    await persistMembershipRecord(membership, current.user, false, normalizeMembership(current));
    return { ...clone(membership), user: current.user };
  },

  async disableMembership(companyId, userId) {
    return this.updateMembership(companyId, userId, { status: "inactive" });
  },

  async updateMembershipById(id, changes) {
    const memberships = await this.listAllMemberships();
    const matches = memberships.filter((membership) => membership.id === id);
    if (matches.length > 1) {
      throw membershipRepositoryError("Membership ID is ambiguous.", 409);
    }
    const current = matches[0];
    if (!current) throw membershipRepositoryError("Membership not found.", 404);
    return this.updateMembership(current.companyId, current.userId, changes);
  },
};

async function assertPlatformUserStatusChangeSafe(user, isActive) {
  if (user.role === "super_admin") {
    throw platformDirectoryError("Super Admin identities remain CLI-managed.", 403);
  }
  if (isActive !== false || user.isActive === false) return;

  for (const company of companies) {
    const memberships = await membershipsForCompany(company.id);
    const membership = memberships.find(
      (entry) => entry.userId === user.id
        && entry.role === "company_admin"
        && entry.status === "active",
    );
    if (!membership) continue;
    assertLastEbAdmin(
      company.id,
      membership,
      { ...membership, status: "inactive" },
      memberships,
    );
  }
}

function assertPlatformUserCreateSafe(input) {
  if (!input || typeof input !== "object") {
    throw platformDirectoryError("Request body must be an object.");
  }
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw platformDirectoryError("email must be a valid email address.");
  }
  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (!name) throw platformDirectoryError("name is required.");
  if (name.length > 120) throw platformDirectoryError("name must be 120 characters or fewer.");
  const role = typeof input.role === "string" ? input.role.trim() : "customer";
  if (!assignablePlatformUserRoles.includes(role)) {
    throw platformDirectoryError(assignablePlatformUserRoleError());
  }
  const password = typeof input.password === "string" && input.password.length ? input.password : "";
  if (!password) throw platformDirectoryError("password is required.");
  const existing = users.find((u) => String(u.email || "").trim().toLowerCase() === email);
  if (existing) throw platformDirectoryError("A user with this email already exists.", 409);
  return { email, name, role, password };
}

export const platformUserRepository = {
  async listUsers() {
    if (isSupabaseConfigured()) {
      return listPlatformUsersFromSupabase();
    }
    return users.map(clone);
  },

  async findByEmail(email) {
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const matches = isSupabaseConfigured()
      ? await findUsersByEmailFromSupabase(normalizedEmail)
      : users.filter(
          (user) => String(user.email || "").trim().toLowerCase() === normalizedEmail,
        );
    if (matches.length > 1) {
      throw platformDirectoryError("Multiple users match this email.", 409);
    }
    return matches[0] ? clone(matches[0]) : null;
  },

  async getUserById(userId) {
    if (isSupabaseConfigured()) {
      return findPlatformUserByIdFromSupabase(userId);
    }
    const user = users.find((entry) => entry.id === userId);
    return user ? clone(user) : null;
  },

  async createUser(input) {
    const safe = assertPlatformUserCreateSafe(input);
    const passwordHash = await hashPassword(safe.password);
    const now = new Date().toISOString();
    const id = `user-${crypto.randomUUID()}`;
    const user = normalizeUser({
      id,
      name: safe.name,
      email: safe.email,
      phone: typeof input.phone === "string" ? input.phone.trim() : "",
      department: typeof input.department === "string" ? input.department.trim() : "",
      password: passwordHash,
      role: safe.role,
      permissions: [],
      isActive: input.isActive !== false,
      createdAt: now,
      updatedAt: now,
    });
    users.push(user);
    try {
      if (isSupabaseConfigured()) {
        await savePlatformUserToSupabase(user);
      } else {
        persistLocalMembershipDirectory();
      }
    } catch (error) {
      users.pop();
      throw error;
    }
    return clone(user);
  },

  async updateUser(id, changes) {
    const platformUsers = await this.listUsers();
    const matches = platformUsers.filter((user) => user.id === id);
    if (matches.length > 1) throw platformDirectoryError("User ID is ambiguous.", 409);
    const current = matches[0];
    if (!current) throw platformDirectoryError("User not found.", 404);

    if (current.role === "super_admin") {
      if (changes.role !== undefined && changes.role !== "super_admin") {
        throw platformDirectoryError("Super Admin role cannot be demoted.", 403);
      }
      if (changes.isActive === false) {
        throw platformDirectoryError("Super Admin cannot be disabled.", 403);
      }
    }

    if (changes.email !== undefined) {
      const email = String(changes.email || "").trim().toLowerCase();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw platformDirectoryError("email must be a valid email address.");
      }
      const duplicate = users.find((u) => u.id !== id && String(u.email || "").trim().toLowerCase() === email);
      if (duplicate) throw platformDirectoryError("A user with this email already exists.", 409);
      changes.email = email;
    }

    if (changes.isActive === false) {
      await assertPlatformUserStatusChangeSafe(current, false);
    }

    const next = normalizeUser({
      ...current,
      ...changes,
      updatedAt: new Date().toISOString(),
    });

    if (isSupabaseConfigured()) {
      await savePlatformUserToSupabase(next);
      const local = users.find((user) => user.id === id);
      if (local) Object.assign(local, next);
      return clone(next);
    }

    const index = users.findIndex((user) => user.id === id);
    const previous = clone(users[index]);
    users[index] = next;
    try {
      persistLocalMembershipDirectory();
      return clone(users[index]);
    } catch (error) {
      users[index] = previous;
      throw error;
    }
  },

  async updateUserStatus(id, isActive) {
    return this.updateUser(id, { isActive });
  },
};

export function currentStoreSnapshot(companyId = DEFAULT_COMPANY_ID) {
  const normalized = normalizeCompanyId(companyId);
  const store = {
    version: 1,
    savedAt: new Date().toISOString(),
    users: userRepository.getByCompany(normalized),
    orders: orderRepository.getByCompany(normalized),
    products: productRepository.getByCompany(normalized),
    productRelations: productRelationRepository.getByCompany(normalized),
    productDisplayModes: productDisplayModeRepository.getByCompany(normalized),
    productDisplayPositions: productDisplayPositionRepository.getByCompany(normalized),
    categories: categoryRepository.getByCompany(normalized),
    brands: brandRepository.getByCompany(normalized),
    offers: offerRepository.getByCompany(normalized),
    categoryCards: categoryCardRepository.getByCompany(normalized),
    reviews: reviewRepository.getByCompany(normalized),
    websiteMedia: websiteMediaRepository.getByCompany(normalized),
    websiteMediaHiddenKeys: websiteMediaHiddenKeysRepository.getByCompany(normalized),
    websiteTexts: websiteTextsRepository.getByCompany(normalized),
    deletedWebsiteMediaKeys: normalized === DEFAULT_COMPANY_ID ? (persisted?.deletedWebsiteMediaKeys || []) : [],
    workSessions: workSessionRepository.getByCompany(normalized),
    customAdminModules: customAdminModuleRepository.getByCompany(normalized),
    customAdminModuleEntries: customAdminModuleEntryRepository.getByCompany(normalized),
    companyProductSchemas: companyProductSchemaRepository.getByCompany(normalized),
    invoices: invoiceRepository.getByCompany(normalized),
    deliveryZones: deliveryZoneRepository.getByCompany(normalized),
    automaticDiscounts: automaticDiscountRepository.getByCompany(normalized),
    coupons: couponRepository.getByCompany(normalized),
    productBundles: productBundleRepository.getByCompany(normalized),
    productBundleItems: productBundleItemRepository.getByCompany(normalized),
    smsLogs: smsLogRepository.getByCompany(normalized),
    smsAutomations: smsAutomationRepository.getByCompany(normalized),
    smsProviders: smsProviderRepository.getByCompany(normalized),
    announcements: announcementRepository.getByCompany(normalized),
    splashAds: splashAdRepository.getByCompany(normalized),
    splashAdEvents: splashAdEventRepository.getByCompany(normalized),
    storePolicies: storePolicyRepository.getByCompany(normalized),
    legalInformation: legalInformationRepository.getByCompany(normalized),
    loginHistory: loginHistoryRepository.getByCompany(normalized),
    loginSecurity: loginSecurityRepository.getByCompany(normalized),
    ipBlocks: ipBlockRepository.getByCompany(normalized),
    ipSecurity: ipSecurityRepository.getByCompany(normalized),
    activityLogs: activityLogRepository.getByCompany(normalized),
    searchEvents: searchEventRepository.getByCompany(normalized),
    searchRedirects: searchRedirectRepository.getByCompany(normalized),
    visitorSessions: visitorSessionRepository.getByCompany(normalized),
    visitorEvents: visitorEventRepository.getByCompany(normalized),
    inboxConversations: inboxConversationRepository.getByCompany(normalized),
    inboxMessages: inboxMessageRepository.getByCompany(normalized),
    inboxConversationReads: inboxConversationReadRepository.getByCompany(normalized),
    companySites: companySiteRepository.getByCompany(normalized),
    carts: Object.fromEntries(
      cartRepository.getByCompany(normalized).map(({ userId, items }) => [userId, items]),
    ),
  };
  return store;
}

function persistLocalStore(store) {
  fs.mkdirSync(dataDir, { recursive: true });
  const tempFile = `${dataFile}.tmp`;
  fs.writeFileSync(tempFile, `${JSON.stringify(store, null, 2)}\n`, "utf8");
  fs.renameSync(tempFile, dataFile);
  return store;
}

function serializeTenantRecords(records, companyId) {
  return records.map((record) => ({ ...record, company_id: normalizeCompanyId(companyId) }));
}

function persistLocalMembershipDirectory() {
  const existing = readPersistedStore() || {};
  return persistLocalStore({
    ...existing,
    version: Math.max(2, Number(existing.version || 1)),
    savedAt: new Date().toISOString(),
    users: users.map((user) => clone(withoutCompanyFields(user))),
    memberships: companyMemberships.map((membership) => ({
      ...membership,
      company_id: membership.companyId,
      user_id: membership.userId,
    })),
  });
}

function mergeLocalTenantRecords(existing, records, companyId) {
  const normalized = normalizeCompanyId(companyId);
  const otherCompanies = (Array.isArray(existing) ? existing : []).filter(
    (record) => inputCompanyId(record) !== normalized,
  );
  return [...serializeTenantRecords(records, normalized), ...otherCompanies];
}

function persistLocalCompanyStore(companyId, store) {
  const normalized = normalizeCompanyId(companyId);
  const existing = readPersistedStore() || {};
  const merged = {
    ...existing,
    version: Math.max(2, Number(existing.version || store.version || 1)),
    savedAt: store.savedAt,
  };

  for (const key of [
    "orders",
    "products",
    "productRelations",
    "productDisplayModes",
    "productDisplayPositions",
    "categories",
    "brands",
    "offers",
    "categoryCards",
    "reviews",
    "websiteMedia",
    "websiteMediaHiddenKeys",
    "websiteTexts",
    "workSessions",
    "customAdminModules",
    "customAdminModuleEntries",
    "companyProductSchemas",
    "invoices",
    "deliveryZones",
    "automaticDiscounts",
    "coupons",
    "productBundles",
    "productBundleItems",
    "smsLogs",
    "smsAutomations",
    "smsProviders",
    "announcements",
    "splashAds",
    "splashAdEvents",
    "storePolicies",
    "legalInformation",
    "loginHistory",
    "loginSecurity",
    "ipBlocks",
    "ipSecurity",
    "activityLogs",
    "searchEvents",
    "searchRedirects",
    "visitorSessions",
    "visitorEvents",
    "inboxConversations",
    "inboxMessages",
    "inboxConversationReads",
    "companySites",
  ]) {
    merged[key] = mergeLocalTenantRecords(existing[key], store[key], normalized);
  }
  merged.users = users.map((user) => clone(withoutCompanyFields(user)));

  merged.companyCarts = {
    ...(existing.companyCarts || {}),
    [normalized]: store.carts,
  };
  if (normalized === DEFAULT_COMPANY_ID) {
    merged.carts = store.carts;
  }
  if (normalized === DEFAULT_COMPANY_ID) {
    merged.deletedWebsiteMediaKeys = store.deletedWebsiteMediaKeys || [];
  }
  merged.companies = companies.map(serializeCompany);

  return persistLocalStore(merged);
}

async function persistCompanyDirectory(company) {
  if (isSupabaseConfigured()) {
    if (!canPersistToSupabase) {
      throw new Error("Supabase persistence is configured but unavailable. Refusing local fallback for company data.");
    }

    const result = await saveCompanyToSupabase(company);
    company._domainId = result.domainId;
    return serializeCompany(company);
  }

  const existing = readPersistedStore() || {};
  return persistLocalStore({
    ...existing,
    version: Math.max(2, Number(existing.version || 1)),
    savedAt: new Date().toISOString(),
    companies: companies.map(serializeCompany),
  });
}

async function persistSuperAdminUser(user, previousUser = null) {
  if (isSupabaseConfigured()) {
    await saveSuperAdminUserToSupabase(user, DEFAULT_COMPANY_ID, { previousUser });
    return user;
  }

  const existing = readPersistedStore() || {};
  return persistLocalStore({
    ...existing,
    version: Math.max(2, Number(existing.version || 1)),
    savedAt: new Date().toISOString(),
    users: users.map((entry) => clone(withoutCompanyFields(entry))),
  });
}

export async function persistCompanyStore(companyId, options = {}) {
  const normalized = normalizeCompanyId(companyId);
  const store = currentStoreSnapshot(normalized);

  if (isSupabaseConfigured()) {
    if (!canPersistToSupabase) {
      throw new Error("Supabase persistence is configured but unavailable. Refusing local fallback for persistent data.");
    }

    await saveStoreToSupabase(store, {
      companyId: normalized,
      pruneMissing: options.pruneMissing === true,
    });
    return store;
  }

  return persistLocalCompanyStore(normalized, store);
}

export async function persistAnalyticsStore(companyId, options = {}) {
  const normalized = normalizeCompanyId(companyId);
  const store = {
    searchEvents: searchEventRepository.getByCompany(normalized),
    searchRedirects: searchRedirectRepository.getByCompany(normalized),
    visitorSessions: visitorSessionRepository.getByCompany(normalized),
    visitorEvents: visitorEventRepository.getByCompany(normalized),
  };

  if (isSupabaseConfigured()) {
    if (!canPersistToSupabase) {
      throw new Error("Supabase persistence is configured but unavailable. Refusing local fallback for analytics data.");
    }
    await saveAnalyticsStoreToSupabase(normalized, store, {
      pruneSearchEvents: options.pruneSearchEvents === true,
      pruneVisitorEvents: options.pruneVisitorEvents === true,
      pruneSearchRedirects: options.pruneSearchRedirects === true,
    });
    return store;
  }

  return persistLocalCompanyStore(normalized, currentStoreSnapshot(normalized));
}

export async function persistStore(options = {}) {
  return persistCompanyStore(DEFAULT_COMPANY_ID, options);
}

export const tenantCompanySiteRepository = {
  listByCompany(companyId) {
    return companySiteRepository.getByCompany(companyId)
      .slice()
      .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)) || a.slug.localeCompare(b.slug));
  },

  findByCompany(companyId, siteId) {
    return companySiteRepository.findByCompany(companyId, siteId);
  },

  findBySlugForCompany(companyId, slug) {
    const normalizedSlug = String(slug || "").trim().toLowerCase();
    return companySiteRepository.getByCompany(companyId)
      .find((site) => site.slug === normalizedSlug) || null;
  },

  createForCompany(companyId, data) {
    const now = new Date().toISOString();
    const site = {
      id: data.id || `site-${crypto.randomUUID()}`,
      slug: String(data.slug || "").trim().toLowerCase(),
      name: String(data.name || "").trim(),
      status: ["active", "draft", "archived"].includes(data.status) ? data.status : "active",
      defaultLocale: data.defaultLocale || data.default_locale || "en",
      settings: data.settings && typeof data.settings === "object" && !Array.isArray(data.settings)
        ? clone(data.settings)
        : {},
      createdAt: now,
      updatedAt: now,
    };
    return companySiteRepository.createForCompany(companyId, site);
  },

  /**
   * Updates an existing site through the existing site-update mechanism
   * (TenantRepository.updateForCompany). Callers must persist afterwards
   * via persistCompanyStore(companyId).
   */
  updateForCompany(companyId, siteId, update) {
    return companySiteRepository.updateForCompany(companyId, siteId, update);
  },

  async ensureDefaultForCompany(companyId, options = {}) {
    const existing = this.listByCompany(companyId);
    if (existing.length > 0) return existing[0];

    const company = companies.find((c) => c.id === companyId) || null;
    const connection = company?.settings?.websiteConnection;
    const legacySiteId = connection?.siteId || `${companyId}-storefront`;
    const defaultLocale = connection?.defaultLocale || "en";
    const name = company?.name || companyId;
    const created = this.createForCompany(companyId, {
      // company_sites.id is a global primary key: never reuse the legacy
      // websiteConnection.siteId (two companies may share the same value).
      id: `site-${crypto.randomUUID()}`,
      slug: legacySiteId,
      name,
      status: "active",
      defaultLocale,
      settings: connection?.siteId
        ? { legacyWebsiteConnectionSiteId: connection.siteId }
        : {},
    });
    const persist = typeof options.persist === "function" ? options.persist : persistCompanyStore;
    try {
      await persist(companyId);
    } catch (error) {
      companySiteRepository.deleteForCompany(companyId, created.id);
      throw error;
    }
    return created;
  },
};

if (!isSupabaseConfigured() && !fs.existsSync(dataFile)) {
  await persistStore();
}
