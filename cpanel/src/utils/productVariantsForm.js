import { normalizeProductFilterAttributeValue } from "./productFilterAttributes.js";
import { parseRequiredStock, preserveLegacySingleVariantStock } from "./productStock.js";

export const PRODUCT_FILTER_FORM_GROUPS = Object.freeze([
  "age",
  "gender",
  "skill",
  "occasion",
  "material",
  "productType",
  "theme",
  "collection",
]);

export const PRODUCT_FILTER_FORM_LABELS = Object.freeze({
  age: { en: "Age", ar: "العمر" },
  gender: { en: "Gender", ar: "الجنس" },
  skill: { en: "Skill", ar: "المهارة" },
  occasion: { en: "Occasion", ar: "المناسبة" },
  material: { en: "Material", ar: "المادة" },
  productType: { en: "Product Type", ar: "نوع المنتج" },
  theme: { en: "Theme", ar: "الموضوع" },
  collection: { en: "Collection", ar: "المجموعة" },
});

export const PRODUCT_MERCHANDISING_FLAGS = Object.freeze([
  "featured",
  "newArrival",
  "bestseller",
]);

export function makeSlug(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function createLocalizedCopy(en, ar) {
  return { en, ar };
}

export function positivePriceOrNull(value) {
  if (value === undefined || value === null || value === "") return null;
  const price = Number(value);
  return Number.isFinite(price) && price > 0 ? price : null;
}

export function normalizeFormVariant(variant = {}, index = 0, product = {}) {
  return {
    id: variant.id || "",
    color_name: variant.color_name || variant.colorName || "Default",
    color_value: variant.color_value || variant.colorValue || "",
    size: variant.size || product.size || "",
    // Empty/zero variant price stays empty (never 0); falls back to the
    // product-level price only when that price is valid and positive.
    price: positivePriceOrNull(variant.price) ?? positivePriceOrNull(product.price) ?? "",
    sale_price: variant.sale_price ?? variant.salePrice ?? "",
    costPrice: variant.costPrice ?? variant.cost_price ?? "",
    stock: Math.max(0, Number(variant.stock ?? variant.stockQty ?? product.stockQty ?? 0)),
    image_url: variant.image_url || variant.imageUrl || variant.image || "",
    sort_order: Number(variant.sort_order ?? variant.sortOrder ?? index),
    isActive: variant.isActive !== false && variant.is_active !== false,
    isVisible: variant.isVisible !== false && variant.is_visible !== false,
    clearImage: variant.clearImage === true,
  };
}

export function cleanupDuplicateVariants(variants) {
  const groups = new Map();

  variants.forEach((variant) => {
    const key = `${(variant.color_name || "").toLowerCase()}|${(variant.color_value || "").toLowerCase()}|${(variant.size || "").toLowerCase()}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(variant);
  });

  const result = [];
  groups.forEach((group) => {
    if (group.length === 1) {
      result.push(group[0]);
      return;
    }

    const best = group.reduce((a, b) => {
      const score = (v) =>
        (v.image_url ? 100 : 0) +
        (v.price && Number(v.price) > 0 ? 10 : 0) +
        (v.stock !== undefined && v.stock !== null && Number(v.stock) >= 0 ? 5 : 0) +
        (v.id ? 2 : 0);
      return score(a) >= score(b) ? a : b;
    });

    const bestImage = best.image_url || group.find((v) => v.image_url)?.image_url || "";
    result.push({ ...best, image_url: bestImage });
  });

  return result;
}

/**
 * Normalize a product's variants for the admin form.
 * When the product has no variants and no sizes, returns [] — it never
 * invents a price, a volume size, stock, or a color value.
 */
export function normalizeProductVariantsForForm(product = {}) {
  product = product || {};
  if (Array.isArray(product.variants) && product.variants.length) {
    const normalized = product.variants.map((variant, index) => normalizeFormVariant(variant, index, product));
    return preserveLegacySingleVariantStock(product, normalized);
  }

  const variants = (product.sizes || []).map((sizeOption, index) =>
    normalizeFormVariant(
      {
        color_name: "Default",
        size: sizeOption.size,
        price: sizeOption.price,
        stock: product.stockQty ?? 0,
        image_url: product.image || "",
      },
      index,
      product,
    ),
  );

  return variants;
}

export function sizesFromFormVariants(variants, fallbackSize, fallbackPrice) {
  const bySize = new Map();
  variants.forEach((variant) => {
    if (!variant.size) return;
    const price = positivePriceOrNull(variant.price);
    if (price === null) return;
    const current = bySize.get(variant.size);
    if (!current || price < current.price) {
      bySize.set(variant.size, { size: variant.size, price });
    }
  });
  if (bySize.size) return Array.from(bySize.values());
  const fallback = positivePriceOrNull(fallbackPrice);
  return [{ size: fallbackSize || "", price: fallback ?? null }];
}

/**
 * Build a fresh commerce variant row for the admin form. The price comes
 * from the real product/form price (never a hardcoded default) and the size
 * starts empty (never a fabricated volume).
 */
export function createCommerceVariant(product = {}, index = 0) {
  return normalizeFormVariant(
    {
      color_name: "",
      color_value: "",
      size: "",
      price: product.price ?? 0,
      stock: 0,
      image_url: product.image || "",
    },
    index,
    product,
  );
}

export function createProductFromForm(form) {
  const id = form.id || `product-${Date.now()}`;
  const slug = form.slug || makeSlug(form.nameEn);
  let variants = (form.variants || [])
    .filter((variant) => variant.color_name || variant.size || Number(variant.price) > 0)
    .map((variant, index) => {
      const normalizedVariant = normalizeFormVariant(variant, index, form);
      const variantPrice = positivePriceOrNull(normalizedVariant.price);
      const base = {
        ...normalizedVariant,
        id: variant.id || undefined,
        sale_price: variant.sale_price === "" || variant.sale_price == null ? null : Number(variant.sale_price),
        stock: parseRequiredStock(variant.stock, `Variant ${index + 1} stock`),
        sort_order: index,
      };
      // Never send a fabricated 0 price; omit the field entirely so the API
      // keeps the existing product-level price instead of shadowing it with 0.
      if (variantPrice === null) delete base.price;
      else base.price = variantPrice;
      if (Object.prototype.hasOwnProperty.call(variant, "costPrice")) {
        base.costPrice = variant.costPrice === "" || variant.costPrice == null
          ? null
          : Number(variant.costPrice);
      }
      return base;
    });

  variants = cleanupDuplicateVariants(variants).map((v, i) => ({ ...v, sort_order: i }));
  const galleryImages = (form.galleryImages || [])
    .filter((image) => image.image_url)
    .map((image, index) => ({
      id: image.id || `gallery-${index}`,
      image_url: image.image_url,
      sort_order: index,
    }));
  const parsedSizes = sizesFromFormVariants(variants, form.size, form.price);
  const minPurchaseQuantity = form.minPurchaseQuantity === "" || form.minPurchaseQuantity == null
    ? null
    : Number(form.minPurchaseQuantity);
  const maxPurchaseQuantity = form.maxPurchaseQuantity === "" || form.maxPurchaseQuantity == null
    ? null
    : Number(form.maxPurchaseQuantity);

  const product = {
    id,
    slug,
    sku: form.sku || slug.toUpperCase(),
    barcode: form.barcode || "",
    minPurchaseQuantity: Number.isInteger(minPurchaseQuantity) && minPurchaseQuantity >= 1
      ? minPurchaseQuantity
      : null,
    maxPurchaseQuantity: Number.isInteger(maxPurchaseQuantity) && maxPurchaseQuantity >= 1
      ? maxPurchaseQuantity
      : null,
    name: createLocalizedCopy(form.nameEn, form.nameAr || form.nameEn),
    shortDescription: createLocalizedCopy(form.shortDescription, form.shortDescriptionAr || form.shortDescription),
    categoryId: form.subcategoryId || form.categoryId,
    brandId: form.brandId || null,
    mainCategoryId: form.mainCategoryId || null,
    subcategoryId: form.subcategoryId || null,
    manufacturer: form.manufacturer || "",
    ...Object.fromEntries(PRODUCT_FILTER_FORM_GROUPS.map((group) => [
      group,
      normalizeProductFilterAttributeValue(group, form[group]),
    ])),
    quickShop: Boolean(form.quickShop),

    longDescription: createLocalizedCopy(form.fullDescription, form.fullDescriptionAr || form.fullDescription || form.shortDescription),
    howToUse: form.howToUse,
    ingredients: form.ingredients,
    benefits: form.benefits,
    skinTypes: form.skinTypes,
    concerns: form.concerns,
    ...(form.image ? { image: form.image } : {}),
    ...(form.hoverImage ? { hoverImage: form.hoverImage } : {}),
    ...(form.productsPageImage ? { productsPageImage: form.productsPageImage } : {}),
    ...(form.productsPageHoverImage ? { productsPageHoverImage: form.productsPageHoverImage } : {}),
    removedImageFields: form.removedImageFields || [],
    variants,
    gallery_images: galleryImages,
    galleryImages: galleryImages.map((image) => image.image_url),
    videoUrl: form.videoUrl || "",
    usageVideo: form.usageVideo || null,
    usageVideoPoster: form.usageVideoPoster || null,
    sizes: parsedSizes,
    badge: createLocalizedCopy(form.label || "Featured", form.labelAr || "مميز"),
    status: form.active ? "Active" : "Inactive",
    isActive: form.active,
    visible: form.visible,
    isVisible: form.visible,
    isFeatured: form.featured,
    isNewArrival: form.newArrival,
    isBestseller: form.bestseller,
    featured: Boolean(form.featured),
    newArrival: Boolean(form.newArrival),
    bestseller: Boolean(form.bestseller),
    stockQty: variants.length
      ? variants.reduce((sum, variant) => sum + variant.stock, 0)
      : parseRequiredStock(form.stockQty, "Product stock"),
    stockStatus:
      (variants.length
        ? variants.reduce((sum, variant) => sum + variant.stock, 0)
        : parseRequiredStock(form.stockQty, "Product stock")) > 0
        ? "In Stock"
        : "Out of Stock",
    metaTitle: form.metaTitle,
    metaDescription: form.metaDescription,
    detailSectionImages: Object.fromEntries([
      ["howItWorks", form.dsiHowItWorks], ["howItWorks1", form.dsiHowItWorks1],
      ["howItWorks2", form.dsiHowItWorks2], ["howItWorks3", form.dsiHowItWorks3],
      ["impact", form.dsiImpact], ["impact1", form.dsiImpact1], ["impact2", form.dsiImpact2],
      ["safeToUse", form.dsiSafeToUse], ["practicalBanner", form.dsiPracticalBanner],
      ["ingredients", form.dsiIngredients], ["faq", form.dsiFaq], ["mainImage", form.dsiMainImage],
    ].filter(([, value]) => Boolean(value))),
    detailStatements: form.detailStatements || [],
    createdAt: form.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  if (form.clearGalleryImages) product.clearGalleryImages = true;
  return product;
}