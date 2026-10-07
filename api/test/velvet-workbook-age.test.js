import assert from "node:assert/strict";
import test from "node:test";
import {
  extractVelvetWorkbookAgeSegments,
  parseVelvetWorkbookAgeRows,
  planVelvetWorkbookAgeUpdate,
  resolveVelvetWorkbookAgeValue,
} from "../src/catalog/velvetWorkbookAge.js";
import {
  normalizeAgeArray,
  normalizeProductFilterAttributeValue,
  serializePublicProductFilterAttribute,
  serializePublicProductFilterAttributes,
} from "../src/catalog/productFilterAttributes.js";
import { serializePublicProduct } from "../src/storefront/publicContent.js";

test("extracts the four workbook-native age segments from original classifications", () => {
  const segments = extractVelvetWorkbookAgeSegments(
    "ألعاب تعليم | من 3 ل 6 سنوات | من6 ل 10 سنوات | خشبيات",
  );
  assert.deepEqual(segments, ["من 3 ل 6 سنوات", "من6 ل 10 سنوات"]);
  assert.deepEqual(resolveVelvetWorkbookAgeValue("من 0 ل 3 سنوات"), ["0-3y"]);
  assert.deepEqual(resolveVelvetWorkbookAgeValue("من 10 سنوات فما فوق"), ["10+y"]);
  assert.deepEqual(
    resolveVelvetWorkbookAgeValue("ألعاب بنات | من 3 ل 6 سنوات | من6 ل 10 سنوات"),
    ["3-6y", "6-10y"],
  );
});

test("workbook age plan matches sourceProductId and persists canonical arrays", () => {
  const workbookProducts = parseVelvetWorkbookAgeRows([
    {
      "معرف المنتج": "317",
      "التصنيفات الأصلية": "ألعاب | من 3 ل 6 سنوات | من6 ل 10 سنوات",
    },
    {
      "معرف المنتج": "556",
      "التصنيفات الأصلية": "ألعاب بنات | الألعاب التمثيلية والخيال",
    },
  ]);

  const plan = planVelvetWorkbookAgeUpdate({
    workbookProducts,
    existingProducts: [
      { id: "velvet-src-317", sourceProductId: "317", age: [], price: 10, variants: [{ id: "v1", stock: 24 }] },
      { id: "velvet-src-556", sourceProductId: "556", age: [], price: 12, variants: [] },
    ],
  });

  assert.equal(plan.MATCHED_TO_WORKBOOK, 2);
  assert.equal(plan.PRODUCTS_WITH_AGE, 1);
  assert.equal(plan.PRODUCTS_WITHOUT_AGE, 1);
  assert.equal(plan.WOULD_UPDATE, 1);
  assert.deepEqual(plan.wouldUpdate[0].targetAge, ["3-6y", "6-10y"]);
  assert.deepEqual(plan.wouldUpdate[0].currentAge, []);
});

test("age normalization supports arrays, legacy strings, and pipe read compatibility", () => {
  assert.deepEqual(normalizeProductFilterAttributeValue("age", "0-3y"), ["0-3y"]);
  assert.deepEqual(normalizeProductFilterAttributeValue("age", ["3-6y", "6-10y"]), ["3-6y", "6-10y"]);
  assert.deepEqual(normalizeProductFilterAttributeValue("age", ["6-10y", "3-6y", "6-10y"]), ["3-6y", "6-10y"]);
  assert.deepEqual(normalizeAgeArray("3-6y|6-10y", { strict: false }), ["3-6y", "6-10y"]);
  assert.throws(() => normalizeProductFilterAttributeValue("age", "1-3 years"), /invalid value/i);
});

test("public structured age contract returns labeled arrays", () => {
  assert.deepEqual(serializePublicProductFilterAttribute("age", ["3-6y", "6-10y"]), [
    {
      id: "3-6y",
      label: { en: "3–6 Years", ar: "من 3 ل 6 سنوات" },
    },
    {
      id: "6-10y",
      label: { en: "6–10 Years", ar: "من 6 ل 10 سنوات" },
    },
  ]);
  assert.deepEqual(serializePublicProductFilterAttribute("age", []), []);
  assert.deepEqual(serializePublicProductFilterAttributes({ age: ["6-10y"] }).age, [
    {
      id: "6-10y",
      label: { en: "6–10 Years", ar: "من 6 ل 10 سنوات" },
    },
  ]);
  const product = serializePublicProduct({
    id: "p1",
    slug: "p1",
    name: { en: "Toy", ar: "لعبة" },
    age: ["3-6y", "6-10y"],
  });
  assert.deepEqual(product.age, ["3-6y", "6-10y"]);
  assert.deepEqual(product.filterAttributes.age, serializePublicProductFilterAttribute("age", ["3-6y", "6-10y"]));
});

test("duplicate sourceProductId matches are rejected", () => {
  const plan = planVelvetWorkbookAgeUpdate({
    workbookProducts: parseVelvetWorkbookAgeRows([
      { "معرف المنتج": "1", "التصنيفات الأصلية": "من 0 ل 3 سنوات" },
    ]),
    existingProducts: [
      { id: "a", sourceProductId: "1" },
      { id: "b", sourceProductId: "1" },
    ],
  });
  assert.equal(plan.DUPLICATE_SOURCE_IDS.length, 1);
  assert.equal(plan.CLEAN, false);
});
