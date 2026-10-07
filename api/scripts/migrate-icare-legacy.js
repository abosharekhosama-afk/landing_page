import crypto from "node:crypto";

const SOURCE_URL = (process.env.ICARE_LEGACY_SOURCE_URL || "https://backend.igroup.website").replace(/\/$/, "");
const TARGET_URL = (process.env.ICARE_MIGRATION_TARGET_URL || "").replace(/\/$/, "");
const TOKEN = process.env.ICARE_MIGRATION_TOKEN || "";
const APPLY = process.argv.includes("--apply");
const COMPANY_ID = "icare";
const STOREFRONT_HOST = "igroup.website";
const STOREFRONT_PATH = "/icare";
const ALLOWED_TARGET_HOST = "cg8hv00dppir2hu99ds4p75h.187.55.225.56.sslip.io";

function assertSafeConfiguration() {
  if (!TARGET_URL) {
    throw new Error("ICARE_MIGRATION_TARGET_URL is required.");
  }
  const target = new URL(TARGET_URL);
  if (target.protocol !== "http:" && target.protocol !== "https:") {
    throw new Error("Migration target must use HTTP or HTTPS.");
  }
  if (/(^|\.)backend\.igroup\.website$/i.test(target.hostname)) {
    throw new Error("The verified legacy source cannot be used as the migration target.");
  }
  if (target.hostname !== ALLOWED_TARGET_HOST) {
    throw new Error(`Migration target must be the approved staging API host: ${ALLOWED_TARGET_HOST}.`);
  }
  if (APPLY && !TOKEN) {
    throw new Error("ICARE_MIGRATION_TOKEN is required with --apply.");
  }
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function unwrap(payload) {
  if (Array.isArray(payload)) return payload;
  if (!isRecord(payload)) return payload;
  if (isRecord(payload.data) && Array.isArray(payload.data.data)) return payload.data.data;
  if (Array.isArray(payload.data)) return payload.data;
  return payload.data ?? payload;
}

async function jsonRequest(url, init = {}) {
  const response = await fetch(url, init);
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`${url} returned invalid JSON (HTTP ${response.status}).`);
  }
  if (!response.ok) {
    throw new Error(`${url} failed (HTTP ${response.status}): ${body?.message || text || response.statusText}`);
  }
  return body;
}

async function legacy(path) {
  return unwrap(await jsonRequest(`${SOURCE_URL}${path}`));
}

async function target(path, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("X-Company-Id", COMPANY_ID);
  if (TOKEN) headers.set("Authorization", `Bearer ${TOKEN}`);
  if (init.body) headers.set("Content-Type", "application/json");
  return jsonRequest(`${TARGET_URL}${path}`, { ...init, headers });
}

function localized(value) {
  if (typeof value === "string") return { en: value, ar: value };
  if (!isRecord(value)) return { en: "", ar: "" };
  return {
    en: typeof value.en === "string" ? value.en : "",
    ar: typeof value.ar === "string" ? value.ar : "",
  };
}

function plainLocalized(value) {
  const result = localized(value);
  return result.en || result.ar;
}

function slug(value, fallback) {
  const normalized = String(value || fallback || "")
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "");
  return normalized || fallback;
}

function absoluteLegacyUrl(value) {
  if (typeof value !== "string" || !value.trim()) return "";
  return new URL(value, SOURCE_URL).toString();
}

function deterministicId(kind, legacyId, index = "") {
  const suffix = crypto
    .createHash("sha256")
    .update(`${COMPANY_ID}:${kind}:${legacyId}:${index}`)
    .digest("hex")
    .slice(0, 20);
  return `legacy-${kind}-${suffix}`;
}

function reportBucket() {
  return { source: 0, before: 0, create: 0, update: 0, skip: 0, failed: 0, after: null };
}

