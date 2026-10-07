/**
 * Canonical product filter attribute vocabulary.
 *
 * Single source of truth for product-level catalog filters. Persisted product
 * values MUST be stable machine IDs from this module — never localized labels.
 *
 * All product filter dimensions persist as canonical ID arrays.
 *
 * Browser-safe (no Node-only APIs).
 */

export const PRODUCT_FILTER_ATTRIBUTE_GROUPS = Object.freeze([
  "age",
  "gender",
  "skill",
  "occasion",
  "material",
  "productType",
  "theme",
  "collection",
]);

export const MULTI_VALUE_PRODUCT_FILTER_GROUPS = PRODUCT_FILTER_ATTRIBUTE_GROUPS;

function option(id, en, ar) {
  return Object.freeze({ id, label: Object.freeze({ en, ar }) });
}

/** @type {Readonly<Record<string, readonly { id: string, label: { en: string, ar: string } }[]>>} */
export const PRODUCT_FILTER_ATTRIBUTE_OPTIONS = Object.freeze({
  age: Object.freeze([
    option("0-12m", "0–12 Months", "0–12 شهر"),
    option("1-2y", "1–2 Years", "1–2 سنة"),
    option("3-4y", "3–4 Years", "3–4 سنوات"),
    option("5-6y", "5–6 Years", "5–6 سنوات"),
    option("7-9y", "7–9 Years", "7–9 سنوات"),
    option("10-12y", "10–12 Years", "10–12 سنة"),
    option("13-17y", "13–17 Years", "13–17 سنة"),
    option("adults", "Adults", "البالغون"),
    option("0-3y", "0–3 Years", "من 0 ل 3 سنوات"),
    option("3-6y", "3–6 Years", "من 3 ل 6 سنوات"),
    option("6-10y", "6–10 Years", "من 6 ل 10 سنوات"),
    option("10+y", "10+ Years", "من 10 سنوات فما فوق"),
  ]),
  gender: Object.freeze([
    option("boys", "Boys", "أولاد"),
    option("girls", "Girls", "بنات"),
    option("unisex", "Unisex", "للجميع"),
  ]),
  skill: Object.freeze([
    option("creativity", "Creativity", "الإبداع"),
    option("imagination", "Imagination", "الخيال"),
    option("fine-motor", "Fine Motor", "مهارات دقيقة"),
    option("gross-motor", "Gross Motor", "مهارات كبرى"),
    option("problem", "Problem Solving", "حل المشكلات"),
    option("logic", "Logic", "المنطق"),
    option("memory", "Memory", "الذاكرة"),
    option("stem", "STEM", "STEM"),
    option("social", "Social Skills", "اجتماعية"),
    option("language", "Language", "اللغة"),
    option("emotional", "Emotional", "عاطفي"),
    option("beginner", "Beginner", "مبتدئ"),
    option("intermediate", "Intermediate", "متوسط"),
    option("advanced", "Advanced", "متقدم"),
    option("education-skills-intelligence", "Education, Skills & Intelligence", "ألعاب تعليم و تنمية مهارات وذكاء"),
    option("intelligence-challenge-discovery", "Intelligence, Challenge & Discovery", "ألعاب ذكاء، تحدي واكتشاف"),
    option("role-play-imagination", "Role Play & Imagination", "الألعاب التمثيلية والخيال"),
    option("construction-creativity", "Construction & Creativity", "ألعاب التركيب والإبداع"),
    option("school-education", "School & Education", "مدرسة وتعليم"),
  ]),
  occasion: Object.freeze([
    option("birthday", "Birthday", "عيد ميلاد"),
    option("everyday", "Everyday", "يومي"),
    option("eid", "Eid", "عيد"),
    option("ramadan", "Ramadan", "رمضان"),
    option("christmas", "Christmas", "كريسماس"),
    option("school", "Back to School", "عودة للمدرسة"),
    option("newbaby", "New Baby", "مولود جديد"),
    option("gift", "Gift", "هدية"),
    option("festive", "Festive", "احتفالي"),
  ]),
  material: Object.freeze([
    option("wood", "Wood", "خشبيات"),
  ]),
  productType: Object.freeze([
    option("lego", "Lego", "ليجو"),
    option("lego-models", "Lego Models", "ليجو المجسمات"),
    option("puzzles", "Puzzles", "بازلات"),
    option("books-stories", "Books & Stories", "كتب وقصص"),
    option("play-houses-kitchens-tents", "Play Houses, Kitchens & Tents", "مطابخ وبيوت وخيم"),
    option("nursery-room-supplies", "Nursery Room Supplies", "مستلزمات غرفة الأطفال"),
    option("newborn-supplies", "Newborn Supplies", "مستلزمات حديثي الولادة"),
    option("baby-newborn-supplies", "Baby & Newborn Supplies", "مستلزمات أطفال وحديثي ولادة"),
    option("costume-dress-up", "Costume Dress-Up", "أزياء تنكرية"),
    option("baby-care", "Baby Care", "العناية بالأطفال"),
    option("bundles", "Bundles", "بكجات"),
  ]),
  theme: Object.freeze([
    option("muslim-world", "Little Muslim World", "عالم المسلم الصغير"),
    option("summer-outdoor", "Summer & Outdoor Play", "ألعاب صيفية وخارجية"),
    option("family-play", "Family Play", "ألعاب عائلية"),
  ]),
  collection: Object.freeze([
    option("featured", "Featured Toys", "ألعاب مميزة"),
    option("new-arrivals", "New Arrivals", "وصل حديثا"),
    option("promotions-discounts", "Promotions & Discounts", "عروض وخصومات"),
    option("ramadan-clearance", "Ramadan Clearance", "عروض نهاية الكمية رمضان"),
    option("new-year-promotions", "New Year Promotions", "عروضات رأس السنة"),
  ]),
});

