/**
 * Velvet workbook age extraction and staging update planning.
 */

import {
  VELVET_WORKBOOK_AGE_IDS,
  ageValuesEqual,
  normalizeProductFilterAttributeForRead,
  normalizeProductFilterAttributeValue,
} from "./productFilterAttributes.js";

export const VELVET_COMPANY_ID = "kids-velvet";
export const VELVET_SITE_ID = "kids-velvet-storefront";
export const VELVET_ORIGINAL_CLASSIFICATIONS_COLUMN = "التصنيفات الأصلية";

function asWorkbookProductIdText(value) {
  if (value == null) return "";
  if (typeof value === "number" && Number.isFinite(value) && Number.isInteger(value)) return String(value);
  const text = String(value).trim();
  if (/^\d+\.0$/.test(text)) return text.slice(0, -2);
  return text;
}

export function normalizeWorkbookProductId(value) {
  const text = asWorkbookProductIdText(value);
  return /^\d+$/.test(text) ? text : "";
}

export function getSourceProductId(product) {
  if (!product || typeof product !== "object") return "";
  const direct = product.sourceProductId ?? product.data?.sourceProductId;
  return normalizeWorkbookProductId(direct);
}

/** @type {ReadonlyArray<{ pattern: RegExp, id: string }>} */
export const VELVET_WORKBOOK_AGE_SEGMENT_PATTERNS = Object.freeze([
  { pattern: /من\s*0\s*(?:ل|إلى|الى|-)\s*3\s*س/i, id: "0-3y" },
  { pattern: /من\s*3\s*(?:ل|إلى|الى|-)\s*6\s*س/i, id: "3-6y" },
  { pattern: /من\s*6\s*(?:ل|إلى|الى|-)\s*10\s*س/i, id: "6-10y" },
  { pattern: /من6\s*(?:ل|إلى|الى|-)\s*10\s*س/i, id: "6-10y" },
  { pattern: /من\s*10\s*س(?:نو(?:ات|ة)?|ن)?\s*ف(?:ما\s*)?فوق/i, id: "10+y" },
]);

const NON_AGE_SEGMENT_HINTS = Object.freeze([
  "ألعاب",
  "ليجو",
  "بازل",
  "خشب",
  "عروض",
  "وصل",
  "مدرس",
  "كتب",
  "مستلزمات",
  "مطابخ",
  "أزياء",
  "عالم",
  "رمضان",
  "عائلي",
  "بنات",
  "أولاد",
  "تعليم",
  "تركيب",
  "إبداع",
  "ذكاء",
  "تحدي",
  "اكتشاف",
  "تمثيل",
  "خيال",
  "مجسم",
  "مسلم",
  "صيف",
  "خارج",
  "حديث",
  "ولادة",
  "غرفة",
  "خصوم",
  "هدية",
  "احتفال",
]);

