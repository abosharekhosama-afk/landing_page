import assert from "node:assert/strict";
import test from "node:test";
import {
  AMBIGUOUS_LEGACY_AGE_ALIASES,
  PRODUCT_FILTER_ATTRIBUTE_GROUPS,
  PRODUCT_FILTER_ATTRIBUTE_OPTIONS,
  RETIRED_OVERLAPPING_AGE_IDS,
  getProductFilterAttributeLabel,
  isAmbiguousLegacyAgeValue,
  isExactLegacyAgeMapping,
  listUnmappedProductFilterAttributeValues,
  normalizeProductFilterAttributeForRead,
  normalizeProductFilterAttributeValue,
  requiresCanonicalAgeSelection,
  resolveProductFilterAttributeForForm,
  serializePublicProductFilterAttribute,
  serializePublicProductFilterAttributes,
  serializePublicProductFilterDefinitions,
  serializePublicProductFilterDefinitionsFromProducts,
} from "../src/catalog/productFilterAttributes.js";
import { serializePublicProduct } from "../src/storefront/publicContent.js";

test("active age vocabulary is non-overlapping and fully localized", () => {
  const ageIds = PRODUCT_FILTER_ATTRIBUTE_OPTIONS.age.map((entry) => entry.id);
  assert.deepEqual(ageIds, [
    "0-12m", "1-2y", "3-4y", "5-6y", "7-9y", "10-12y", "13-17y", "adults",
    "0-3y", "3-6y", "6-10y", "10+y",
  ]);
  assert.deepEqual([...RETIRED_OVERLAPPING_AGE_IDS], ["1-3y", "6-9y", "9-12y", "13+"]);
  for (const entry of PRODUCT_FILTER_ATTRIBUTE_OPTIONS.age) {
    assert.ok(entry.label.en, `${entry.id} english label`);
    assert.ok(entry.label.ar, `${entry.id} arabic label`);
  }
  assert.ok(!ageIds.includes("13+"));
});

test("exact legacy age mappings normalize safely on read and write", () => {
  assert.deepEqual(normalizeProductFilterAttributeValue("age", "0-12 months"), ["0-12m"]);
  assert.deepEqual(normalizeProductFilterAttributeForRead("age", "0-12 months"), ["0-12m"]);
  assert.ok(isExactLegacyAgeMapping("0-12 months"));
  assert.ok(!isExactLegacyAgeMapping("12+ years"));
  assert.ok(!isExactLegacyAgeMapping("12+"));
});

test("12 plus legacy age values are ambiguous and never silently mapped", () => {
  for (const legacy of ["12+ years", "12+"]) {
    assert.ok(isAmbiguousLegacyAgeValue(legacy), `${legacy} is ambiguous`);
    assert.deepEqual(normalizeProductFilterAttributeForRead("age", legacy), [legacy]);
    assert.deepEqual(resolveProductFilterAttributeForForm("age", legacy), [legacy]);
    assert.throws(() => normalizeProductFilterAttributeValue("age", legacy), /invalid value/i);
    assert.ok(requiresCanonicalAgeSelection(legacy));
    assert.deepEqual(serializePublicProductFilterAttribute("age", legacy), []);
  }
});

test("legacy stored 13 plus is ambiguous and preserved without false structured ID", () => {
  assert.ok(isAmbiguousLegacyAgeValue("13+"));
  assert.deepEqual(normalizeProductFilterAttributeForRead("age", "13+"), ["13+"]);
  assert.throws(() => normalizeProductFilterAttributeValue("age", "13+"), /invalid value/i);
  assert.deepEqual(serializePublicProductFilterAttribute("age", "13+"), []);
  const product = serializePublicProduct({
    id: "p1",
    slug: "p1",
    name: { en: "Toy", ar: "لعبة" },
    age: "13+",
  });
  assert.deepEqual(product.age, ["13+"]);
  assert.deepEqual(product.filterAttributes.age, []);
});

test("13-17y is canonical and serializes with bilingual labels", () => {
  assert.deepEqual(normalizeProductFilterAttributeValue("age", "13-17y"), ["13-17y"]);
  assert.deepEqual(serializePublicProductFilterAttribute("age", "13-17y"), [{
    id: "13-17y",
    label: { en: "13–17 Years", ar: "13–17 سنة" },
  }]);
  const product = serializePublicProduct({
    id: "p1",
    slug: "p1",
    name: { en: "Toy", ar: "لعبة" },
    age: "13-17y",
  });
  assert.deepEqual(product.age, ["13-17y"]);
  assert.deepEqual(product.filterAttributes.age, [{
    id: "13-17y",
    label: { en: "13–17 Years", ar: "13–17 سنة" },
  }]);
});

