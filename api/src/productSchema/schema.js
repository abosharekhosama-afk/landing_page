import { DEFAULT_COMPANY_ID, normalizeCompanyId } from "../tenancy/company.js";

export const PRODUCT_FIELD_TYPES = Object.freeze([
  "text", "textarea", "number", "date", "boolean", "select", "multi_select",
  "url", "image_url", "file_url",
]);

export const PRODUCT_TAB_KEYS = Object.freeze([
  "basic", "variants", "media", "seo", "showcase", "custom_sections",
]);

export const PROTECTED_PRODUCT_FIELD_KEYS = Object.freeze([
  "nameEn", "slug", "categoryId", "brandId", "brand", "active", "featured", "newArrival", "bestseller",
]);

/** Cosmetics/detail-section fields used by the default EB Chemical product form. */
export const COSMETICS_PRODUCT_FIELD_KEYS = Object.freeze([
  "howToUse", "ingredients", "benefits", "skinTypes", "concerns",
]);

export const COSMETICS_MEDIA_FIELD_KEYS = Object.freeze([
  "dsiHowItWorks1", "dsiHowItWorks2", "dsiHowItWorks3",
  "dsiImpact1", "dsiImpact2", "dsiSafeToUse", "dsiPracticalBanner",
  "dsiIngredients", "dsiFaq", "detailStatements",
]);

const types = new Set(PRODUCT_FIELD_TYPES);
const tabs = new Set(PRODUCT_TAB_KEYS);
const protectedKeys = new Set(PROTECTED_PRODUCT_FIELD_KEYS);
const keyPattern = /^[a-z][a-zA-Z0-9_]{1,63}$/;
const optionValuePattern = /^[A-Za-z0-9][A-Za-z0-9_. -]{0,79}$/;
const unsafeTextPattern = /[<>\u0000-\u0008\u000b\u000c\u000e-\u001f]/;
const sensitivePattern = /(password|passwd|token|secret|credential|authorization|api_?key|private_?key)/i;
const builtInProductFieldKeys = new Set([
  "nameEn", "nameAr", "slug", "sku", "categoryId", "brandId", "brand", "shortDescription", "shortDescriptionAr",
  "fullDescription", "fullDescriptionAr", "howToUse", "ingredients", "benefits", "skinTypes", "concerns",
  "active", "featured", "newArrival", "bestseller", "label", "labelAr", "metaTitle", "metaDescription",
]);
const builtInMediaFieldKeys = new Set([
  "image", "hoverImage", "videoUrl", "galleryImages", "detailStatements", "dsiHowItWorks1", "dsiHowItWorks2",
  "dsiHowItWorks3", "dsiImpact1", "dsiImpact2", "dsiSafeToUse", "dsiPracticalBanner", "dsiIngredients", "dsiFaq",
]);
const builtInVariantAttributeKeys = new Set(["color_name", "color_value", "size"]);

function field(key, tab, en, ar, type = "text", options = {}) {
  return {
    key,
    tab,
    label: { en, ar },
    type,
    required: options.required === true,
    enabled: options.enabled !== false,
    storefrontVisible: options.storefrontVisible === true,
    protected: options.protected === true,
    sortOrder: options.sortOrder || 0,
    defaultValue: options.defaultValue ?? (type === "boolean" ? false : ""),
    options: options.options || [],
  };
}

