/**
 * Velvet workbook full classification extraction and staging planning.
 */

import {
  filterAttributeValuesEqual,
  normalizeProductFilterAttributeForRead,
  normalizeProductFilterAttributeValue,
  PRODUCT_FILTER_ATTRIBUTE_GROUPS,
} from "./productFilterAttributes.js";
import {
  getSourceProductId,
  normalizeWorkbookProductId,
  resolveVelvetWorkbookAgeValue,
  VELVET_ORIGINAL_CLASSIFICATIONS_COLUMN,
} from "./velvetWorkbookAge.js";

export const VELVET_COMPANY_ID = "kids-velvet";
export const VELVET_SITE_ID = "kids-velvet-storefront";

export const VELVET_TAG_CLASSIFICATION_STATUSES = Object.freeze([
  "AGE",
  "GENDER",
  "SKILL",
  "OCCASION",
  "MATERIAL",
  "PRODUCT_TYPE",
  "THEME",
  "COLLECTION_OR_PROMOTION",
  "ALREADY_TAXONOMY",
  "NOT_PRODUCT_ATTRIBUTE",
  "UNRESOLVED",
]);

/** @type {ReadonlyArray<{ tag: string, status: string, group?: string, id?: string, notes?: string }>} */
export const VELVET_SOURCE_TAG_REGISTRY = Object.freeze([
  { tag: "من 0 ل 3 سنوات", status: "AGE", group: "age", id: "0-3y" },
  { tag: "من 3 ل 6 سنوات", status: "AGE", group: "age", id: "3-6y" },
  { tag: "من6 ل 10 سنوات", status: "AGE", group: "age", id: "6-10y" },
  { tag: "من 10 سنوات فما فوق", status: "AGE", group: "age", id: "10+y" },
  { tag: "ألعاب أولاد", status: "GENDER", group: "gender", id: "boys" },
  { tag: "ألعاب بنات", status: "GENDER", group: "gender", id: "girls" },
  { tag: "ألعاب تعليم و تنمية مهارات وذكاء", status: "SKILL", group: "skill", id: "education-skills-intelligence" },
  { tag: "ألعاب ذكاء، تحدي واكتشاف", status: "SKILL", group: "skill", id: "intelligence-challenge-discovery" },
  { tag: "الألعاب التمثيلية والخيال", status: "SKILL", group: "skill", id: "role-play-imagination" },
  { tag: "ألعاب التركيب والإبداع", status: "SKILL", group: "skill", id: "construction-creativity" },
  { tag: "مدرسة وتعليم", status: "SKILL", group: "skill", id: "school-education" },
  { tag: "خشبيات", status: "MATERIAL", group: "material", id: "wood" },
  { tag: "ليجو", status: "PRODUCT_TYPE", group: "productType", id: "lego" },
  { tag: "ليجو المجسمات", status: "PRODUCT_TYPE", group: "productType", id: "lego-models" },
  { tag: "بازلات", status: "PRODUCT_TYPE", group: "productType", id: "puzzles" },
  { tag: "كتب وقصص", status: "PRODUCT_TYPE", group: "productType", id: "books-stories" },
  { tag: "مطابخ وبيوت وخيم", status: "PRODUCT_TYPE", group: "productType", id: "play-houses-kitchens-tents" },
  { tag: "مستلزمات غرفة الأطفال", status: "PRODUCT_TYPE", group: "productType", id: "nursery-room-supplies" },
  { tag: "مستلزمات حديثي الولادة", status: "PRODUCT_TYPE", group: "productType", id: "newborn-supplies" },
  { tag: "مستلزمات أطفال وحديثي ولادة", status: "PRODUCT_TYPE", group: "productType", id: "baby-newborn-supplies" },
  { tag: "أزياء تنكرية", status: "PRODUCT_TYPE", group: "productType", id: "costume-dress-up" },
  { tag: "العناية بالأطفال", status: "PRODUCT_TYPE", group: "productType", id: "baby-care" },
  { tag: "بكجات", status: "PRODUCT_TYPE", group: "productType", id: "bundles" },
  { tag: "عالم المسلم الصغير", status: "THEME", group: "theme", id: "muslim-world" },
  { tag: "ألعاب صيفية وخارجية", status: "THEME", group: "theme", id: "summer-outdoor" },
  { tag: "ألعاب عائلية", status: "THEME", group: "theme", id: "family-play" },
  { tag: "ألعاب مميزة", status: "COLLECTION_OR_PROMOTION", group: "collection", id: "featured" },
  { tag: "وصل حديثا", status: "COLLECTION_OR_PROMOTION", group: "collection", id: "new-arrivals" },
  { tag: "عروض وخصومات", status: "COLLECTION_OR_PROMOTION", group: "collection", id: "promotions-discounts" },
  { tag: "عروض نهاية الكمية رمضان", status: "COLLECTION_OR_PROMOTION", group: "collection", id: "ramadan-clearance" },
  { tag: "عروضات رأس السنة", status: "COLLECTION_OR_PROMOTION", group: "collection", id: "new-year-promotions" },
]);

