export const PRODUCT_FIELD_TYPES = [
  "text", "textarea", "number", "date", "boolean", "select", "multi_select",
  "url", "image_url", "file_url",
];

export const PRODUCT_TAB_KEYS = [
  "basic", "variants", "media", "seo", "showcase", "custom_sections",
];

export const PROTECTED_FIELD_KEYS = new Set([
  "nameEn", "slug", "categoryId", "brandId", "brand", "active", "featured", "newArrival", "bestseller",
]);

export const BUILT_IN_PRODUCT_KEYS = new Set([
  "nameEn", "nameAr", "slug", "sku", "categoryId", "brandId", "brand", "shortDescription", "shortDescriptionAr",
  "fullDescription", "fullDescriptionAr", "howToUse", "ingredients", "benefits", "skinTypes", "concerns",
  "active", "featured", "newArrival", "bestseller", "label", "labelAr", "metaTitle", "metaDescription",
]);

export const BUILT_IN_MEDIA_KEYS = new Set([
  "image", "hoverImage", "videoUrl", "galleryImages", "detailStatements", "dsiHowItWorks1", "dsiHowItWorks2",
  "dsiHowItWorks3", "dsiImpact1", "dsiImpact2", "dsiSafeToUse", "dsiPracticalBanner", "dsiIngredients", "dsiFaq",
]);

export const BUILT_IN_VARIANT_KEYS = new Set(["color_name", "color_value", "size"]);

export const BUCKET_LIMITS = {
  fields: 100,
  variantAttributes: 20,
  mediaFields: 50,
  showcaseSections: 20,
  showcaseField: 30,
};

const KEY_PATTERN = /^[a-z][a-zA-Z0-9_]{1,63}$/;

export function schemaCopy(language = "en") {
  const ar = language === "ar";
  return ar ? {
    title: "إعدادات المنتج",
    subtitle: "اضبط حقول المنتج والوسائط والمتغيرات وأقسام العرض لهذا الموقع.",
    loading: "جاري تحميل مخطط المنتج…",
    forbidden: "ليست لديك صلاحية عرض إعدادات المنتج.",
    loadFailed: "تعذر تحميل مخطط المنتج.",
    saveFailed: "تعذر حفظ مخطط المنتج.",
    saved: "تم حفظ مخطط المنتج.",
    readOnly: "وضع العرض فقط — ليست لديك صلاحية تعديل مخطط المنتج.",
    retry: "إعادة المحاولة",
    reload: "إعادة التحميل",
    save: "حفظ",
    cancel: "إلغاء",
    reset: "إلغاء التغييرات",
    dirty: "لديك تغييرات غير محفوظة.",
    search: "ابحث بالمفتاح أو التسمية",
    addField: "إضافة حقل",
    removeField: "إزالة",
    editField: "تعديل",
    protected: "محمي",
    builtIn: "مدمج",
    enabled: "مفعّل",
    disabled: "معطّل",
    required: "إلزامي",
    optional: "اختياري",
    storefront: "ظاهر في المتجر",
    sortOrder: "ترتيب العرض",
    key: "المفتاح",
    type: "النوع",
    tab: "التبويب",
    labelEn: "التسمية (EN)",
    labelAr: "التسمية (AR)",
    options: "الخيارات",
    optionsHint: "سطر لكل خيار: value|Label EN|Label AR",
    empty: "لا توجد حقول في هذا القسم.",
    emptyHint: "أضف حقلاً مخصصاً أو غيّر عوامل التصفية.",
    noMatches: "لا توجد حقول مطابقة.",
    validationTitle: "تحقق من الحقول قبل الحفظ:",
    buckets: {
      fields: "حقول المنتج",
      variantAttributes: "خصائص المتغيرات",
      mediaFields: "حقول الوسائط",
      showcase: "أقسام العرض",
      tabs: "التبويبات والظهور",
    },
    allTabs: "كل التبويبات",
    all: "الكل",
    actions: "الإجراءات",
    sectionTitleEn: "عنوان القسم (EN)",
    sectionTitleAr: "عنوان القسم (AR)",
    customFieldsVisible: "الحقول المخصصة ظاهرة في المتجر",
    customSectionsVisible: "الأقسام المخصصة ظاهرة في المتجر",
    confirmRemove: "إزالة هذا الحقل من المخطط؟",
    newFieldTitle: "حقل مخصص جديد",
    editFieldTitle: "تعديل الحقل",
    sectionFields: "حقول القسم",
    emptySectionFields: "لا توجد حقول مخصصة في هذا القسم بعد.",
    moveUp: "تحريك لأعلى",
    moveDown: "تحريك لأسفل",
  } : {
    title: "Product schema",
    subtitle: "Configure product, media, variant, and showcase fields for this tenant.",
    loading: "Loading product schema…",
    forbidden: "You do not have permission to view product settings.",
    loadFailed: "Unable to load product schema.",
    saveFailed: "Unable to save product schema.",
    saved: "Product schema saved.",
    readOnly: "View only — you do not have permission to edit the product schema.",
    retry: "Retry",
    reload: "Reload",
    save: "Save",
    cancel: "Cancel",
    reset: "Discard changes",
    dirty: "You have unsaved changes.",
    search: "Search key or label",
    addField: "Add field",
    removeField: "Remove",
    editField: "Edit",
    protected: "Protected",
    builtIn: "Built-in",
    enabled: "Enabled",
    disabled: "Disabled",
    required: "Required",
    optional: "Optional",
    storefront: "Storefront visible",
    sortOrder: "Display order",
    key: "Key",
    type: "Type",
    tab: "Tab",
    labelEn: "Label (EN)",
    labelAr: "Label (AR)",
    options: "Options",
    optionsHint: "One option per line: value|Label EN|Label AR",
    empty: "No fields in this section yet.",
    emptyHint: "Add a custom field or change your filters.",
    noMatches: "No fields match these filters.",
    validationTitle: "Fix these issues before saving:",
    buckets: {
      fields: "Product fields",
      variantAttributes: "Variant attributes",
      mediaFields: "Media fields",
      showcase: "Showcase sections",
      tabs: "Tabs & visibility",
    },
    allTabs: "All tabs",
    all: "All",
    actions: "Actions",
    sectionTitleEn: "Section title (EN)",
    sectionTitleAr: "Section title (AR)",
    customFieldsVisible: "Custom fields visible on storefront",
    customSectionsVisible: "Custom sections visible on storefront",
    confirmRemove: "Remove this field from the schema?",
    newFieldTitle: "New custom field",
    editFieldTitle: "Edit field",
    sectionFields: "Section fields",
    emptySectionFields: "No custom fields in this section yet.",
    moveUp: "Move up",
    moveDown: "Move down",
  };
}