const defaultFields = [
  field("nameEn", "basic", "Product Name", "اسم المنتج", "text", { required: true, protected: true, storefrontVisible: true, sortOrder: 10 }),
  field("nameAr", "basic", "Arabic Product Name", "اسم المنتج بالعربية", "text", { storefrontVisible: true, sortOrder: 20 }),
  field("slug", "basic", "Slug", "الرابط المختصر", "text", { protected: true, sortOrder: 30 }),
  field("sku", "basic", "SKU", "رمز المنتج", "text", { sortOrder: 40 }),
  field("categoryId", "basic", "Category", "الفئة", "select", { required: true, protected: true, sortOrder: 50 }),
  field("brandId", "basic", "Brand ID", "معرف العلامة التجارية", "select", { protected: true, sortOrder: 60 }),
  field("brand", "basic", "Brand", "العلامة التجارية", "text", { protected: true, storefrontVisible: true, sortOrder: 65 }),
  field("shortDescription", "basic", "Short Description", "الوصف المختصر", "textarea", { storefrontVisible: true, sortOrder: 70 }),
  field("shortDescriptionAr", "basic", "Short Description Arabic", "الوصف المختصر بالعربية", "textarea", { enabled: false, storefrontVisible: true, sortOrder: 80 }),
  field("fullDescription", "basic", "Full Description", "الوصف الكامل", "textarea", { storefrontVisible: true, sortOrder: 90 }),
  field("fullDescriptionAr", "basic", "Full Description Arabic", "الوصف الكامل بالعربية", "textarea", { enabled: false, storefrontVisible: true, sortOrder: 100 }),
  field("active", "basic", "Active", "نشط", "boolean", { protected: true, defaultValue: true, sortOrder: 160 }),
  field("featured", "basic", "Featured", "مميز", "boolean", { protected: true, sortOrder: 170 }),
  field("newArrival", "basic", "New Arrival", "وصل حديثاً", "boolean", { protected: true, sortOrder: 180 }),
  field("bestseller", "basic", "Bestseller", "الأكثر مبيعاً", "boolean", { protected: true, sortOrder: 190 }),
  field("label", "basic", "Label", "الشارة", "text", { storefrontVisible: true, sortOrder: 200 }),
  field("labelAr", "basic", "Label Arabic", "الشارة بالعربية", "text", { storefrontVisible: true, sortOrder: 210 }),
  field("metaTitle", "seo", "Meta Title", "عنوان محركات البحث", "text", { sortOrder: 10 }),
  field("metaDescription", "seo", "Meta Description", "وصف محركات البحث", "textarea", { sortOrder: 20 }),
];

const cosmeticsProductFields = [
  field("howToUse", "basic", "How to Use", "طريقة الاستخدام", "textarea", { storefrontVisible: true, sortOrder: 110 }),
  field("ingredients", "basic", "Ingredients", "المكونات", "textarea", { storefrontVisible: true, sortOrder: 120 }),
  field("benefits", "basic", "Benefits", "الفوائد", "textarea", { storefrontVisible: true, sortOrder: 130 }),
  field("skinTypes", "basic", "Skin Types", "أنواع البشرة", "text", { storefrontVisible: true, sortOrder: 140 }),
  field("concerns", "basic", "Concerns", "المشكلات", "text", { storefrontVisible: true, sortOrder: 150 }),
];

const sharedMediaFields = [
  field("image", "media", "Featured Image", "الصورة الرئيسية", "image_url", { storefrontVisible: true, sortOrder: 10 }),
  field("hoverImage", "media", "Second / Hover Image", "الصورة الثانية", "image_url", { storefrontVisible: true, sortOrder: 20 }),
  field("videoUrl", "media", "Video URL", "رابط الفيديو", "url", { storefrontVisible: true, sortOrder: 30 }),
  field("galleryImages", "media", "Vertical Gallery Images", "صور المعرض", "image_url", { storefrontVisible: true, sortOrder: 40 }),
];

