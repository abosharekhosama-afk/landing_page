import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const dashboard = fs.readFileSync(new URL("../src/pages/AdminDashboardPage.jsx", import.meta.url), "utf8");
const utils = fs.readFileSync(new URL("../src/utils/productFilterAttributes.js", import.meta.url), "utf8");
const shared = fs.readFileSync(new URL("../../shared/catalog/productFilterAttributes.js", import.meta.url), "utf8");
const canonical = fs.readFileSync(new URL("../../api/src/catalog/productFilterAttributes.js", import.meta.url), "utf8");

test("ProductWizard uses shared canonical filter attribute vocabulary", () => {
  assert.match(dashboard, /from "\.\.\/utils\/productFilterAttributes\.js"/);
  assert.match(dashboard, /getLocalizedFilterAttributeOptions\("age"/);
  assert.match(dashboard, /toggleFilterAttribute\(/);
  assert.match(dashboard, /PRODUCT_FILTER_FORM_GROUPS/);
  assert.match(dashboard, /product-form-attributes/);
  assert.match(dashboard, /requiresCanonicalAgeSelection\(form\.age\)/);
  assert.doesNotMatch(dashboard, /"1-3 years"/);
  assert.doesNotMatch(dashboard, /\["Boys", "Girls", "Unisex"\]/);
});

test("active age options exclude overlapping retired canonical ranges", () => {
  assert.match(shared, /export \* from "\.\.\/\.\.\/api\/src\/catalog\/productFilterAttributes\.js"/);
  assert.doesNotMatch(canonical, /option\("1-3y"/);
  assert.doesNotMatch(canonical, /option\("6-9y"/);
  assert.doesNotMatch(canonical, /option\("9-12y"/);
  assert.doesNotMatch(canonical, /option\("13\+"/);
  assert.match(canonical, /option\("3-6y"/);
  assert.match(canonical, /option\("6-10y"/);
  assert.match(canonical, /option\("0-3y"/);
  assert.match(canonical, /option\("10\+y"/);
  assert.match(canonical, /option\("13-17y"/);
  assert.match(canonical, /option\("7-9y"/);
});

test("localized filter attribute options expose canonical IDs only for new products", async () => {
  const {
    getLocalizedFilterAttributeOptions,
    getLocalizedFilterAttributeOptionsForSelect,
    requiresCanonicalAgeSelection,
  } = await import("../src/utils/productFilterAttributes.js");

  const options = getLocalizedFilterAttributeOptions("age", "en");
  assert.deepEqual(options.map((entry) => entry.id), [
    "0-12m", "1-2y", "3-4y", "5-6y", "7-9y", "10-12y", "13-17y", "adults",
    "0-3y", "3-6y", "6-10y", "10+y",
  ]);

  const legacy = getLocalizedFilterAttributeOptionsForSelect("age", "en", "12+ years");
  assert.equal(legacy.length, options.length + 1);
  assert.ok(legacy.some((entry) => entry.id === "12+ years" && /legacy value/i.test(entry.label)));
  assert.ok(requiresCanonicalAgeSelection("12+ years"));
  assert.ok(requiresCanonicalAgeSelection("13+"));
});

test("exact legacy age resolves to canonical form value for editing", async () => {
  const { resolveProductFilterAttributeForForm } = await import("../src/utils/productFilterAttributes.js");
  assert.deepEqual(resolveProductFilterAttributeForForm("age", "0-12 months"), ["0-12m"]);
  assert.deepEqual(resolveProductFilterAttributeForForm("age", "1-3 years"), ["1-3 years"]);
  assert.deepEqual(resolveProductFilterAttributeForForm("age", ["3-6y", "6-10y"]), ["3-6y", "6-10y"]);
  assert.deepEqual(resolveProductFilterAttributeForForm("gender", "boys"), ["boys"]);
  assert.deepEqual(resolveProductFilterAttributeForForm("skill", ["construction-creativity"]), ["construction-creativity"]);
});
