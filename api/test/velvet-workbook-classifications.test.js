import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyVelvetSourceTag,
  parseVelvetWorkbookClassificationRows,
  planVelvetWorkbookClassificationUpdate,
  resolveVelvetWorkbookProductAttributes,
  splitVelvetWorkbookClassificationTags,
  summarizeVelvetSourceTagInventory,
  VELVET_SOURCE_TAG_REGISTRY,
} from "../src/catalog/velvetWorkbookClassifications.js";
import {
  normalizeProductFilterAttributeValue,
  serializePublicProductFilterAttributes,
} from "../src/catalog/productFilterAttributes.js";

test("registry covers every known workbook source tag without unresolved entries", () => {
  assert.equal(VELVET_SOURCE_TAG_REGISTRY.length, 31);
  for (const entry of VELVET_SOURCE_TAG_REGISTRY) {
    const classified = classifyVelvetSourceTag(entry.tag);
    assert.equal(classified.status, entry.status);
    if (entry.group) assert.equal(classified.group, entry.group);
    if (entry.id) assert.equal(classified.id, entry.id);
  }
});

test("splits pipe-delimited source tags and preserves Arabic text", () => {
  const tags = splitVelvetWorkbookClassificationTags("ألعاب أولاد | خشبيات | من 3 ل 6 سنوات");
  assert.deepEqual(tags, ["ألعاب أولاد", "خشبيات", "من 3 ل 6 سنوات"]);
});

test("resolves multi-value workbook attributes into canonical arrays", () => {
  const resolved = resolveVelvetWorkbookProductAttributes(
    "ألعاب أولاد | ألعاب بنات | ألعاب ذكاء، تحدي واكتشاف | من 3 ل 6 سنوات | خشبيات | عروض وخصومات",
  );
  assert.deepEqual(resolved.attributes.age, ["3-6y"]);
  assert.deepEqual(resolved.attributes.gender, ["boys", "girls"]);
  assert.deepEqual(resolved.attributes.skill, ["intelligence-challenge-discovery"]);
  assert.deepEqual(resolved.attributes.material, ["wood"]);
  assert.deepEqual(resolved.attributes.collection, ["promotions-discounts"]);
  assert.deepEqual(resolved.unmappedTags, []);
});

test("workbook classification plan matches all 434 products by sourceProductId", () => {
  const rows = [];
  const withoutAgeIds = new Set(["10", "20"]);
  for (let index = 1; index <= 434; index += 1) {
    rows.push({
      product_id: String(index),
      "اسم المنتج": `Product ${index}`,
      "التصنيفات الأصلية": withoutAgeIds.has(String(index))
        ? "ألعاب مميزة"
        : "من 3 ل 6 سنوات | ألعاب أولاد",
    });
  }
  const workbookProducts = parseVelvetWorkbookClassificationRows(rows);
  const existingProducts = rows.map((row) => ({
    id: `p-${row.product_id}`,
    data: { sourceProductId: row.product_id },
  }));
  const plan = planVelvetWorkbookClassificationUpdate({ workbookProducts, existingProducts });
  assert.equal(plan.WORKBOOK_PRODUCTS, 434);
  assert.equal(plan.MATCHED_TO_WORKBOOK, 434);
  assert.equal(plan.MISSING_SOURCE_IDS.length, 0);
  assert.equal(plan.DUPLICATE_SOURCE_IDS.length, 0);
  assert.equal(plan.UNRESOLVED_TAGS.length, 0);
  assert.equal(plan.CLEAN, true);
  assert.equal(plan.AGE_COVERAGE, 432);
  assert.equal(plan.GENDER_COVERAGE, 432);
});

test("public structured contract exposes implemented multi-value arrays", () => {
  const structured = serializePublicProductFilterAttributes({
    age: ["3-6y", "6-10y"],
    gender: ["boys"],
    skill: ["construction-creativity"],
    material: ["wood"],
    productType: ["lego"],
    theme: ["family-play"],
    collection: ["featured"],
  });
  assert.deepEqual(structured.age.map((entry) => entry.id), ["3-6y", "6-10y"]);
  assert.deepEqual(structured.gender.map((entry) => entry.id), ["boys"]);
  assert.deepEqual(structured.skill.map((entry) => entry.id), ["construction-creativity"]);
  assert.deepEqual(structured.material.map((entry) => entry.id), ["wood"]);
  assert.equal(structured.occasion.length, 0);
  assert.throws(() => normalizeProductFilterAttributeValue("gender", ["invalid-id"], { strict: true }));
});

test("source tag inventory reports all unique tags", () => {
  const rows = parseVelvetWorkbookClassificationRows([
    {
      product_id: "1",
      "اسم المنتج": "A",
      "التصنيفات الأصلية": "خشبيات | ألعاب أولاد",
    },
    {
      product_id: "2",
      "اسم المنتج": "B",
      "التصنифات الأصلية": "خشبيات",
      "التصنيفات الأصلية": "خشبيات",
    },
  ]);
  const inventory = summarizeVelvetSourceTagInventory(rows);
  assert.equal(inventory.length, 2);
  assert.equal(inventory.find((entry) => entry.tag === "خشبيات")?.unique_product_count, 2);
});