const cosmeticsMediaFields = [
  field("dsiHowItWorks1", "media", "How it Works image 1", "صورة طريقة الاستخدام 1", "image_url", { storefrontVisible: true, sortOrder: 50 }),
  field("dsiHowItWorks2", "media", "How it Works image 2", "صورة طريقة الاستخدام 2", "image_url", { storefrontVisible: true, sortOrder: 60 }),
  field("dsiHowItWorks3", "media", "How it Works image 3", "صورة طريقة الاستخدام 3", "image_url", { storefrontVisible: true, sortOrder: 70 }),
  field("dsiImpact1", "media", "Impact section image 1", "صورة الأثر 1", "image_url", { storefrontVisible: true, sortOrder: 80 }),
  field("dsiImpact2", "media", "Impact section image 2", "صورة الأثر 2", "image_url", { storefrontVisible: true, sortOrder: 90 }),
  field("dsiSafeToUse", "media", "Safe to use image", "صورة الاستخدام الآمن", "image_url", { storefrontVisible: true, sortOrder: 100 }),
  field("dsiPracticalBanner", "media", "Practical banner image", "صورة البانر", "image_url", { storefrontVisible: true, sortOrder: 110 }),
  field("dsiIngredients", "media", "Ingredients section image", "صورة المكونات", "image_url", { storefrontVisible: true, sortOrder: 120 }),
  field("dsiFaq", "media", "FAQ side image", "صورة الأسئلة الشائعة", "image_url", { storefrontVisible: true, sortOrder: 130 }),
  field("detailStatements", "media", "Product Details Banner Statements", "عبارات بانر تفاصيل المنتج", "textarea", { storefrontVisible: true, sortOrder: 140 }),
];

const defaultVariantAttributes = [
  field("color_name", "variants", "Color", "اللون", "text", { required: true, storefrontVisible: true, sortOrder: 10 }),
  field("color_value", "variants", "Color value", "قيمة اللون", "text", { storefrontVisible: true, sortOrder: 20 }),
  field("size", "variants", "Size", "الحجم", "text", { required: true, storefrontVisible: true, sortOrder: 30 }),
];

const cosmeticsShowcaseSections = [
  { key: "how_it_works", title: { en: "How it Works", ar: "طريقة الاستخدام" }, enabled: true, storefrontVisible: true, sortOrder: 10, fields: [] },
  { key: "impact", title: { en: "Impact", ar: "الأثر" }, enabled: true, storefrontVisible: true, sortOrder: 20, fields: [] },
  { key: "safe_to_use", title: { en: "Safe to Use", ar: "آمن للاستخدام" }, enabled: true, storefrontVisible: true, sortOrder: 30, fields: [] },
  { key: "ingredients", title: { en: "Ingredients", ar: "المكونات" }, enabled: true, storefrontVisible: true, sortOrder: 40, fields: [] },
  { key: "faq", title: { en: "Frequently Asked Questions", ar: "الأسئلة الشائعة" }, enabled: true, storefrontVisible: true, sortOrder: 50, fields: [] },
];

function buildProductSchema({ fields, mediaFields, showcaseSections }) {
  const tabLabels = {
    basic: { en: "Basic", ar: "الأساسي" }, variants: { en: "Variants", ar: "المتغيرات" },
    media: { en: "Media", ar: "الوسائط" }, seo: { en: "SEO", ar: "تحسين البحث" },
    showcase: { en: "Showcase", ar: "العرض" }, custom_sections: { en: "Custom Sections", ar: "أقسام مخصصة" },
  };
  return JSON.parse(JSON.stringify({
    version: 1,
    tabs: PRODUCT_TAB_KEYS.map((key, index) => ({
      key,
      label: tabLabels[key],
      enabled: key !== "custom_sections" && !(key === "showcase" && !(showcaseSections || []).length),
      protected: key === "basic",
      sortOrder: (index + 1) * 10,
    })),
    fields,
    variantAttributes: defaultVariantAttributes,
    mediaFields,
    showcaseSections: showcaseSections || [],
    storefrontVisibility: { customFields: true, customSections: true },
  }));
}

/** Shared multi-tenant catalog schema (no cosmetics/detail-section fields). */
export function sharedCatalogProductSchema() {
  return buildProductSchema({
    fields: defaultFields,
    mediaFields: sharedMediaFields,
    showcaseSections: [],
  });
}