test("adults remains canonical without overlapping 13 plus", () => {
  assert.deepEqual(normalizeProductFilterAttributeValue("age", "adults"), ["adults"]);
  assert.deepEqual(serializePublicProductFilterAttribute("age", "adults"), [{
    id: "adults",
    label: { en: "Adults", ar: "البالغون" },
  }]);
});

test("ambiguous legacy age values are preserved on read and rejected on write", () => {
  for (const legacy of ["1-3 years", "3-6 years", "6-9 years", "9-12 years", "3-6", "1-3y"]) {
    assert.ok(isAmbiguousLegacyAgeValue(legacy), `${legacy} is ambiguous`);
    assert.deepEqual(normalizeProductFilterAttributeForRead("age", legacy), [legacy]);
    assert.deepEqual(resolveProductFilterAttributeForForm("age", legacy), [legacy]);
    assert.throws(() => normalizeProductFilterAttributeValue("age", legacy), /invalid value/i);
    assert.ok(requiresCanonicalAgeSelection(legacy));
  }
});

test("gender skill and occasion vocabularies stay clean with stable IDs", () => {
  for (const group of ["gender", "skill", "occasion"]) {
    const ids = PRODUCT_FILTER_ATTRIBUTE_OPTIONS[group].map((entry) => entry.id);
    assert.equal(new Set(ids).size, ids.length, `${group} has duplicate IDs`);
    for (const entry of PRODUCT_FILTER_ATTRIBUTE_OPTIONS[group]) {
      assert.match(entry.id, /^[a-z0-9+.-]+$/);
      assert.ok(entry.label.en);
      assert.ok(entry.label.ar);
    }
  }
});

test("gender normalization maps legacy display labels to canonical IDs", () => {
  assert.deepEqual(normalizeProductFilterAttributeValue("gender", "Boys"), ["boys"]);
  assert.deepEqual(normalizeProductFilterAttributeValue("gender", "Girls"), ["girls"]);
  assert.deepEqual(normalizeProductFilterAttributeValue("gender", "unisex"), ["unisex"]);
});

test("skill and occasion normalization preserve distinct legacy concepts", () => {
  assert.deepEqual(normalizeProductFilterAttributeValue("skill", "Beginner"), ["beginner"]);
  assert.deepEqual(normalizeProductFilterAttributeValue("occasion", "Birthday"), ["birthday"]);
  assert.deepEqual(normalizeProductFilterAttributeValue("occasion", "Everyday"), ["everyday"]);
});

test("serializePublicProduct preserves ambiguous age and normalizes exact legacy age", () => {
  const ambiguous = serializePublicProduct({
    id: "p1",
    slug: "p1",
    name: { en: "Toy", ar: "لعبة" },
    age: "1-3 years",
  });
  assert.deepEqual(ambiguous.age, ["1-3 years"]);

  const exact = serializePublicProduct({
    id: "p2",
    slug: "p2",
    name: { en: "Toy", ar: "لعبة" },
    age: "0-12 months",
    gender: "Boys",
  });
  assert.deepEqual(exact.age, ["0-12m"]);
  assert.deepEqual(exact.gender, ["boys"]);
});

test("localized labels are available for canonical IDs", () => {
  assert.equal(getProductFilterAttributeLabel("age", "7-9y", "en"), "7–9 Years");
  assert.equal(getProductFilterAttributeLabel("gender", "boys", "ar"), "أولاد");
});

test("listUnmappedProductFilterAttributeValues reports ambiguous legacy age values", () => {
  const unknown = listUnmappedProductFilterAttributeValues("age", ["1-3 years", "0-12m"]);
  assert.deepEqual(unknown, ["1-3 years"]);
});

test("retired overlapping age IDs are not active canonical options", () => {
  const activeIds = new Set(PRODUCT_FILTER_ATTRIBUTE_OPTIONS.age.map((entry) => entry.id));
  for (const retired of RETIRED_OVERLAPPING_AGE_IDS) {
    assert.ok(!activeIds.has(retired));
    assert.ok(AMBIGUOUS_LEGACY_AGE_ALIASES.includes(retired));
  }
});

test("structured public filter attributes expose canonical id and bilingual labels", () => {
  assert.deepEqual(serializePublicProductFilterAttribute("age", ["3-4y"]), [{
    id: "3-4y",
    label: { en: "3–4 Years", ar: "3–4 سنوات" },
  }]);
  assert.deepEqual(serializePublicProductFilterAttribute("gender", "Boys"), [{
    id: "boys",
    label: { en: "Boys", ar: "أولاد" },
  }]);
});

