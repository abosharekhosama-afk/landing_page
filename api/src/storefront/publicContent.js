import {
  normalizeProductFilterAttributeForRead,
  serializePublicProductFilterAttributes,
} from "../catalog/productFilterAttributes.js";
import {
  productIsBestseller,
  productIsFeatured,
  productIsNewArrival,
  resolvePublicSalePrice,
} from "../products/merchandisingFlags.js";
import { canonicalProductCondition } from "../products/productSettings.js";
import { preferWebpUploadUrl } from "../uploads/preferWebpUploadUrl.js";

const localized = (value, fallback = "") => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return {
      en: String(value.en ?? value.english ?? fallback ?? ""),
      ar: String(value.ar ?? value.arabic ?? value.en ?? fallback ?? ""),
    };
  }
  const text = String(value ?? fallback ?? "");
  return { en: text, ar: text };
};

const localizedWithLegacyArabic = (value, arabicValue, fallback = "") => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return localized({
      ...value,
      ar: arabicValue ?? value.ar ?? value.arabic ?? value.en ?? value.english ?? fallback,
    }, fallback);
  }
  return localized({ en: value ?? fallback, ar: arabicValue ?? value ?? fallback }, fallback);
};

const finiteNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const safeUrl = (value) => {
  const url = String(value || "").trim();
  if (!url) return "";
  if (url.startsWith("/uploads/")) return preferWebpUploadUrl(url);
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) return "";
    return preferWebpUploadUrl(parsed.toString());
  } catch {
    return "";
  }
};

const safeOption = (option = {}) => ({
  name: localized(option.name || { en: option.nameEn, ar: option.nameAr }),
  values: (Array.isArray(option.values) ? option.values : []).map((value) => ({
    label: localized(value.label || { en: value.labelEn, ar: value.labelAr }),
    color: String(value.color || "").slice(0, 32),
    priceDelta: finiteNumber(value.priceDelta, 0),
    image: safeUrl(value.image || value.imageUrl || value.image_url),
  })),
});

function localizedTextKey(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return String(value.en || value.ar || "").trim().toLowerCase();
  }
  return String(value || "").trim().toLowerCase();
}

/** Derive Color/Size options (with color images) from real variant combinations. */
export function deriveProductOptionsFromVariants(variants = []) {
  const colors = new Map();
  const sizes = new Map();

  for (const variant of variants) {
    const colorName = localized(variant.colorName || variant.color_name || "");
    const colorKey = localizedTextKey(colorName) || String(variant.colorValue || variant.color_value || "").trim().toLowerCase();
    const image = safeUrl(variant.image || variant.imageUrl || variant.image_url);
    if (colorKey) {
      const existing = colors.get(colorKey);
      if (!existing) {
        colors.set(colorKey, {
          label: colorName,
          color: String(variant.colorValue || variant.color_value || "").slice(0, 32),
          priceDelta: 0,
          image,
        });
      } else if (!existing.image && image) {
        existing.image = image;
      }
    }

    const sizeLabel = localized(variant.size || "");
    const sizeKey = localizedTextKey(sizeLabel);
    if (sizeKey && !sizes.has(sizeKey)) {
      sizes.set(sizeKey, {
        label: sizeLabel,
        color: "",
        priceDelta: 0,
        image: "",
      });
    }
  }

  const options = [];
  if (colors.size) {
    options.push({
      name: { en: "Color", ar: "اللون" },
      values: [...colors.values()],
    });
  }
  if (sizes.size) {
    options.push({
      name: { en: "Size", ar: "الحجم" },
      values: [...sizes.values()],
    });
  }
  return options;
}