const report = {
  mode: APPLY ? "apply" : "dry-run",
  source: SOURCE_URL,
  target: TARGET_URL,
  companyId: COMPANY_ID,
  entities: {
    categories: reportBucket(),
    brands: reportBucket(),
    products: reportBucket(),
    websiteTexts: reportBucket(),
    websiteMedia: reportBucket(),
    homepageOffers: reportBucket(),
    categoryCards: reportBucket(),
    customers: reportBucket(),
    orders: reportBucket(),
  },
  images: { checked: 0, accessible: 0, failed: [] },
  unsupported: [],
  errors: [],
};
const pendingImageAudits = [];
const queuedImageUrls = new Set();

async function write(method, path, body) {
  if (!APPLY) return null;
  return target(path, { method, body: JSON.stringify(body) });
}

async function auditImage(url, entity) {
  if (!url || queuedImageUrls.has(url)) return;
  queuedImageUrls.add(url);
  pendingImageAudits.push({ url, entity });
}

async function runImageAudits() {
  report.images.checked = pendingImageAudits.length;
  let cursor = 0;
  const worker = async () => {
    while (cursor < pendingImageAudits.length) {
      const { url, entity } = pendingImageAudits[cursor++];
      try {
        let response;
        try {
          response = await fetch(url, {
            method: "HEAD",
            redirect: "follow",
            signal: AbortSignal.timeout(5000),
          });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
        } catch {
          response = await fetch(url, {
            method: "GET",
            headers: { Range: "bytes=0-0" },
            redirect: "follow",
            signal: AbortSignal.timeout(10000),
          });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          await response.body?.cancel();
        }
        report.images.accessible += 1;
      } catch (error) {
        report.images.failed.push({ entity, url, error: error.message });
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(8, pendingImageAudits.length) }, worker));
}

async function migrateCategories(sourceRows, targetRows) {
  const bucket = report.entities.categories;
  bucket.source = sourceRows.length;
  bucket.before = targetRows.length;
  const bySlug = new Map(targetRows.map((row) => [row.slug, row]));
  const idMap = new Map();
  const planned = [];

  for (const source of sourceRows) {
    const normalizedSlug = slug(source.slug, `category-${source.id}`);
    const body = {
      slug: normalizedSlug,
      name: localized(source.name),
      description: localized(source.description),
      parentId: null,
      imageUrl: absoluteLegacyUrl(source.image) || null,
      sortOrder: Number(source.sortOrder || 0),
      isActive: source.isActive !== false,
    };
    const existing = bySlug.get(normalizedSlug);
    try {
      const saved = existing
        ? await write("PATCH", `/api/categories/${encodeURIComponent(existing.id)}`, body) || existing
        : await write("POST", "/api/categories", body) || { ...body, id: `dry-category-${source.id}` };
      bucket[existing ? "update" : "create"] += 1;
      bySlug.set(normalizedSlug, saved);
      idMap.set(String(source.id), saved.id);
      planned.push({ source, saved });
      await auditImage(body.imageUrl, `category:${source.id}`);
    } catch (error) {
      bucket.failed += 1;
      report.errors.push({ entity: "category", id: source.id, error: error.message });
    }
  }

  for (const { source, saved } of planned) {
    const parentId = source.parentId == null ? null : idMap.get(String(source.parentId));
    if (source.parentId != null && !parentId) {
      bucket.failed += 1;
      report.errors.push({ entity: "category-parent", id: source.id, error: `Parent ${source.parentId} was not migrated.` });
      continue;
    }
    if (parentId && APPLY) {
      try {
        await write("PATCH", `/api/categories/${encodeURIComponent(saved.id)}`, { parentId });
      } catch (error) {
        bucket.failed += 1;
        report.errors.push({ entity: "category-parent", id: source.id, error: error.message });
      }
    }
  }
  return idMap;
}