const registryByTag = new Map(VELVET_SOURCE_TAG_REGISTRY.map((entry) => [entry.tag, entry]));

export function splitVelvetWorkbookClassificationTags(raw) {
  if (raw === null || raw === undefined) return [];
  return String(raw)
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function classifyVelvetSourceTag(tag) {
  const text = String(tag || "").trim();
  if (!text) {
    return { tag: text, status: "NOT_PRODUCT_ATTRIBUTE", notes: "empty" };
  }
  const known = registryByTag.get(text);
  if (known) return { ...known };
  return { tag: text, status: "UNRESOLVED", notes: "tag not present in workbook registry" };
}

function sortCanonicalIds(group, ids = []) {
  return [...ids];
}

function appendUnique(target, value) {
  if (value && !target.includes(value)) target.push(value);
}

export function resolveVelvetWorkbookProductAttributes(rawClassifications) {
  const sourceTags = splitVelvetWorkbookClassificationTags(rawClassifications);
  const attributes = Object.fromEntries(PRODUCT_FILTER_ATTRIBUTE_GROUPS.map((group) => [group, []]));
  const unmappedTags = [];
  const tagClassifications = [];

  for (const tag of sourceTags) {
    const classification = classifyVelvetSourceTag(tag);
    tagClassifications.push(classification);
    if (classification.group && classification.id) {
      appendUnique(attributes[classification.group], classification.id);
      continue;
    }
    if (classification.status === "UNRESOLVED") {
      unmappedTags.push(tag);
    }
  }

  const ageFromSegments = resolveVelvetWorkbookAgeValue(rawClassifications);
  if (ageFromSegments.length) {
    attributes.age = sortCanonicalIds("age", ageFromSegments);
  }

  for (const group of PRODUCT_FILTER_ATTRIBUTE_GROUPS) {
    attributes[group] = sortCanonicalIds(group, attributes[group]);
  }

  return {
    sourceTags,
    tagClassifications,
    unmappedTags,
    attributes,
  };
}

export function parseVelvetWorkbookClassificationRows(rows = []) {
  const products = [];
  for (const row of rows) {
    const sourceProductId = normalizeWorkbookProductId(row.product_id ?? row["معرف المنتج"]);
    if (!sourceProductId) continue;
    const title = String(row["اسم المنتج"] ?? row.product_title ?? row.title ?? "").trim();
    const rawClassifications = row[VELVET_ORIGINAL_CLASSIFICATIONS_COLUMN]
      ?? row.original_classifications
      ?? row.originalClassifications
      ?? "";
    const resolved = resolveVelvetWorkbookProductAttributes(rawClassifications);
    products.push({
      sourceProductId,
      title,
      rawClassifications: String(rawClassifications || ""),
      ...resolved,
    });
  }
  return products;
}

export function summarizeVelvetSourceTagInventory(workbookProducts = []) {
  const inventory = new Map();
  for (const row of workbookProducts) {
    for (const tag of row.sourceTags) {
      if (!inventory.has(tag)) {
        inventory.set(tag, {
          tag,
          row_count: 0,
          product_ids: new Set(),
          sample_product_ids: [],
          sample_product_titles: [],
        });
      }
      const entry = inventory.get(tag);
      entry.row_count += 1;
      entry.product_ids.add(row.sourceProductId);
      if (entry.sample_product_ids.length < 5) entry.sample_product_ids.push(row.sourceProductId);
      if (entry.sample_product_titles.length < 3 && row.title) entry.sample_product_titles.push(row.title);
    }
  }
  return [...inventory.values()]
    .map((entry) => ({
      tag: entry.tag,
      row_count: entry.row_count,
      unique_product_count: entry.product_ids.size,
      sample_product_ids: entry.sample_product_ids,
      sample_product_titles: entry.sample_product_titles,
      classification: classifyVelvetSourceTag(entry.tag),
    }))
    .sort((left, right) => right.unique_product_count - left.unique_product_count || left.tag.localeCompare(right.tag, "ar"));
}

function readExistingAttribute(product, group) {
  return product?.[group] ?? product?.data?.[group] ?? [];
}

function readProductFingerprint(product) {
  return JSON.stringify({
    price: product?.price ?? null,
    stockQty: product?.stockQty ?? product?.data?.stockQty ?? null,
    brandId: product?.brandId ?? product?.data?.brandId ?? null,
    mainCategoryId: product?.mainCategoryId ?? product?.data?.mainCategoryId ?? null,
    subCategoryId: product?.subCategoryId ?? product?.data?.subCategoryId ?? null,
    categoryId: product?.categoryId ?? product?.data?.categoryId ?? null,
    variantCount: Array.isArray(product?.variants) ? product.variants.length : 0,
    sourceProductId: getSourceProductId(product),
  });
}

function normalizeTargetAttributes(attributes = {}) {
  const normalized = {};
  for (const group of PRODUCT_FILTER_ATTRIBUTE_GROUPS) {
    normalized[group] = normalizeProductFilterAttributeValue(group, attributes[group] ?? [], { strict: true });
  }
  return normalized;
}

function attributesEqual(left = {}, right = {}) {
  for (const group of PRODUCT_FILTER_ATTRIBUTE_GROUPS) {
    if (!filterAttributeValuesEqual(group, left[group] ?? [], right[group] ?? [])) return false;
  }
  return true;
}

function countCoverage(workbookProducts, group) {
  return workbookProducts.filter((row) => (row.attributes?.[group] || []).length > 0).length;
}

export function isCleanVelvetWorkbookClassificationPlan(plan) {
  return plan.ERRORS.length === 0
    && plan.UNRESOLVED_TAGS.length === 0
    && plan.DUPLICATE_SOURCE_IDS.length === 0
    && plan.MISSING_SOURCE_IDS.length === 0;
}

export function planVelvetWorkbookClassificationUpdate({
  workbookProducts = [],
  existingProducts = [],
} = {}) {
  const errors = [];
  const existingBySourceId = new Map();
  for (const product of existingProducts) {
    const sourceId = getSourceProductId(product);
    if (!sourceId) continue;
    if (!existingBySourceId.has(sourceId)) existingBySourceId.set(sourceId, []);
    existingBySourceId.get(sourceId).push(product);
  }

  const duplicateSourceIds = [];
  const missingSourceIds = [];
  const unresolvedTags = [];
  const wouldUpdate = [];
  const alreadyCorrect = [];
  const matched = [];

  for (const row of workbookProducts) {
    if (row.unmappedTags?.length) {
      for (const tag of row.unmappedTags) {
        if (!unresolvedTags.includes(tag)) unresolvedTags.push(tag);
      }
    }

    const matches = existingBySourceId.get(row.sourceProductId) || [];
    if (matches.length === 0) {
      missingSourceIds.push(row.sourceProductId);
      continue;
    }
    if (matches.length > 1) {
      duplicateSourceIds.push({
        sourceProductId: row.sourceProductId,
        productIds: matches.map((item) => item.id),
      });
      continue;
    }

    const product = matches[0];
    let normalizedTarget;
    try {
      normalizedTarget = normalizeTargetAttributes(row.attributes);
    } catch (error) {
      errors.push(`Invalid target attributes for sourceProductId ${row.sourceProductId}: ${error.message}`);
      continue;
    }

    const current = Object.fromEntries(
      PRODUCT_FILTER_ATTRIBUTE_GROUPS.map((group) => [
        group,
        normalizeProductFilterAttributeForRead(group, readExistingAttribute(product, group)),
      ]),
    );

    matched.push({
      sourceProductId: row.sourceProductId,
      productId: product.id,
      title: row.title,
      sourceTags: row.sourceTags,
      unmappedTags: row.unmappedTags,
      targetAttributes: normalizedTarget,
      currentAttributes: current,
    });

    if (attributesEqual(current, normalizedTarget)) {
      alreadyCorrect.push({
        sourceProductId: row.sourceProductId,
        productId: product.id,
        attributes: current,
      });
      continue;
    }

    wouldUpdate.push({
      sourceProductId: row.sourceProductId,
      productId: product.id,
      title: row.title,
      sourceTags: row.sourceTags,
      unmappedTags: row.unmappedTags,
      currentAttributes: current,
      targetAttributes: normalizedTarget,
      fingerprintBefore: readProductFingerprint(product),
    });
  }

  const tagInventory = summarizeVelvetSourceTagInventory(workbookProducts);
  const classificationCounts = Object.fromEntries(
    VELVET_TAG_CLASSIFICATION_STATUSES.map((status) => [status, 0]),
  );
  for (const entry of tagInventory) {
    classificationCounts[entry.classification.status] = (classificationCounts[entry.classification.status] || 0) + 1;
  }

  return {
    WORKBOOK_PRODUCTS: workbookProducts.length,
    EXISTING_PRODUCTS: existingProducts.length,
    MATCHED_TO_WORKBOOK: matched.length,
    TOTAL_UNIQUE_SOURCE_TAGS: tagInventory.length,
    TAG_INVENTORY: tagInventory,
    TAG_CLASSIFICATION_COUNTS: classificationCounts,
    UNRESOLVED_TAGS: unresolvedTags,
    MISSING_SOURCE_IDS: missingSourceIds,
    DUPLICATE_SOURCE_IDS: duplicateSourceIds,
    WOULD_UPDATE: wouldUpdate.length,
    ALREADY_CORRECT: alreadyCorrect.length,
    AGE_COVERAGE: countCoverage(workbookProducts, "age"),
    GENDER_COVERAGE: countCoverage(workbookProducts, "gender"),
    SKILL_COVERAGE: countCoverage(workbookProducts, "skill"),
    OCCASION_COVERAGE: countCoverage(workbookProducts, "occasion"),
    MATERIAL_COVERAGE: countCoverage(workbookProducts, "material"),
    PRODUCT_TYPE_COVERAGE: countCoverage(workbookProducts, "productType"),
    THEME_COVERAGE: countCoverage(workbookProducts, "theme"),
    COLLECTION_COVERAGE: countCoverage(workbookProducts, "collection"),
    PRODUCTS_WITH_ANY_ATTRIBUTE: workbookProducts.filter((row) =>
      PRODUCT_FILTER_ATTRIBUTE_GROUPS.some((group) => (row.attributes?.[group] || []).length > 0)).length,
    PRODUCTS_WITHOUT_EXTRA_ATTRIBUTES: workbookProducts.filter((row) =>
      PRODUCT_FILTER_ATTRIBUTE_GROUPS.every((group) => (row.attributes?.[group] || []).length === 0)).length,
    wouldUpdate,
    alreadyCorrect,
    matched,
    ERRORS: errors,
    CLEAN: errors.length === 0
      && unresolvedTags.length === 0
      && duplicateSourceIds.length === 0
      && missingSourceIds.length === 0,
  };
}

export function summarizeVelvetWorkbookClassificationVerification({
  products = [],
  workbookBySourceId = new Map(),
  fingerprintsBefore = new Map(),
} = {}) {
  const errors = [];
  let matched = 0;
  let verified = 0;

  for (const product of products) {
    const sourceProductId = getSourceProductId(product);
    const workbookRow = workbookBySourceId.get(sourceProductId);
    if (!workbookRow) continue;
    matched += 1;

    let expected;
    try {
      expected = normalizeTargetAttributes(workbookRow.attributes);
    } catch (error) {
      errors.push(`Workbook target invalid for ${product.id}: ${error.message}`);
      continue;
    }

    const actual = Object.fromEntries(
      PRODUCT_FILTER_ATTRIBUTE_GROUPS.map((group) => [
        group,
        normalizeProductFilterAttributeForRead(group, readExistingAttribute(product, group)),
      ]),
    );

    if (!attributesEqual(actual, expected)) {
      errors.push(`Product ${product.id} attribute mismatch: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
      continue;
    }

    for (const group of PRODUCT_FILTER_ATTRIBUTE_GROUPS) {
      const raw = product?.[group] ?? product?.data?.[group];
      if (typeof raw === "string" && raw.includes("|")) {
        errors.push(`Product ${product.id} still has pipe-delimited ${group}.`);
      }
    }

    const before = fingerprintsBefore.get(product.id);
    if (before && before !== readProductFingerprint(product)) {
      errors.push(`Product ${product.id} non-attribute fields changed during classification update.`);
      continue;
    }

    verified += 1;
  }

  return {
    matched,
    verified,
    errors,
    clean: errors.length === 0,
  };
}

export {
  getSourceProductId,
  normalizeWorkbookProductId,
  VELVET_ORIGINAL_CLASSIFICATIONS_COLUMN,
};