function enrichOptionsWithVariantImages(options = [], variants = []) {
  if (!options.length) return deriveProductOptionsFromVariants(variants);
  const imageByColor = new Map();
  for (const variant of variants) {
    const colorKey = localizedTextKey(variant.colorName || variant.color_name)
      || String(variant.colorValue || variant.color_value || "").trim().toLowerCase();
    const image = safeUrl(variant.image || variant.imageUrl || variant.image_url);
    if (colorKey && image && !imageByColor.has(colorKey)) imageByColor.set(colorKey, image);
  }
  return options.map((option) => {
    const nameKey = localizedTextKey(option.name);
    const isColorOption = nameKey === "color" || nameKey === "اللون" || option.values?.some((value) => value.color);
    if (!isColorOption) return option;
    return {
      ...option,
      values: (option.values || []).map((value) => {
        if (value.image) return value;
        const key = localizedTextKey(value.label) || String(value.color || "").trim().toLowerCase();
        return { ...value, image: imageByColor.get(key) || "" };
      }),
    };
  });
}

function publicFilterAttribute(group, value) {
  return normalizeProductFilterAttributeForRead(group, value);
}

export function serializePublicProduct(product = {}, options = {}) {
  const gallery = Array.isArray(product.gallery_images)
    ? product.gallery_images.map((item) => safeUrl(item?.image_url || item?.url || item)).filter(Boolean)
    : (Array.isArray(product.galleryImages) ? product.galleryImages.map(safeUrl).filter(Boolean) : []);
  const variants = (Array.isArray(product.variants) ? product.variants : [])
    .filter((variant) => variant?.isActive !== false && variant?.visible !== false)
    .map((variant) => {
      const regular = finiteNumber(variant.price, 0);
      const sale = variant.sale_price ?? variant.salePrice;
      const priced = resolvePublicSalePrice(regular, sale);
      return {
        id: String(variant.id || ""),
        colorName: localized(variant.colorName || variant.color_name || ""),
        colorValue: String(variant.colorValue || variant.color_value || "").slice(0, 32),
        size: localized(variant.size || ""),
        price: priced.price,
        originalPrice: priced.originalPrice,
        stock: Math.max(0, finiteNumber(variant.stock, 0)),
        image: safeUrl(variant.image_url || variant.imageUrl || variant.image),
        sortOrder: finiteNumber(variant.sort_order ?? variant.sortOrder, 0),
      };
    });
  const explicitOptions = (Array.isArray(product.options) ? product.options : []).map(safeOption);
  const productOptions = enrichOptionsWithVariantImages(explicitOptions, variants);

  const primaryVariantSource = (Array.isArray(product.variants) ? product.variants : [])
    .find((variant) => variant?.isActive !== false && variant?.visible !== false);
  const productPriced = variants[0]
    ? { price: variants[0].price, originalPrice: variants[0].originalPrice }
    : resolvePublicSalePrice(
      finiteNumber(product.price ?? product.basePrice, 0),
      product.sale_price ?? product.salePrice ?? primaryVariantSource?.sale_price ?? primaryVariantSource?.salePrice,
    );
  const originalPrice = productPriced.originalPrice != null
    ? productPriced.originalPrice
    : (product.originalPrice == null ? null : finiteNumber(product.originalPrice, 0));

  const payload = {
    id: String(product.id || ""),
    slug: String(product.slug || ""),
    sku: String(product.sku || ""),
    name: localized(product.name || { en: product.nameEn, ar: product.nameAr }),
    shortDescription: localizedWithLegacyArabic(product.shortDescription, product.shortDescriptionAr),
    description: localizedWithLegacyArabic(
      product.fullDescription || product.description,
      product.fullDescriptionAr || product.descriptionAr,
    ),
    price: productPriced.price,
    originalPrice,
    categoryId: String(product.categoryId || ""),
    brandId: String(product.brandId || ""),
    brand: String(product.brand || ""),
    // Catalog hierarchy + manufacturer (backward-compatible additions).
    mainCategoryId: product.mainCategoryId ? String(product.mainCategoryId) : null,
    subcategoryId: product.subcategoryId ? String(product.subcategoryId) : (product.categoryId ? String(product.categoryId) : null),
    manufacturer: String(product.manufacturer || ""),
    // Product-level catalog filters.
    age: publicFilterAttribute("age", product.age),
    gender: publicFilterAttribute("gender", product.gender),
    skill: publicFilterAttribute("skill", product.skill),
    occasion: publicFilterAttribute("occasion", product.occasion),
    material: publicFilterAttribute("material", product.material),
    productType: publicFilterAttribute("productType", product.productType),
    theme: publicFilterAttribute("theme", product.theme),
    collection: publicFilterAttribute("collection", product.collection),
    filterAttributes: serializePublicProductFilterAttributes(product),
    quickShop: product.quickShop === true,
    image: safeUrl(product.image || product.primaryImage),
    hoverImage: safeUrl(product.hoverImage || product.secondaryImage),
    usageVideo: safeUrl(product.usageVideo),
    usageVideoPoster: safeUrl(product.usageVideoPoster),
    gallery,
    variants,
    stock: variants.length
      ? variants.reduce((total, variant) => total + variant.stock, 0)
      : Math.max(0, finiteNumber(product.stockQty, 0)),
    options: productOptions,
    badge: localizedWithLegacyArabic(product.label || product.badge, product.labelAr || product.badgeAr),
    availability: localizedWithLegacyArabic(product.availability, product.availabilityAr),
    // Phase J — Decision 9 additive merchandising flags (no limitedOffer)
    featured: productIsFeatured(product),
    newArrival: productIsNewArrival(product),
    bestseller: productIsBestseller(product),
    sortOrder: finiteNumber(product.sortOrder, 0),
    // Phase H — public purchase limits (UX); never include costPrice/barcode internals
    minPurchaseQuantity: product.minPurchaseQuantity == null
      ? null
      : Math.max(1, Math.floor(finiteNumber(product.minPurchaseQuantity, 1))),
    maxPurchaseQuantity: product.maxPurchaseQuantity == null
      ? null
      : Math.max(1, Math.floor(finiteNumber(product.maxPurchaseQuantity, 1))),
  };

  // Phase I — additive condition only when the company gate is on and a value is set.
  if (options.conditionEnabled === true) {
    const condition = canonicalProductCondition(product.condition);
    if (condition) payload.condition = condition;
  }

  return payload;
}