export function cloneSchema(schema) {
  return JSON.parse(JSON.stringify(schema || {}));
}

export function fieldLabel(field, language = "en") {
  const label = field?.label;
  if (!label || typeof label !== "object") return field?.key || "";
  return language === "ar" ? (label.ar || label.en || field.key) : (label.en || label.ar || field.key);
}

export function tabLabel(tabKey, schema, language = "en") {
  const tab = (schema?.tabs || []).find((item) => item.key === tabKey);
  const label = tab?.label;
  if (label && typeof label === "object") {
    return language === "ar" ? (label.ar || label.en || tabKey) : (label.en || label.ar || tabKey);
  }
  return tabKey;
}

export function isProtectedField(field) {
  return field?.protected === true || PROTECTED_FIELD_KEYS.has(field?.key);
}

export function isBuiltInField(field, bucket) {
  const key = field?.key;
  if (!key) return false;
  if (bucket === "fields") return BUILT_IN_PRODUCT_KEYS.has(key);
  if (bucket === "variantAttributes") return BUILT_IN_VARIANT_KEYS.has(key);
  if (bucket === "mediaFields") return BUILT_IN_MEDIA_KEYS.has(key);
  return false;
}

export function canRemoveField(field, bucket) {
  if (isProtectedField(field)) return false;
  if (bucket === "showcaseField") return true;
  if (isBuiltInField(field, bucket)) return false;
  return true;
}

export function sortedShowcaseFields(fields = []) {
  return [...(Array.isArray(fields) ? fields : [])].sort(
    (a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0),
  );
}

export function filterSchemaFields(fields, { query = "", tab = "all", enabled = "all" } = {}) {
  const hay = query.trim().toLowerCase();
  return (Array.isArray(fields) ? fields : []).filter((field) => {
    const matchesTab = tab === "all" || field.tab === tab;
    const matchesEnabled = enabled === "all"
      || (enabled === "enabled" && field.enabled !== false)
      || (enabled === "disabled" && field.enabled === false);
    if (!matchesTab || !matchesEnabled) return false;
    if (!hay) return true;
    const labelText = `${fieldLabel(field, "en")} ${fieldLabel(field, "ar")} ${field.key} ${field.type}`.toLowerCase();
    return labelText.includes(hay);
  }).sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0));
}

export function optionsToText(options = []) {
  return (Array.isArray(options) ? options : []).map((option) => {
    const value = option?.value ?? "";
    const en = option?.label?.en ?? value;
    const ar = option?.label?.ar ?? en;
    return `${value}|${en}|${ar}`;
  }).join("\n");
}