async function migrateBrands(sourceRows, targetRows) {
  const bucket = report.entities.brands;
  bucket.source = sourceRows.length;
  bucket.before = targetRows.length;
  const bySlug = new Map(targetRows.map((row) => [row.slug, row]));
  const idMap = new Map();

  for (const source of sourceRows) {
    let normalizedSlug = slug(source.slug, `brand-${source.id}`);
    const collision = bySlug.get(normalizedSlug);
    if (collision && plainLocalized(collision.name).toLowerCase() !== plainLocalized(source.name).toLowerCase()) {
      normalizedSlug = `${normalizedSlug}-${source.id}`;
    }
    const body = {
      slug: normalizedSlug,
      name: plainLocalized(source.name) || `Brand ${source.id}`,
      logoUrl: absoluteLegacyUrl(source.logo) || null,
      country: plainLocalized(source.country) || null,
      sortOrder: Number(source.sortOrder || 0),
      isActive: source.isActive !== false,
    };
    const existing = bySlug.get(normalizedSlug);
    try {
      const saved = existing
        ? await write("PATCH", `/api/brands/${encodeURIComponent(existing.id)}`, body) || existing
        : await write("POST", "/api/brands", body) || { ...body, id: `dry-brand-${source.id}` };
      bucket[existing ? "update" : "create"] += 1;
      bySlug.set(normalizedSlug, saved);
      idMap.set(String(source.id), saved.id);
      await auditImage(body.logoUrl, `brand:${source.id}`);
    } catch (error) {
      bucket.failed += 1;
      report.errors.push({ entity: "brand", id: source.id, error: error.message });
    }
  }
  return idMap;
}

function productBody(source, categoryMap, brandMap) {
  const gallery = (Array.isArray(source.images) ? source.images : [])
    .map((image, index) => ({
      id: deterministicId("gallery", source.id, image.id ?? index),
      image_url: absoluteLegacyUrl(image.imageUrl),
      sort_order: Number(image.sortOrder ?? index),
    }))
    .filter((image) => image.image_url);
  const variants = (Array.isArray(source.variants) ? source.variants : [])
    .map((variant, index) => ({
      id: deterministicId("variant", source.id, variant.id ?? index),
      color_name: plainLocalized(variant.name) || `Option ${index + 1}`,
      color_value: variant.colorCode || "",
      size: plainLocalized(variant.size) || plainLocalized(source.size) || "Default",
      price: Number(variant.price ?? source.primaryPrice ?? source.price ?? 0),
      stock: Math.max(0, Number(variant.stockQuantity ?? source.stockQuantity ?? 0)),
      image_url: absoluteLegacyUrl(variant.image),
      sort_order: index,
      isActive: variant.isActive !== false,
    }));
  const primary = absoluteLegacyUrl(source.primaryImage) || gallery[0]?.image_url || "";
  const hover = absoluteLegacyUrl(source.secondaryImage) || gallery[1]?.image_url || "";
  return {
    id: deterministicId("product", source.id),
    slug: slug(source.slug, `product-${source.id}`),
    name: localized(source.name),
    sku: source.sku || "",
    shortDescription: localized(source.shortDescription),
    description: localized(source.description),
    howToUse: localized(source.howToUse),
    ingredients: Array.isArray(source.ingredients) ? source.ingredients : [],
    benefits: Array.isArray(source.benefits) ? source.benefits : [],
    skinTypes: Array.isArray(source.skinTypes) ? source.skinTypes : [],
    concerns: Array.isArray(source.concerns) ? source.concerns : [],
    categoryId: categoryMap.get(String(source.categoryId)) || null,
    brandId: brandMap.get(String(source.brandId)) || null,
    price: Number(source.price ?? source.primaryPrice ?? 0),
    primaryPrice: Number(source.primaryPrice ?? source.price ?? 0),
    primarySalePrice: source.primarySalePrice == null ? null : Number(source.primarySalePrice),
    image: primary,
    hoverImage: hover,
    variants,
    gallery_images: gallery,
    featured: source.isFeatured === true,
    newArrival: source.isNew === true,
    bestseller: source.isBestseller === true,
    isActive: source.isActive !== false,
    visible: source.isActive !== false,
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  };
}