/** Legacy cosmetics/default-company schema (EB Chemical). */
export function defaultProductSchema() {
  return buildProductSchema({
    fields: [...defaultFields, ...cosmeticsProductFields],
    mediaFields: [...sharedMediaFields, ...cosmeticsMediaFields],
    showcaseSections: cosmeticsShowcaseSections,
  });
}

/**
 * Resolve the default product schema for a company when no stored schema exists.
 * Uses the platform default-company profile for cosmetics fields — not tenant hardcoding
 * of non-default companies.
 */
export function resolveDefaultProductSchema(companyId) {
  return normalizeCompanyId(companyId) === DEFAULT_COMPANY_ID
    ? defaultProductSchema()
    : sharedCatalogProductSchema();
}

export function isProductSchemaFieldEnabled(schema, fieldKey) {
  const key = String(fieldKey || "");
  if (!key || !schema || typeof schema !== "object") return false;
  const buckets = [
    ...(Array.isArray(schema.fields) ? schema.fields : []),
    ...(Array.isArray(schema.mediaFields) ? schema.mediaFields : []),
  ];
  const found = buckets.find((entry) => entry?.key === key);
  return Boolean(found && found.enabled !== false);
}

export function productSchemaError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function text(value, name, max = 160, required = true) {
  const normalized = String(value ?? "").trim();
  if (required && !normalized) throw productSchemaError(`${name} is required.`);
  if (normalized.length > max || unsafeTextPattern.test(normalized)) throw productSchemaError(`${name} is invalid.`);
  return normalized;
}

function key(value, name) {
  const normalized = String(value || "").trim();
  if (!keyPattern.test(normalized) || sensitivePattern.test(normalized)) throw productSchemaError(`${name} is invalid or reserved.`);
  return normalized;
}

function label(value, name) {
  const source = value && typeof value === "object" ? value : { en: value, ar: value };
  return { en: text(source.en, `${name} English label`), ar: text(source.ar || source.en, `${name} Arabic label`) };
}

function optionList(value, name) {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > 100) throw productSchemaError(`${name} options are invalid.`);
  const seen = new Set();
  return value.map((option, index) => {
    const source = typeof option === "string" ? { value: option, label: { en: option, ar: option } } : option;
    const optionValue = String(source?.value || "").trim();
    if (!optionValuePattern.test(optionValue)) throw productSchemaError(`${name} option ${index + 1} is invalid.`);
    if (seen.has(optionValue)) throw productSchemaError(`${name} has duplicate options.`);
    seen.add(optionValue);
    return { value: optionValue, label: label(source.label || optionValue, `${name} option`) };
  });
}

function schemaField(value, index, forcedTab = "") {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw productSchemaError(`Field ${index + 1} is invalid.`);
  const fieldKey = key(value.key, `Field ${index + 1} key`);
  const type = String(value.type || "text");
  if (!types.has(type)) throw productSchemaError(`Unknown product field type: ${type}.`);
  const tab = forcedTab || String(value.tab || "custom_sections");
  if (!tabs.has(tab)) throw productSchemaError(`Unknown product tab: ${tab}.`);
  const options = ["select", "multi_select"].includes(type) ? optionList(value.options, fieldKey) : [];
  if (["select", "multi_select"].includes(type) && !["categoryId", "brandId"].includes(fieldKey) && !options.length) {
    throw productSchemaError(`${fieldKey} requires at least one option.`);
  }
  return {
    key: fieldKey,
    tab: protectedKeys.has(fieldKey) ? "basic" : tab,
    label: label(value.label, fieldKey),
    type,
    required: value.required === true,
    enabled: protectedKeys.has(fieldKey) ? true : value.enabled !== false,
    storefrontVisible: value.storefrontVisible === true,
    protected: protectedKeys.has(fieldKey),
    sortOrder: Math.max(0, Math.min(9999, Number(value.sortOrder) || index * 10)),
    defaultValue: value.defaultValue ?? (type === "boolean" ? false : type === "multi_select" ? [] : ""),
    options,
  };
}