/** Velvet workbook-native age IDs in display order. */
export const VELVET_WORKBOOK_AGE_IDS = Object.freeze(["0-3y", "3-6y", "6-10y", "10+y"]);

/** Overlapping age IDs retired from the active vocabulary (still recognized as ambiguous legacy). */
export const RETIRED_OVERLAPPING_AGE_IDS = Object.freeze(["1-3y", "6-9y", "9-12y", "13+"]);

export const AMBIGUOUS_LEGACY_AGE_ALIASES = Object.freeze([
  "1-3 years",
  "3-6 years",
  "6-9 years",
  "9-12 years",
  "3-6",
  "12+ years",
  "12+",
  ...RETIRED_OVERLAPPING_AGE_IDS,
]);

const canonicalIdsByGroup = Object.fromEntries(
  PRODUCT_FILTER_ATTRIBUTE_GROUPS.map((group) => [
    group,
    new Set(PRODUCT_FILTER_ATTRIBUTE_OPTIONS[group].map((entry) => entry.id)),
  ]),
);

const ambiguousLegacyAgeKeys = new Set(AMBIGUOUS_LEGACY_AGE_ALIASES.map(normalizeLookupKey));

const exactLegacyAgeAliases = buildExactLegacyAgeAliasMap();

const legacyAliasesByGroup = Object.fromEntries(
  PRODUCT_FILTER_ATTRIBUTE_GROUPS.map((group) => [group, buildLegacyAliasMap(group)]),
);

const sortOrderByGroup = Object.fromEntries(
  PRODUCT_FILTER_ATTRIBUTE_GROUPS.map((group) => [
    group,
    new Map(PRODUCT_FILTER_ATTRIBUTE_OPTIONS[group].map((entry, index) => [entry.id, index])),
  ]),
);

function normalizeLookupKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\u2013/g, "-")
    .replace(/\s+/g, " ");
}

function buildExactLegacyAgeAliasMap() {
  /** @type {Map<string, string>} */
  const map = new Map();
  const add = (aliases, canonicalId) => {
    for (const alias of aliases) {
      map.set(normalizeLookupKey(alias), canonicalId);
    }
  };
  add(["0-12 months", "0–12 months"], "0-12m");
  add(["من 0 ل 3 سنوات", "من 0 إلى 3 سنوات"], "0-3y");
  add(["من 3 ل 6 سنوات", "من 3 إلى 6 سنوات"], "3-6y");
  add(["من6 ل 10 سنوات", "من 6 ل 10 سنوات", "من 6 إلى 10 سنوات"], "6-10y");
  add(["من 10 سنوات فما فوق"], "10+y");
  return map;
}

function buildLegacyAliasMap(group) {
  /** @type {Map<string, string>} */
  const map = new Map();

  const add = (aliases, canonicalId) => {
    for (const alias of aliases) {
      map.set(normalizeLookupKey(alias), canonicalId);
    }
  };

  if (group === "gender") {
    add(["boys", "boy"], "boys");
    add(["girls", "girl"], "girls");
    add(["unisex"], "unisex");
    add(["ألعاب أولاد"], "boys");
    add(["ألعاب بنات"], "girls");
  }

  if (group === "skill") {
    add(["beginner"], "beginner");
    add(["intermediate"], "intermediate");
    add(["advanced"], "advanced");
    add(["problem solving"], "problem");
    add(["fine motor"], "fine-motor");
    add(["gross motor"], "gross-motor");
    add(["social skills"], "social");
  }

  if (group === "occasion") {
    add(["birthday"], "birthday");
    add(["everyday"], "everyday");
    add(["gift"], "gift");
    add(["school", "back to school"], "school");
    add(["festive"], "festive");
    add(["eid"], "eid");
    add(["ramadan"], "ramadan");
    add(["christmas"], "christmas");
    add(["new baby"], "newbaby");
  }

  for (const entry of PRODUCT_FILTER_ATTRIBUTE_OPTIONS[group]) {
    map.set(normalizeLookupKey(entry.id), entry.id);
    map.set(normalizeLookupKey(entry.label.en), entry.id);
    map.set(normalizeLookupKey(entry.label.ar), entry.id);
  }

  return map;
}