export function serializePublicCategory(category = {}) {
  return {
    id: String(category.id || ""),
    slug: String(category.slug || ""),
    name: localized(category.name),
    description: localized(category.description),
    image: safeUrl(category.imageUrl),
    heroVideo: safeUrl(category.heroVideo),
    parentId: category.parentId ? String(category.parentId) : null,
    brandId: category.brandId ? String(category.brandId) : null,
    sortOrder: finiteNumber(category.sortOrder, 0),
  };
}

export function serializePublicBrand(brand = {}) {
  return {
    id: String(brand.id || ""),
    slug: String(brand.slug || ""),
    name: localized(brand.name),
    logoUrl: safeUrl(brand.logoUrl),
    heroVideo: safeUrl(brand.heroVideo),
    heroPoster: safeUrl(brand.heroPoster),
    headerImage: safeUrl(brand.headerImage || brand.header_image),
    menuImage: safeUrl(brand.menuImage || brand.menu_image),
    sortOrder: finiteNumber(brand.sortOrder, 0),
  };
}

export function serializePublicWebsiteText(item = {}, locale = "en") {
  const values = { en: String(item.valueEn || ""), ar: String(item.valueAr || item.valueEn || "") };
  return {
    key: String(item.key || ""),
    group: String(item.group || ""),
    label: String(item.label || ""),
    values,
    value: values[locale] || values.en,
    sortOrder: finiteNumber(item.sortOrder, 0),
  };
}

export function serializePublicWebsiteMedia(item = {}) {
  return {
    sectionKey: String(item.sectionKey || ""),
    sectionLabel: String(item.sectionLabel || ""),
    groupKey: String(item.groupKey || ""),
    mediaType: String(item.mediaType || item.media_type || (item.videoUrl ? "video" : "image")),
    image: safeUrl(item.imageUrl),
    fallbackImage: safeUrl(item.fallbackImageUrl),
    video: safeUrl(item.videoUrl),
    title: String(item.title || ""),
    subtitle: String(item.subtitle || ""),
    linkUrl: safeUrl(item.linkUrl),
    sortOrder: finiteNumber(item.sortOrder, 0),
  };
}