test("structured public filter attributes return empty arrays for empty values", () => {
  assert.deepEqual(serializePublicProductFilterAttribute("age", ""), []);
  assert.deepEqual(serializePublicProductFilterAttribute("age", null), []);
  assert.deepEqual(serializePublicProductFilterAttribute("age", []), []);
  for (const group of ["gender", "skill", "occasion", "material", "productType", "theme", "collection"]) {
    assert.deepEqual(serializePublicProductFilterAttribute(group, ""), []);
    assert.deepEqual(serializePublicProductFilterAttribute(group, null), []);
  }
  assert.deepEqual(serializePublicProductFilterAttributes({}), {
    age: [],
    gender: [],
    skill: [],
    occasion: [],
    material: [],
    productType: [],
    theme: [],
    collection: [],
  });
});

test("exact legacy values normalize into structured canonical attributes", () => {
  assert.deepEqual(serializePublicProductFilterAttribute("age", "0-12 months"), [{
    id: "0-12m",
    label: { en: "0–12 Months", ar: "0–12 شهر" },
  }]);
});

test("ambiguous legacy age does not produce a false structured canonical attribute", () => {
  assert.deepEqual(serializePublicProductFilterAttribute("age", "1-3 years"), []);
  const product = serializePublicProduct({
    id: "p1",
    slug: "p1",
    name: { en: "Toy", ar: "لعبة" },
    age: "1-3 years",
  });
  assert.deepEqual(product.age, ["1-3 years"]);
  assert.deepEqual(product.filterAttributes.age, []);
});

test("serializePublicProduct keeps flat fields and adds structured filterAttributes", () => {
  const product = serializePublicProduct({
    id: "p1",
    slug: "p1",
    name: { en: "Toy", ar: "لعبة" },
    age: ["7-9y"],
    gender: "unisex",
    skill: "creativity",
    occasion: "birthday",
    variants: [{ id: "v1", size: "Standard", price: 10, stock: 1, visible: true }],
    options: [{ name: { en: "Color", ar: "اللون" }, values: [{ label: { en: "Red", ar: "أحمر" }, color: "#f00" }] }],
  });
  assert.deepEqual(product.age, ["7-9y"]);
  assert.deepEqual(product.gender, ["unisex"]);
  assert.deepEqual(product.skill, ["creativity"]);
  assert.deepEqual(product.occasion, ["birthday"]);
  assert.deepEqual(product.filterAttributes.age, [{
    id: "7-9y",
    label: { en: "7–9 Years", ar: "7–9 سنوات" },
  }]);
  assert.deepEqual(product.filterAttributes.gender[0].id, "unisex");
  assert.equal(product.variants.length, 1);
  assert.equal(product.options.length, 1);
});

test("legacy pipe-delimited age strings are read-compatible but normalize to arrays", () => {
  assert.deepEqual(normalizeProductFilterAttributeForRead("age", "3-6y|6-10y"), ["3-6y", "6-10y"]);
  assert.deepEqual(normalizeProductFilterAttributeValue("age", "3-6y|6-10y"), ["3-6y", "6-10y"]);
});

test("public filter definitions expose tenant-generic canonical vocabulary metadata", () => {
  const definitions = serializePublicProductFilterDefinitions();
  assert.deepEqual(Object.keys(definitions), [
    "age", "gender", "skill", "occasion", "material", "productType", "theme", "collection",
  ]);
  const ageIds = definitions.age.map((entry) => entry.id);
  assert.deepEqual(ageIds, [
    "0-12m", "1-2y", "3-4y", "5-6y", "7-9y", "10-12y", "13-17y", "adults",
    "0-3y", "3-6y", "6-10y", "10+y",
  ]);
  assert.ok(!ageIds.includes("13+"));
  assert.ok(definitions.age.some((entry) => entry.id === "13-17y" && entry.label.en === "13–17 Years" && entry.label.ar === "13–17 سنة"));
  assert.ok(definitions.gender.some((entry) => entry.id === "unisex"));
});

test("tenant-scoped filter definitions include only options used by catalog products", () => {
  const empty = serializePublicProductFilterDefinitionsFromProducts([
    { age: [], gender: [], skill: [], occasion: [] },
  ]);
  for (const group of PRODUCT_FILTER_ATTRIBUTE_GROUPS) {
    assert.deepEqual(empty[group], [], `expected empty ${group} definitions`);
  }

  const scoped = serializePublicProductFilterDefinitionsFromProducts([
    { age: ["3-6y", "6-10y"], gender: ["boys", "girls"], skill: ["creativity"], collection: ["featured"] },
  ]);
  assert.deepEqual(scoped.age.map((entry) => entry.id), ["3-6y", "6-10y"]);
  assert.deepEqual(scoped.gender.map((entry) => entry.id), ["boys", "girls"]);
  assert.deepEqual(scoped.skill.map((entry) => entry.id), ["creativity"]);
  assert.deepEqual(scoped.occasion, []);
  assert.deepEqual(scoped.collection.map((entry) => entry.id), ["featured"]);
  assert.ok(!scoped.gender.some((entry) => entry.id === "unisex"));
});
