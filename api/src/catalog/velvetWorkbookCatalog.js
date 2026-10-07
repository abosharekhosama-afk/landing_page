/**
 * Velvet workbook catalog planning helpers.
 * Pure functions — no DB writes. Used by the staging import script and tests.
 */

export const VELVET_COMPANY_ID = "kids-velvet";
export const VELVET_SITE_ID = "kids-velvet-storefront";
export const OUTSIDE_TREE_PRODUCT_IDS = Object.freeze(["75", "76", "781", "810", "811", "815"]);

function asText(value) {
  if (value == null) return "";
  if (typeof value === "number" && Number.isFinite(value) && Number.isInteger(value)) return String(value);
  if (typeof value === "number" && Number.isFinite(value) && Number.isInteger(value + 0) && value % 1 === 0) {
    return String(Math.trunc(value));
  }
  const text = String(value).trim();
  if (/^\d+\.0$/.test(text)) return text.slice(0, -2);
  return text;
}

export function normalizeWorkbookProductId(value) {
  const text = asText(value);
  if (!/^\d+$/.test(text)) return "";
  return text;
}

export function slugifyProductTitle(title, sourceProductId) {
  const base = String(title || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  const id = normalizeWorkbookProductId(sourceProductId);
  // Always include the canonical source ID so Latin/Arabic titles cannot collide.
  return base ? `velvet-${id}-${base}` : `velvet-${id}`;
}

export function getSourceProductId(product) {
  if (!product || typeof product !== "object") return "";
  const direct = product.sourceProductId ?? product.data?.sourceProductId;
  return normalizeWorkbookProductId(direct);
}

export function parseWorkbookImportRows(rows = []) {
  const products = [];
  const seen = new Set();
  const duplicates = [];
  for (const row of rows) {
    const sourceProductId = normalizeWorkbookProductId(row.product_id ?? row.sourceProductId);
    if (!sourceProductId) continue;
    if (seen.has(sourceProductId)) {
      duplicates.push(sourceProductId);
      continue;
    }
    seen.add(sourceProductId);
    const brandSlug = asText(row.brand_slug).toLowerCase();
    const mainSlug = asText(row.main_slug).toLowerCase();
    const leafSlug = asText(row.leaf_slug).toLowerCase();
    const title = asText(row.product_title || row.title);
    const link = asText(row.product_link || row.source_url);
    const classificationStatus = asText(row.classification_status);
    const minPriceRaw = row.min_price ?? row.price_min ?? row["أقل سعر"];
    const minPrice = minPriceRaw == null || minPriceRaw === "" ? null : Number(minPriceRaw);
    const variantCountRaw = row.variant_count ?? row["عدد المتغيرات"];
    const variantCount = variantCountRaw == null || variantCountRaw === "" ? null : Number(variantCountRaw);
    const outsideTree = OUTSIDE_TREE_PRODUCT_IDS.includes(sourceProductId)
      || (!mainSlug && !leafSlug);
    products.push({
      sourceProductId,
      title,
      productLink: link,
      brandSlug,
      mainSlug: outsideTree ? "" : mainSlug,
      leafSlug: outsideTree ? "" : leafSlug,
      classificationStatus,
      minPrice: Number.isFinite(minPrice) ? minPrice : null,
      variantCount: Number.isFinite(variantCount) ? variantCount : null,
      outsideTree,
    });
  }
  return { products, duplicates: [...new Set(duplicates)] };
}

export function enrichWorkbookRowsWithCommerceHints(importRows = [], classifiedRows = []) {
  const byId = new Map();
  for (const row of classifiedRows) {
    const id = normalizeWorkbookProductId(row.product_id ?? row["معرف المنتج"] ?? row.id);
    if (!id) continue;
    byId.set(id, row);
  }
  return importRows.map((row) => {
    const id = normalizeWorkbookProductId(row.product_id);
    const classified = byId.get(id) || {};
    return {
      ...row,
      min_price: row.min_price ?? classified["أقل سعر"] ?? classified.min_price,
      variant_count: row.variant_count ?? classified["عدد المتغيرات"] ?? classified.variant_count,
      product_title: row.product_title || classified["اسم المنتج"] || classified.product_title,
      product_link: row.product_link || classified["رابط المنتج"] || classified.product_link,
    };
  });
}

export function buildTaxonomyIndex(brands = [], categories = []) {
  const brandBySlug = new Map();
  for (const brand of brands) {
    if (brand?.isActive === false) continue;
    brandBySlug.set(String(brand.slug || "").toLowerCase(), brand);
  }
  const mainsByBrandSlug = new Map();
  const subsByMainId = new Map();
  for (const category of categories) {
    if (category?.isActive === false) continue;
    if (!category.parentId) {
      const brand = brands.find((entry) => entry.id === category.brandId);
      const brandSlug = String(brand?.slug || "").toLowerCase();
      if (!brandSlug) continue;
      if (!mainsByBrandSlug.has(brandSlug)) mainsByBrandSlug.set(brandSlug, new Map());
      mainsByBrandSlug.get(brandSlug).set(String(category.slug || "").toLowerCase(), category);
    } else {
      if (!subsByMainId.has(category.parentId)) subsByMainId.set(category.parentId, new Map());
      subsByMainId.get(category.parentId).set(String(category.slug || "").toLowerCase(), category);
    }
  }
  return { brandBySlug, mainsByBrandSlug, subsByMainId };
}

function findBySlugCandidates(map, desiredSlug, compositeCandidates = []) {
  const desired = String(desiredSlug || "").toLowerCase();
  if (!desired || !(map instanceof Map)) return null;
  if (map.has(desired)) return map.get(desired);
  for (const candidate of compositeCandidates) {
    const key = String(candidate || "").toLowerCase();
    if (key && map.has(key)) return map.get(key);
  }
  const suffix = `-${desired}`;
  const matches = [...map.entries()]
    .filter(([slug]) => slug === desired || slug.endsWith(suffix))
    .map(([, value]) => value);
  if (matches.length === 1) return matches[0];
  return null;
}

export function resolveWorkbookTaxonomy(product, taxonomyIndex) {
  const errors = [];
  const brand = taxonomyIndex.brandBySlug.get(product.brandSlug);
  if (!brand) {
    errors.push(`Unknown brand_slug "${product.brandSlug}" for product ${product.sourceProductId}.`);
    return { errors, brandId: null, mainCategoryId: null, subcategoryId: null, categoryId: null };
  }
  if (product.outsideTree) {
    return {
      errors,
      brandId: brand.id,
      mainCategoryId: null,
      subcategoryId: null,
      categoryId: null,
      velvetPath: { brandId: brand.slug, categoryId: null, subcategoryId: null },
    };
  }
  const mains = taxonomyIndex.mainsByBrandSlug.get(product.brandSlug) || new Map();
  const main = findBySlugCandidates(
    mains,
    product.mainSlug,
    [`${product.brandSlug}-${product.mainSlug}`],
  );
  if (!main) {
    errors.push(
      `Unknown main_slug "${product.mainSlug}" under brand "${product.brandSlug}" for product ${product.sourceProductId}.`,
    );
    return { errors, brandId: brand.id, mainCategoryId: null, subcategoryId: null, categoryId: null };
  }
  const subs = taxonomyIndex.subsByMainId.get(main.id) || new Map();
  const sub = findBySlugCandidates(
    subs,
    product.leafSlug,
    [
      `${product.brandSlug}-${product.mainSlug}-${product.leafSlug}`,
      `${main.slug}-${product.leafSlug}`,
    ],
  );
  if (!sub) {
    errors.push(
      `Unknown leaf_slug "${product.leafSlug}" under main "${product.mainSlug}" / brand "${product.brandSlug}" for product ${product.sourceProductId}.`,
    );
    return { errors, brandId: brand.id, mainCategoryId: main.id, subcategoryId: null, categoryId: null };
  }
  return {
    errors,
    brandId: brand.id,
    mainCategoryId: main.id,
    subcategoryId: sub.id,
    categoryId: sub.id,
    velvetPath: {
      brandId: brand.slug,
      categoryId: main.slug,
      subcategoryId: sub.slug,
    },
  };
}

export function buildProductPayload(workbookProduct, taxonomy) {
  const title = workbookProduct.title || `Velvet product ${workbookProduct.sourceProductId}`;
  const slug = slugifyProductTitle(title, workbookProduct.sourceProductId);
  const price = workbookProduct.minPrice;
  return {
    // Stable deterministic id for create; updates reuse existing.id separately.
    id: `velvet-src-${workbookProduct.sourceProductId}`,
    slug,
    name: { en: title, ar: title },
    nameEn: title,
    nameAr: title,
    sku: "",
    brandId: taxonomy.brandId,
    categoryId: taxonomy.categoryId,
    mainCategoryId: taxonomy.mainCategoryId,
    subcategoryId: taxonomy.subcategoryId,
    velvetPath: taxonomy.velvetPath || null,
    sourceProductId: workbookProduct.sourceProductId,
    sourceProductUrl: workbookProduct.productLink || "",
    classificationStatus: workbookProduct.classificationStatus || "",
    workbookVariantCount: workbookProduct.variantCount,
    price: price == null ? undefined : price,
    image: "",
    hoverImage: "",
    galleryImages: [],
    gallery_images: [],
    variants: [],
    sizes: [],
    shortDescription: { en: "", ar: "" },
    fullDescription: "",
    fullDescriptionAr: "",
    isActive: true,
    active: true,
    visible: true,
    featured: false,
    fallbackImage: "/images/products/product-placeholder.svg",
  };
}

export function planVelvetWorkbookImport({
  workbookProducts = [],
  existingProducts = [],
  brands = [],
  categories = [],
  removeNonWorkbookProducts = true,
}) {
  const taxonomyIndex = buildTaxonomyIndex(brands, categories);
  const existingBySourceId = new Map();
  for (const product of existingProducts) {
    const sourceId = getSourceProductId(product);
    if (!sourceId) continue;
    if (existingBySourceId.has(sourceId)) {
      existingBySourceId.get(sourceId).push(product);
    } else {
      existingBySourceId.set(sourceId, [product]);
    }
  }

  const workbookSourceIds = new Set(workbookProducts.map((item) => item.sourceProductId));
  const wouldRemove = [];
  if (removeNonWorkbookProducts) {
    for (const product of existingProducts) {
      const sourceId = getSourceProductId(product);
      if (!sourceId || !workbookSourceIds.has(sourceId)) {
        wouldRemove.push({
          id: product.id,
          slug: product.slug,
          sku: product.sku || "",
          sourceProductId: sourceId || null,
          reason: sourceId ? "sourceProductId not in workbook" : "no sourceProductId (legacy/demo/manual)",
        });
      }
    }
  }

  const wouldCreate = [];
  const wouldUpdate = [];
  const wouldSkip = [];
  const taxonomyErrors = [];
  const missingRequiredFields = [];
  const seenSlugs = new Set();

  for (const workbookProduct of workbookProducts) {
    if (!workbookProduct.sourceProductId) {
      missingRequiredFields.push({ product: workbookProduct, field: "sourceProductId" });
      continue;
    }
    if (!workbookProduct.title) {
      missingRequiredFields.push({ sourceProductId: workbookProduct.sourceProductId, field: "title" });
      continue;
    }
    if (!workbookProduct.brandSlug) {
      missingRequiredFields.push({ sourceProductId: workbookProduct.sourceProductId, field: "brandSlug" });
      continue;
    }
    if (!workbookProduct.outsideTree && (!workbookProduct.mainSlug || !workbookProduct.leafSlug)) {
      missingRequiredFields.push({
        sourceProductId: workbookProduct.sourceProductId,
        field: "mainSlug/leafSlug",
      });
      continue;
    }

    const taxonomy = resolveWorkbookTaxonomy(workbookProduct, taxonomyIndex);
    if (taxonomy.errors.length) {
      taxonomyErrors.push(...taxonomy.errors);
      continue;
    }

    const payload = buildProductPayload(workbookProduct, taxonomy);
    if (seenSlugs.has(payload.slug)) {
      taxonomyErrors.push(`Duplicate generated slug "${payload.slug}" for product ${workbookProduct.sourceProductId}.`);
      continue;
    }
    seenSlugs.add(payload.slug);

    const matches = existingBySourceId.get(workbookProduct.sourceProductId) || [];
    if (matches.length > 1) {
      taxonomyErrors.push(
        `Ambiguous existing products for sourceProductId ${workbookProduct.sourceProductId}: ${matches.map((item) => item.id).join(", ")}`,
      );
      continue;
    }
    if (matches.length === 1) {
      wouldUpdate.push({
        existingId: matches[0].id,
        sourceProductId: workbookProduct.sourceProductId,
        payload: { ...payload, id: matches[0].id },
      });
      continue;
    }

    // Also skip create if a non-source product with same deterministic id already exists
    // and is scheduled for removal — removal happens first on apply.
    wouldCreate.push({
      sourceProductId: workbookProduct.sourceProductId,
      payload,
    });
  }

  return {
    CURRENT_PRODUCTS: existingProducts.length,
    WOULD_REMOVE: wouldRemove,
    WOULD_CREATE: wouldCreate,
    WOULD_UPDATE: wouldUpdate,
    WOULD_SKIP: wouldSkip,
    TAXONOMY_ERRORS: taxonomyErrors,
    MISSING_REQUIRED_FIELDS: missingRequiredFields,
    SOURCE_PRODUCT_IDS_UNIQUE: workbookSourceIds.size,
    FULLY_CLASSIFIED: workbookProducts.filter((item) => !item.outsideTree).length,
    BRAND_ONLY: workbookProducts.filter((item) => item.outsideTree).length,
    summary: {
      CURRENT_PRODUCTS: existingProducts.length,
      WOULD_REMOVE: wouldRemove.length,
      WOULD_CREATE: wouldCreate.length,
      WOULD_UPDATE: wouldUpdate.length,
      WOULD_SKIP: wouldSkip.length,
      TAXONOMY_ERRORS: taxonomyErrors.length,
      MISSING_REQUIRED_FIELDS: missingRequiredFields.length,
      SOURCE_PRODUCT_IDS_UNIQUE: workbookSourceIds.size,
      FULLY_CLASSIFIED: workbookProducts.filter((item) => !item.outsideTree).length,
      BRAND_ONLY: workbookProducts.filter((item) => item.outsideTree).length,
    },
  };
}

export function isCleanImportPlan(plan) {
  return plan.TAXONOMY_ERRORS.length === 0
    && plan.MISSING_REQUIRED_FIELDS.length === 0
    && plan.summary.WOULD_CREATE + plan.summary.WOULD_UPDATE > 0;
}
