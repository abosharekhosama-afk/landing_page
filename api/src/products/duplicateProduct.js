/**
 * Server-side product duplication (Decision 13 + Decision 21).
 * Media strategy: reference existing media URLs only — never deep-copy assets.
 */

function localizedCopyName(name) {
  if (!name || typeof name !== "object") {
    const base = String(name || "Product").trim() || "Product";
    return { en: `${base} (Copy)`, ar: `${base} (نسخة)` };
  }
  const en = String(name.en || name.ar || "Product").trim() || "Product";
  const ar = String(name.ar || name.en || en).trim() || en;
  return {
    ...name,
    en: / \(Copy\)$/i.test(en) ? en : `${en} (Copy)`,
    ar: / \(نسخة\)$/.test(ar) ? ar : `${ar} (نسخة)`,
  };
}

function uniqueAmong(base, taken, { separator = "-", maxAttempts = 500 } = {}) {
  const seed = String(base || "copy").trim() || "copy";
  if (!taken.has(seed)) return seed;
  for (let index = 2; index < maxAttempts + 2; index += 1) {
    const candidate = `${seed}${separator}${index}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${seed}${separator}${Date.now()}`;
}

function collectTakenValues(products, field) {
  const taken = new Set();
  for (const product of products) {
    const value = product?.[field];
    if (value != null && String(value).trim()) taken.add(String(value).trim());
  }
  return taken;
}

function duplicateVariants(sourceVariants, newProductId) {
  const variants = Array.isArray(sourceVariants) ? sourceVariants : [];
  return variants.map((variant, index) => {
    const next = {
      ...variant,
      id: `${newProductId}-variant-${index}-${Date.now()}`,
      // Decision 21: keep existing image URL references; do not upload/copy files.
      image_url: variant.image_url || variant.imageUrl || variant.image || "",
      imageUrl: undefined,
      image: undefined,
    };
    if (variant.sku) {
      next.sku = `${String(variant.sku).trim()}-copy`;
    }
    return next;
  });
}

/**
 * Build a new product payload from a source product.
 * Caller must persist via existing save path and enforce tenant/auth.
 */
export function buildDuplicatedProduct(source, { existingProducts = [], now = new Date() } = {}) {
  if (!source || !source.id) {
    const error = new Error("Source product not found.");
    error.statusCode = 404;
    throw error;
  }

  const timestamp = now instanceof Date ? now.getTime() : Date.now();
  const iso = now instanceof Date ? now.toISOString() : new Date(now).toISOString();
  const newId = `product-${timestamp}`;
  const takenSlugs = collectTakenValues(existingProducts, "slug");
  const takenSkus = collectTakenValues(existingProducts, "sku");
  const baseSlug = String(source.slug || source.id || "product").trim() || "product";
  const baseSku = String(source.sku || source.id || "SKU").trim() || "SKU";
  const slug = uniqueAmong(`${baseSlug}-copy`, takenSlugs);
  const sku = uniqueAmong(`${baseSku}-copy`, takenSkus);

  const gallery = Array.isArray(source.gallery_images)
    ? source.gallery_images
    : Array.isArray(source.galleryImages)
      ? source.galleryImages.map((url, index) => ({ id: `gallery-${index}`, image_url: url, sort_order: index }))
      : [];

  const duplicated = {
    ...source,
    id: newId,
    slug,
    sku,
    name: localizedCopyName(source.name),
    // Media URLs are referenced as-is (Decision 21).
    image: source.image || source.primaryImage || source.primary_image || "",
    hoverImage: source.hoverImage || source.secondaryImage || source.secondary_image || "",
    productsPageImage: source.productsPageImage || "",
    productsPageHoverImage: source.productsPageHoverImage || "",
    usageVideo: source.usageVideo || source.usage_video || null,
    usageVideoPoster: source.usageVideoPoster || source.usage_video_poster || null,
    gallery_images: gallery.map((entry, index) => {
      if (typeof entry === "string") {
        return { id: `${newId}-gallery-${index}`, image_url: entry, sort_order: index };
      }
      return {
        ...entry,
        id: `${newId}-gallery-${index}`,
        image_url: entry.image_url || entry.image || entry.url || "",
        sort_order: Number(entry.sort_order ?? entry.sortOrder ?? index),
      };
    }),
    variants: duplicateVariants(source.variants, newId),
    isActive: source.isActive !== false,
    visible: source.visible !== false,
    createdAt: iso,
    updatedAt: iso,
  };

  delete duplicated.company_id;
  delete duplicated.companyId;
  delete duplicated.salesCount;
  delete duplicated.clearGalleryImages;
  delete duplicated.removedImageFields;

  return duplicated;
}