export function isProductFilterAttributeGroup(group) {
  return PRODUCT_FILTER_ATTRIBUTE_GROUPS.includes(group);
}

export function isMultiValueProductFilterGroup(group) {
  return MULTI_VALUE_PRODUCT_FILTER_GROUPS.includes(group);
}

export function getProductFilterAttributeOptions(group) {
  if (!isProductFilterAttributeGroup(group)) return [];
  return PRODUCT_FILTER_ATTRIBUTE_OPTIONS[group];
}

export function getProductFilterAttributeLabel(group, id, locale = "en") {
  const entry = getProductFilterAttributeOptions(group).find((item) => item.id === id);
  if (!entry) return String(id || "");
  return entry.label[locale] || entry.label.en || entry.id;
}

export function isAmbiguousLegacyAgeValue(value) {
  if (value === null || value === undefined || value === "") return false;
  if (Array.isArray(value)) {
    return value.some((entry) => isAmbiguousLegacyAgeValue(entry));
  }
  return ambiguousLegacyAgeKeys.has(normalizeLookupKey(value));
}

export function isExactLegacyAgeMapping(value) {
  if (value === null || value === undefined || value === "") return false;
  return exactLegacyAgeAliases.has(normalizeLookupKey(value));
}

function resolveExactLegacyAge(value) {
  return exactLegacyAgeAliases.get(normalizeLookupKey(value)) || null;
}

function resolveLegacyAlias(group, value) {
  return legacyAliasesByGroup[group].get(normalizeLookupKey(value)) || null;
}

function isPipeSeparatedValue(value) {
  return typeof value === "string" && value.includes("|");
}

export function isMultiValueAge(value) {
  if (Array.isArray(value)) return value.length > 1;
  return isPipeSeparatedValue(value);
}

function coerceFilterInputParts(group, value) {
  if (value === null || value === undefined || value === "") return [];
  if (Array.isArray(value)) {
    return value.flatMap((entry) => coerceFilterInputParts(group, entry));
  }
  if (typeof value !== "string" || !value.trim()) return [];
  const trimmed = value.trim();
  if (group === "age" && isPipeSeparatedValue(trimmed)) {
    return trimmed.split("|").map((part) => part.trim()).filter(Boolean);
  }
  return [trimmed];
}

function normalizeSingleFilterPart(group, part, { strict = true } = {}) {
  if (canonicalIdsByGroup[group].has(part)) return part;

  if (group === "age" && isAmbiguousLegacyAgeValue(part)) {
    if (strict) throw new Error(`${group} contains an invalid value.`);
    return part;
  }

  if (group === "age") {
    const exactAge = resolveExactLegacyAge(part);
    if (exactAge) return exactAge;
  }

  const mapped = resolveLegacyAlias(group, part);
  if (mapped && canonicalIdsByGroup[group].has(mapped)) return mapped;

  if (strict) throw new Error(`${group} contains an invalid value.`);
  return part;
}

function sortFilterIds(group, ids = []) {
  const order = sortOrderByGroup[group];
  return [...ids].sort((left, right) => (order.get(left) ?? 999) - (order.get(right) ?? 999));
}

export function normalizeFilterAttributeArray(group, value, { strict = true } = {}) {
  if (!isProductFilterAttributeGroup(group)) {
    throw new Error(`Unknown product filter attribute group: ${group}`);
  }

  const parts = coerceFilterInputParts(group, value);
  if (!parts.length) return [];

  const normalized = [];
  for (const part of parts) {
    const resolved = normalizeSingleFilterPart(group, part, { strict });
    if (resolved && !normalized.includes(resolved)) normalized.push(resolved);
  }

  return sortFilterIds(group, normalized);
}

export function normalizeAgeArray(value, options = {}) {
  return normalizeFilterAttributeArray("age", value, options);
}

export function filterAttributeValuesEqual(group, left, right) {
  return JSON.stringify(normalizeProductFilterAttributeForRead(group, left))
    === JSON.stringify(normalizeProductFilterAttributeForRead(group, right));
}

export function ageValuesEqual(left, right) {
  return filterAttributeValuesEqual("age", left, right);
}