async function migrateProducts(sourceRows, targetRows, categoryMap, brandMap) {
  const bucket = report.entities.products;
  bucket.source = sourceRows.length;
  bucket.before = targetRows.length;
  const bySlug = new Map(targetRows.map((row) => [row.slug, row]));

  for (const source of sourceRows) {
    const body = productBody(source, categoryMap, brandMap);
    if (source.categoryId != null && !body.categoryId) {
      bucket.failed += 1;
      report.errors.push({ entity: "product", id: source.id, error: `Category ${source.categoryId} was not migrated.` });
      continue;
    }
    if (source.brandId != null && !body.brandId) {
      bucket.failed += 1;
      report.errors.push({ entity: "product", id: source.id, error: `Brand ${source.brandId} was not migrated.` });
      continue;
    }
    const existing = bySlug.get(body.slug);
    try {
      const saved = existing
        ? await write("PUT", `/api/products/${encodeURIComponent(existing.id)}`, { ...body, id: existing.id }) || existing
        : await write("POST", "/api/products", body) || body;
      bucket[existing ? "update" : "create"] += 1;
      bySlug.set(body.slug, saved);
      await auditImage(body.image, `product:${source.id}:primary`);
      await auditImage(body.hoverImage, `product:${source.id}:hover`);
      for (const image of body.gallery_images) await auditImage(image.image_url, `product:${source.id}:gallery`);
    } catch (error) {
      bucket.failed += 1;
      report.errors.push({ entity: "product", id: source.id, error: error.message });
    }
  }
}

function flattenSettings(settings) {
  const result = {};
  for (const values of Object.values(isRecord(settings) ? settings : {})) {
    if (!isRecord(values)) continue;
    for (const [key, value] of Object.entries(values)) {
      if (!Object.hasOwn(result, key)) {
        result[key] = typeof value === "string" ? value : JSON.stringify(value);
      }
    }
  }
  return result;
}

function isMediaKey(key, value) {
  return /(^|_)(image|logo|favicon)(_|$)/i.test(key)
    && typeof value === "string"
    && Boolean(value.trim());
}

async function migrateContent(content, settings, existingTexts, existingMedia) {
  const en = isRecord(content?.en) ? content.en : {};
  const ar = isRecord(content?.ar) ? content.ar : {};
  const flattened = flattenSettings(settings?.settings);
  const keys = new Set([...Object.keys(en), ...Object.keys(ar), ...Object.keys(flattened)]);
  const textByKey = new Map(existingTexts.map((row) => [row.key, row]));
  const mediaByKey = new Map(existingMedia.map((row) => [row.sectionKey, row]));
  report.entities.websiteTexts.before = existingTexts.length;
  report.entities.websiteMedia.before = existingMedia.length;

  for (const key of keys) {
    const valueEn = typeof en[key] === "string" ? en[key] : flattened[key] || "";
    const valueAr = typeof ar[key] === "string" ? ar[key] : "";
    if (isMediaKey(key, valueEn || valueAr)) {
      const bucket = report.entities.websiteMedia;
      bucket.source += 1;
      const existing = mediaByKey.get(key);
      const body = {
        id: existing?.id || deterministicId("website-media", key),
        sectionKey: key,
        sectionLabel: key.replace(/[._-]+/g, " "),
        groupKey: key.split(/[._-]/)[0] || "general",
        imageUrl: absoluteLegacyUrl(valueEn || valueAr),
        fallbackImageUrl: "",
        sortOrder: 0,
        isActive: true,
      };
      try {
        if (existing) await write("PUT", `/api/website-media/${encodeURIComponent(existing.id)}`, body);
        else await write("POST", "/api/website-media", body);
        bucket[existing ? "update" : "create"] += 1;
        await auditImage(body.imageUrl, `website-media:${key}`);
      } catch (error) {
        bucket.failed += 1;
        report.errors.push({ entity: "website-media", id: key, error: error.message });
      }
      continue;
    }

    const bucket = report.entities.websiteTexts;
    bucket.source += 1;
    const existing = textByKey.get(key);
    const body = {
      id: existing?.id || deterministicId("website-text", key),
      key,
      group: key.split(/[._-]/)[0] || "general",
      label: key.replace(/[._-]+/g, " "),
      valueEn,
      valueAr,
      isActive: true,
      sortOrder: 0,
    };
    try {
      await write("POST", "/api/admin/website-texts", body);
      bucket[existing ? "update" : "create"] += 1;
    } catch (error) {
      bucket.failed += 1;
      report.errors.push({ entity: "website-text", id: key, error: error.message });
    }
  }
}