function splitClassificationSegments(raw) {
  if (raw === null || raw === undefined) return [];
  return String(raw)
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function looksLikeVelvetWorkbookAgeSegment(segment) {
  const text = String(segment || "").trim();
  if (!text) return false;
  if (VELVET_WORKBOOK_AGE_SEGMENT_PATTERNS.some(({ pattern }) => pattern.test(text))) {
    return true;
  }
  if (NON_AGE_SEGMENT_HINTS.some((hint) => text.includes(hint))) {
    return false;
  }
  return /\d/.test(text) && /(?:سن|سنو|شهر)/.test(text);
}

export function extractVelvetWorkbookAgeSegments(rawClassifications) {
  const segments = [];
  for (const segment of splitClassificationSegments(rawClassifications)) {
    if (!looksLikeVelvetWorkbookAgeSegment(segment)) continue;
    if (!segments.includes(segment)) segments.push(segment);
  }
  return segments;
}

export function resolveVelvetWorkbookAgeIdsFromSegments(segments = []) {
  const ids = [];
  for (const segment of segments) {
    for (const { pattern, id } of VELVET_WORKBOOK_AGE_SEGMENT_PATTERNS) {
      if (pattern.test(segment) && !ids.includes(id)) {
        ids.push(id);
      }
    }
  }
  return ids.sort(
    (left, right) => VELVET_WORKBOOK_AGE_IDS.indexOf(left) - VELVET_WORKBOOK_AGE_IDS.indexOf(right),
  );
}

export function resolveVelvetWorkbookAgeValue(rawClassifications) {
  const segments = extractVelvetWorkbookAgeSegments(rawClassifications);
  return resolveVelvetWorkbookAgeIdsFromSegments(segments);
}

export function resolveVelvetWorkbookAgeValueKey(rawClassifications) {
  const ids = resolveVelvetWorkbookAgeValue(rawClassifications);
  return ids.length ? JSON.stringify(ids) : "";
}

export function parseVelvetWorkbookAgeRows(rows = []) {
  const products = [];
  for (const row of rows) {
    const sourceProductId = normalizeWorkbookProductId(row.product_id ?? row["معرف المنتج"]);
    if (!sourceProductId) continue;
    const rawClassifications = row[VELVET_ORIGINAL_CLASSIFICATIONS_COLUMN]
      ?? row.original_classifications
      ?? row.originalClassifications
      ?? "";
    const ageSegments = extractVelvetWorkbookAgeSegments(rawClassifications);
    const targetAge = resolveVelvetWorkbookAgeValue(rawClassifications);
    products.push({
      sourceProductId,
      rawClassifications: String(rawClassifications || ""),
      ageSegments,
      targetAge,
    });
  }
  return products;
}

function readExistingAge(product) {
  return product?.age ?? product?.data?.age ?? [];
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

export function summarizeVelvetWorkbookAgeTags(workbookProducts = []) {
  const uniqueSegments = new Map();
  const uniqueResolved = new Map();
  for (const row of workbookProducts) {
    for (const segment of row.ageSegments) {
      uniqueSegments.set(segment, (uniqueSegments.get(segment) || 0) + 1);
    }
    if (row.targetAge.length) {
      uniqueResolved.set(JSON.stringify(row.targetAge), (uniqueResolved.get(JSON.stringify(row.targetAge)) || 0) + 1);
    }
  }
  return {
    uniqueAgeSegments: [...uniqueSegments.entries()].map(([segment, count]) => ({ segment, count })),
    uniqueResolvedAgeValues: [...uniqueResolved.entries()].map(([value, count]) => ({
      value: JSON.parse(value),
      count,
    })),
  };
}

export function isCleanVelvetWorkbookAgePlan(plan) {
  return plan.ERRORS.length === 0
    && plan.UNRESOLVED_AGE_TAGS.length === 0
    && plan.DUPLICATE_SOURCE_IDS.length === 0
    && plan.MISSING_SOURCE_IDS.length === 0;
}

export function planVelvetWorkbookAgeUpdate({
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
  const unresolvedAgeTags = [];
  const wouldUpdate = [];
  const alreadyCorrect = [];
  const withoutAge = [];
  const matched = [];

  for (const row of workbookProducts) {
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
    matched.push({
      sourceProductId: row.sourceProductId,
      productId: product.id,
      ageSegments: row.ageSegments,
      targetAge: row.targetAge,
    });

    if (!row.targetAge.length) {
      withoutAge.push({
        sourceProductId: row.sourceProductId,
        productId: product.id,
        rawClassifications: row.rawClassifications,
      });
      continue;
    }

    if (row.ageSegments.length && resolveVelvetWorkbookAgeIdsFromSegments(row.ageSegments).length === 0) {
      unresolvedAgeTags.push({
        sourceProductId: row.sourceProductId,
        rawClassifications: row.rawClassifications,
        ageSegments: row.ageSegments,
      });
      continue;
    }

    let normalizedTargetAge = [];
    try {
      normalizedTargetAge = normalizeProductFilterAttributeValue("age", row.targetAge, { strict: true });
    } catch (error) {
      errors.push(`Invalid target age for sourceProductId ${row.sourceProductId}: ${error.message}`);
      continue;
    }

    const currentAge = normalizeProductFilterAttributeForRead("age", readExistingAge(product));
    if (ageValuesEqual(currentAge, normalizedTargetAge)) {
      alreadyCorrect.push({
        sourceProductId: row.sourceProductId,
        productId: product.id,
        age: currentAge,
      });
      continue;
    }

    wouldUpdate.push({
      sourceProductId: row.sourceProductId,
      productId: product.id,
      currentAge,
      targetAge: normalizedTargetAge,
      ageSegments: row.ageSegments,
      fingerprintBefore: readProductFingerprint(product),
    });
  }

  return {
    WORKBOOK_PRODUCTS: workbookProducts.length,
    EXISTING_PRODUCTS: existingProducts.length,
    MATCHED_TO_WORKBOOK: matched.length,
    PRODUCTS_WITH_AGE: matched.filter((item) => item.targetAge.length).length,
    PRODUCTS_WITHOUT_AGE: withoutAge.length,
    SINGLE_AGE_PRODUCTS: workbookProducts.filter((row) => row.targetAge.length === 1).length,
    MULTI_AGE_PRODUCTS: workbookProducts.filter((row) => row.targetAge.length > 1).length,
    UNIQUE_AGE_TAGS: summarizeVelvetWorkbookAgeTags(workbookProducts).uniqueAgeSegments,
    UNRESOLVED_AGE_TAGS: unresolvedAgeTags,
    MISSING_SOURCE_IDS: missingSourceIds,
    DUPLICATE_SOURCE_IDS: duplicateSourceIds,
    WOULD_UPDATE: wouldUpdate.length,
    ALREADY_CORRECT: alreadyCorrect.length,
    wouldUpdate,
    alreadyCorrect,
    withoutAge,
    matched,
    ERRORS: errors,
    CLEAN: errors.length === 0
      && unresolvedAgeTags.length === 0
      && duplicateSourceIds.length === 0
      && missingSourceIds.length === 0,
  };
}

export function summarizeVelvetWorkbookAgeVerification({
  products = [],
  workbookBySourceId = new Map(),
  fingerprintsBefore = new Map(),
} = {}) {
  let matched = 0;
  let withAge = 0;
  let withoutAge = 0;
  let alreadyCorrect = 0;
  let unresolved = 0;
  const errors = [];

  for (const product of products) {
    const sourceProductId = getSourceProductId(product);
    const workbookRow = workbookBySourceId.get(sourceProductId);
    if (!workbookRow) continue;
    matched += 1;

    const expectedAge = workbookRow.targetAge.length
      ? normalizeProductFilterAttributeForRead("age", workbookRow.targetAge)
      : [];
    const actualAge = normalizeProductFilterAttributeForRead("age", readExistingAge(product));

    if (!expectedAge.length) {
      withoutAge += 1;
      if (actualAge.length) {
        unresolved += 1;
        errors.push(`Product ${product.id} should have empty age, got ${JSON.stringify(actualAge)}`);
      }
      continue;
    }
    withAge += 1;

    if (!ageValuesEqual(actualAge, expectedAge)) {
      unresolved += 1;
      errors.push(`Product ${product.id} age mismatch: expected ${JSON.stringify(expectedAge)}, got ${JSON.stringify(actualAge)}`);
    } else {
      alreadyCorrect += 1;
    }

    if (typeof product?.age === "string" && product.age.includes("|")) {
      errors.push(`Product ${product.id} still has pipe-delimited age value.`);
    }

    const before = fingerprintsBefore.get(product.id);
    if (before && before !== readProductFingerprint(product)) {
      errors.push(`Product ${product.id} non-age fields changed during age update.`);
    }
  }

  let singleAge = 0;
  let multiAge = 0;
  for (const product of products) {
    const sourceProductId = getSourceProductId(product);
    const workbookRow = workbookBySourceId.get(sourceProductId);
    if (!workbookRow || !workbookRow.targetAge.length) continue;
    if (workbookRow.targetAge.length === 1) singleAge += 1;
    if (workbookRow.targetAge.length > 1) multiAge += 1;
  }

  return {
    matched,
    withAge,
    withoutAge,
    alreadyCorrect,
    unresolved,
    singleAge,
    multiAge,
    errors,
    clean: errors.length === 0,
  };
}