export function normalizeProductFilterAttributeValue(group, value, { strict = true } = {}) {
  if (!isProductFilterAttributeGroup(group)) {
    throw new Error(`Unknown product filter attribute group: ${group}`);
  }

  if (value === null || value === undefined || value === "") return [];
  if (Array.isArray(value) && value.length === 0) return [];
  return normalizeFilterAttributeArray(group, value, { strict });
}

export function normalizeProductFilterAttributeForRead(group, value) {
  if (!isProductFilterAttributeGroup(group)) return [];
  if (value === null || value === undefined || value === "") return [];
  return normalizeFilterAttributeArray(group, value, { strict: false });
}

export function resolveProductFilterAttributeForForm(group, value) {
  return normalizeProductFilterAttributeForRead(group, value);
}

export function requiresCanonicalAgeSelection(value) {
  return isAmbiguousLegacyAgeValue(value);
}

export function listUnmappedProductFilterAttributeValues(group, values = []) {
  const unknown = new Set();
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;
    try {
      normalizeProductFilterAttributeValue(group, value, { strict: true });
    } catch {
      unknown.add(Array.isArray(value) ? JSON.stringify(value) : String(value));
    }
  }
  return [...unknown];
}

function resolveCanonicalFilterAttributeId(group, rawValue) {
  if (rawValue === null || rawValue === undefined || rawValue === "") return null;
  if (typeof rawValue !== "string" || !rawValue.trim()) return null;

  const trimmed = rawValue.trim();
  if (canonicalIdsByGroup[group].has(trimmed)) return trimmed;

  if (group === "age") {
    if (isAmbiguousLegacyAgeValue(trimmed)) return null;
    const exactAge = resolveExactLegacyAge(trimmed);
    if (exactAge) return exactAge;
  }

  const mapped = resolveLegacyAlias(group, trimmed);
  if (mapped && canonicalIdsByGroup[group].has(mapped)) return mapped;

  return null;
}

function serializePublicFilterArray(group, rawValue) {
  const ids = normalizeFilterAttributeArray(group, rawValue, { strict: false })
    .filter((id) => canonicalIdsByGroup[group].has(id));
  return ids.map((id) => {
    const entry = getProductFilterAttributeOptions(group).find((item) => item.id === id);
    return {
      id: entry.id,
      label: {
        en: entry.label.en,
        ar: entry.label.ar,
      },
    };
  });
}

/** Structured public storefront attribute(s) with canonical id + localized labels. */
export function serializePublicProductFilterAttribute(group, rawValue) {
  if (!isProductFilterAttributeGroup(group)) return [];
  return serializePublicFilterArray(group, rawValue);
}

/** Full canonical storefront filter vocabulary (admin / shared tooling). */
export function serializePublicProductFilterDefinitions() {
  return Object.fromEntries(
    PRODUCT_FILTER_ATTRIBUTE_GROUPS.map((group) => [
      group,
      getProductFilterAttributeOptions(group).map((entry) => ({
        id: entry.id,
        label: {
          en: entry.label.en,
          ar: entry.label.ar,
        },
      })),
    ]),
  );
}

/**
 * Tenant-scoped storefront filter definitions: only options referenced by the
 * supplied catalog products. Empty dimensions stay empty arrays.
 */
export function serializePublicProductFilterDefinitionsFromProducts(products = []) {
  const usedIdsByGroup = Object.fromEntries(
    PRODUCT_FILTER_ATTRIBUTE_GROUPS.map((group) => [group, new Set()]),
  );

  for (const product of products) {
    if (!product || typeof product !== "object") continue;
    for (const group of PRODUCT_FILTER_ATTRIBUTE_GROUPS) {
      const ids = normalizeProductFilterAttributeForRead(group, product[group]);
      for (const id of ids) {
        if (canonicalIdsByGroup[group].has(id)) usedIdsByGroup[group].add(id);
      }
    }
  }

  return Object.fromEntries(
    PRODUCT_FILTER_ATTRIBUTE_GROUPS.map((group) => {
      const usedIds = usedIdsByGroup[group];
      if (!usedIds.size) return [group, []];
      return [
        group,
        getProductFilterAttributeOptions(group)
          .filter((entry) => usedIds.has(entry.id))
          .map((entry) => ({
            id: entry.id,
            label: {
              en: entry.label.en,
              ar: entry.label.ar,
            },
          })),
      ];
    }),
  );
}

export function serializePublicProductFilterAttributes(product = {}) {
  return Object.fromEntries(
    PRODUCT_FILTER_ATTRIBUTE_GROUPS.map((group) => [
      group,
      serializePublicFilterArray(group, product[group]),
    ]),
  );
}