function uniqueFields(value, name, max, forcedTab = "") {
  if (!Array.isArray(value) || value.length > max) throw productSchemaError(`${name} must contain at most ${max} fields.`);
  const seen = new Set();
  return value.map((item, index) => {
    const normalized = schemaField(item, index, forcedTab);
    if (seen.has(normalized.key)) throw productSchemaError(`${name} has duplicate key ${normalized.key}.`);
    seen.add(normalized.key);
    return normalized;
  }).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function sanitizeProductSchema(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw productSchemaError("Product schema must be an object.");
  const fallback = defaultProductSchema();
  const tabInput = Array.isArray(input.tabs) ? input.tabs : fallback.tabs;
  const byTab = new Map(tabInput.map((item) => [item.key, item]));
  const normalizedTabs = PRODUCT_TAB_KEYS.map((tabKey, index) => {
    const current = byTab.get(tabKey) || fallback.tabs.find((item) => item.key === tabKey);
    return {
      key: tabKey,
      label: label(current.label, `${tabKey} tab`),
      enabled: tabKey === "basic" ? true : current.enabled !== false,
      protected: tabKey === "basic",
      sortOrder: Math.max(0, Math.min(999, Number(current.sortOrder) || index * 10)),
    };
  }).sort((a, b) => a.sortOrder - b.sortOrder);

  const normalizedFields = uniqueFields(input.fields ?? fallback.fields, "Product fields", 100);
  for (const protectedField of fallback.fields.filter((item) => item.protected)) {
    const existing = normalizedFields.find((item) => item.key === protectedField.key);
    if (!existing) normalizedFields.push(protectedField);
    else Object.assign(existing, {
      tab: "basic",
      type: protectedField.type,
      enabled: true,
      protected: true,
      options: protectedField.options,
    });
  }

  const showcaseInput = input.showcaseSections ?? fallback.showcaseSections;
  if (!Array.isArray(showcaseInput) || showcaseInput.length > 20) throw productSchemaError("Showcase sections are invalid.");
  const showcaseSections = showcaseInput.map((section, index) => ({
    key: key(section.key, `Showcase section ${index + 1} key`),
    title: label(section.title, `Showcase section ${index + 1}`),
    enabled: section.enabled !== false,
    storefrontVisible: section.storefrontVisible !== false,
    sortOrder: Math.max(0, Math.min(9999, Number(section.sortOrder) || index * 10)),
    fields: uniqueFields(section.fields || [], `Showcase section ${section.key}`, 30, "showcase"),
  })).sort((a, b) => a.sortOrder - b.sortOrder);

  return {
    version: 1,
    tabs: normalizedTabs,
    fields: normalizedFields.sort((a, b) => a.sortOrder - b.sortOrder),
    variantAttributes: uniqueFields(input.variantAttributes ?? fallback.variantAttributes, "Variant attributes", 20, "variants"),
    mediaFields: uniqueFields(input.mediaFields ?? fallback.mediaFields, "Media fields", 50, "media"),
    showcaseSections,
    storefrontVisibility: {
      customFields: input.storefrontVisibility?.customFields !== false,
      customSections: input.storefrontVisibility?.customSections !== false,
    },
  };
}

function sanitizeConfiguredValue(field, value) {
  if (value == null || value === "") {
    if (field.required) throw productSchemaError(`${field.label.en} is required.`);
    return field.type === "boolean" ? false : field.type === "multi_select" ? [] : null;
  }
  if (field.type === "boolean") return value === true || value === "true";
  if (field.type === "number") {
    const number = Number(value);
    if (!Number.isFinite(number)) throw productSchemaError(`${field.label.en} must be a number.`);
    return number;
  }
  if (field.type === "multi_select") {
    if (!Array.isArray(value)) throw productSchemaError(`${field.label.en} must be an array.`);
    const allowed = new Set((field.options || []).map((option) => option.value));
    const selected = [...new Set(value.map(String))];
    if (selected.some((item) => !allowed.has(item))) throw productSchemaError(`${field.label.en} contains an invalid option.`);
    return selected;
  }
  const normalized = text(value, field.label.en, field.type === "textarea" ? 10000 : 2048, field.required);
  if (field.type === "select" && !(field.options || []).some((option) => option.value === normalized)) {
    throw productSchemaError(`${field.label.en} contains an invalid option.`);
  }
  if (["url", "image_url", "file_url"].includes(field.type)) {
    try {
      const url = new URL(normalized);
      if (!["http:", "https:"].includes(url.protocol)) throw new Error("protocol");
      return url.toString();
    } catch {
      throw productSchemaError(`${field.label.en} must be a valid HTTP(S) URL.`);
    }
  }
  if (field.type === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(normalized)) throw productSchemaError(`${field.label.en} must be a date.`);
  return normalized;
}

function sanitizeBucket(input, fields, name) {
  const source = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  const allowed = new Map(fields.filter((field) => field.enabled !== false).map((field) => [field.key, field]));
  const unknown = Object.keys(source).find((fieldKey) => !allowed.has(fieldKey));
  if (unknown) throw productSchemaError(`Unknown ${name} field: ${unknown}.`);
  return Object.fromEntries([...allowed].map(([fieldKey, field]) => [fieldKey, sanitizeConfiguredValue(field, source[fieldKey])]));
}

/**
 * Sanitize product schema-backed buckets.
 *
 * Options:
 * - preserveUnknownShowcaseSections: when true (PUT that does not explicitly send
 *   customShowcase), keep legacy showcase keys such as `faq` instead of rejecting
 *   or deleting them. Explicit showcase payloads and POST remain strict.
 */
export function sanitizeProductSchemaData(product, schema, options = {}) {
  const preserveUnknownShowcaseSections = options.preserveUnknownShowcaseSections === true;
  const normalizedSchema = sanitizeProductSchema(schema);
  const showcaseByKey = new Map(normalizedSchema.showcaseSections.map((section) => [section.key, section]));
  const customShowcaseSource = product.customShowcase && typeof product.customShowcase === "object" && !Array.isArray(product.customShowcase)
    ? product.customShowcase
    : {};
  if (!preserveUnknownShowcaseSections) {
    const unknownSection = Object.keys(customShowcaseSource).find((sectionKey) => !showcaseByKey.has(sectionKey));
    if (unknownSection) throw productSchemaError(`Unknown showcase section: ${unknownSection}.`);
  }
  const customShowcase = Object.fromEntries([...showcaseByKey].map(([sectionKey, section]) => [
    sectionKey,
    sanitizeBucket(customShowcaseSource[sectionKey], section.fields || [], `${sectionKey} showcase`),
  ]));
  if (preserveUnknownShowcaseSections) {
    for (const [sectionKey, sectionValue] of Object.entries(customShowcaseSource)) {
      if (!showcaseByKey.has(sectionKey)) customShowcase[sectionKey] = sectionValue;
    }
  }
  return {
    ...product,
    customFields: sanitizeBucket(product.customFields, normalizedSchema.fields.filter((field) => !builtInProductFieldKeys.has(field.key)), "product"),
    customMedia: sanitizeBucket(product.customMedia, normalizedSchema.mediaFields.filter((field) => !builtInMediaFieldKeys.has(field.key)), "media"),
    customShowcase,
    variants: Array.isArray(product.variants)
      ? product.variants.map((variant) => ({
          ...variant,
          attributes: sanitizeBucket(variant.attributes, normalizedSchema.variantAttributes.filter((field) => !builtInVariantAttributeKeys.has(field.key)), "variant attribute"),
        }))
      : product.variants,
  };
}