async function collectSource() {
  const [products, categories, brands, content, settings] = await Promise.all([
    legacy("/api/v1/products?page=1&limit=100"),
    legacy("/api/v1/categories?page=1&limit=100"),
    legacy("/api/v1/brands?page=1&limit=100"),
    legacy("/api/v1/content"),
    legacy("/api/v1/settings"),
  ]);
  return {
    products: Array.isArray(products) ? products : [],
    categories: Array.isArray(categories) ? categories : [],
    brands: Array.isArray(brands) ? brands : [],
    content: isRecord(content) ? content : {},
    settings: isRecord(settings) ? settings : {},
  };
}

async function collectTarget({ authenticated = false } = {}) {
  const [products, categories, brands, texts, media] = await Promise.all([
    target("/api/products"),
    target("/api/categories"),
    target("/api/brands"),
    authenticated ? target("/api/admin/website-texts") : target("/api/website-texts"),
    authenticated ? target("/api/website-media/all") : target("/api/website-media"),
  ]);
  return {
    products: Array.isArray(products) ? products : [],
    categories: Array.isArray(categories) ? categories : [],
    brands: Array.isArray(brands) ? brands : [],
    texts: Array.isArray(texts) ? texts : [],
    media: Array.isArray(media) ? media : Array.isArray(media?.items) ? media.items : [],
  };
}

async function main() {
  assertSafeConfiguration();
  const resolver = new URL("/api/company/resolve-storefront", TARGET_URL);
  resolver.searchParams.set("host", STOREFRONT_HOST);
  resolver.searchParams.set("path", STOREFRONT_PATH);
  const company = await jsonRequest(resolver);
  if (company?.id !== COMPANY_ID || company?.status !== "active") {
    throw new Error("The target storefront does not resolve to the active iCare company.");
  }

  const [source, before] = await Promise.all([
    collectSource(),
    collectTarget({ authenticated: APPLY }),
  ]);
  const categoryMap = await migrateCategories(source.categories, before.categories);
  const brandMap = await migrateBrands(source.brands, before.brands);
  await migrateProducts(source.products, before.products, categoryMap, brandMap);
  await migrateContent(source.content, source.settings, before.texts, before.media);
  await runImageAudits();

  report.entities.homepageOffers.source = 0;
  report.entities.categoryCards.source = 0;
  report.entities.customers.source = 0;
  report.entities.orders.source = 0;
  report.unsupported.push(
    "The verified legacy public API exposes no homepage-offer or category-card collection.",
    "Legacy customers and orders require old administrator credentials; public endpoints correctly return 401.",
    "Company currency/language were intentionally preserved from the target tenant (ILS/ar) instead of importing legacy USD defaults.",
  );

  if (APPLY) {
    const after = await collectTarget({ authenticated: true });
    report.entities.categories.after = after.categories.length;
    report.entities.brands.after = after.brands.length;
    report.entities.products.after = after.products.length;
    report.entities.websiteTexts.after = after.texts.length;
    report.entities.websiteMedia.after = after.media.length;
  }

  console.log(JSON.stringify(report, null, 2));
  if (report.errors.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exitCode = 1;
});