export function textToOptions(text) {
  return String(text || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [value = "", en = "", ar = ""] = line.split("|").map((part) => part.trim());
      if (!value) throw new Error(`Option ${index + 1} is missing a value.`);
      return { value, label: { en: en || value, ar: ar || en || value } };
    });
}

export function emptyShowcaseField() {
  return {
    key: "",
    tab: "showcase",
    label: { en: "", ar: "" },
    type: "text",
    required: false,
    enabled: true,
    storefrontVisible: false,
    protected: false,
    sortOrder: 999,
    defaultValue: "",
    options: [],
  };
}

export function emptyCustomField(bucket) {
  const tab = bucket === "variantAttributes" ? "variants"
    : bucket === "mediaFields" ? "media"
      : "custom_sections";
  return {
    key: "",
    tab,
    label: { en: "", ar: "" },
    type: "text",
    required: false,
    enabled: true,
    storefrontVisible: false,
    protected: false,
    sortOrder: 999,
    defaultValue: "",
    options: [],
  };
}

function validateField(field, index, bucketName) {
  const errors = [];
  const prefix = `${bucketName} #${index + 1}`;
  if (!field?.key || !KEY_PATTERN.test(field.key)) errors.push(`${prefix}: invalid key.`);
  if (!String(field?.label?.en || "").trim()) errors.push(`${prefix}: English label is required.`);
  if (!String(field?.label?.ar || "").trim()) errors.push(`${prefix}: Arabic label is required.`);
  if (!PRODUCT_FIELD_TYPES.includes(field?.type)) errors.push(`${prefix}: unknown type.`);
  if (["select", "multi_select"].includes(field?.type)
    && !["categoryId", "brandId"].includes(field.key)
    && !(Array.isArray(field.options) && field.options.length)) {
    errors.push(`${prefix}: select fields need at least one option.`);
  }
  return errors;
}

export function validateSchemaDraft(schema) {
  const errors = [];
  const buckets = [
    ["fields", schema?.fields, BUCKET_LIMITS.fields],
    ["variantAttributes", schema?.variantAttributes, BUCKET_LIMITS.variantAttributes],
    ["mediaFields", schema?.mediaFields, BUCKET_LIMITS.mediaFields],
  ];
  for (const [name, list, max] of buckets) {
    const fields = Array.isArray(list) ? list : [];
    if (fields.length > max) errors.push(`${name} exceeds ${max} fields.`);
    const seen = new Set();
    fields.forEach((field, index) => {
      validateField(field, index, name).forEach((message) => errors.push(message));
      if (field?.key) {
        if (seen.has(field.key)) errors.push(`${name}: duplicate key ${field.key}.`);
        seen.add(field.key);
      }
    });
  }
  const sections = Array.isArray(schema?.showcaseSections) ? schema.showcaseSections : [];
  if (sections.length > BUCKET_LIMITS.showcaseSections) {
    errors.push(`showcaseSections exceeds ${BUCKET_LIMITS.showcaseSections} sections.`);
  }
  sections.forEach((section, sectionIndex) => {
    if (!String(section?.title?.en || "").trim()) errors.push(`Showcase section ${sectionIndex + 1}: English title required.`);
    if (!String(section?.title?.ar || "").trim()) errors.push(`Showcase section ${sectionIndex + 1}: Arabic title required.`);
    const fields = Array.isArray(section.fields) ? section.fields : [];
    if (fields.length > BUCKET_LIMITS.showcaseField) {
      errors.push(`Showcase section ${section.key || sectionIndex + 1} exceeds ${BUCKET_LIMITS.showcaseField} fields.`);
    }
    const seen = new Set();
    fields.forEach((field, index) => {
      validateField(field, index, `showcase.${section.key || sectionIndex}`).forEach((message) => errors.push(message));
      if (field?.key) {
        if (seen.has(field.key)) errors.push(`Showcase ${section.key}: duplicate key ${field.key}.`);
        seen.add(field.key);
      }
    });
  });
  return { valid: errors.length === 0, errors };
}

export function schemaSummary(schema) {
  return {
    fields: Array.isArray(schema?.fields) ? schema.fields.length : 0,
    enabledFields: Array.isArray(schema?.fields) ? schema.fields.filter((f) => f.enabled !== false).length : 0,
    variantAttributes: Array.isArray(schema?.variantAttributes) ? schema.variantAttributes.length : 0,
    mediaFields: Array.isArray(schema?.mediaFields) ? schema.mediaFields.length : 0,
    showcaseSections: Array.isArray(schema?.showcaseSections) ? schema.showcaseSections.length : 0,
  };
}
