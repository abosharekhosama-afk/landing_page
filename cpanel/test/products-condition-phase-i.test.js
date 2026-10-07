import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("ProductWizard shows condition selector only when conditionEnabled is true", () => {
  const dashboard = read("src/pages/AdminDashboardPage.jsx");
  assert.match(dashboard, /conditionEnabled = false/);
  assert.match(dashboard, /conditionEnabled \? \(/);
  assert.match(dashboard, /productForm\.conditionNew/);
  assert.match(dashboard, /productForm\.conditionRefurbished/);
  assert.match(dashboard, /productForm\.conditionUsed/);
  assert.match(dashboard, /productPayload\.condition = form\.condition \|\| null/);
  assert.doesNotMatch(dashboard, /products\.condition\.manage/);
});

test("Product Settings gate is company-level and no longer deferred", () => {
  const settings = read("src/pages/AdminProductSettingsPage.jsx");
  assert.match(settings, /productConditionEnabled/);
  assert.match(settings, /Enable product condition \(New \/ Refurbished \/ Used\)/);
  assert.doesNotMatch(settings, /deferred to Phase I/);
  assert.doesNotMatch(settings, /Phase I precursor/);
});

test("storefront detail can display condition without treating it as a filter attribute", () => {
  const details = read("src/pages/ProductDetailsPage.jsx");
  const filters = read("src/utils/productFilterAttributes.js");
  assert.match(details, /productConditionLabel/);
  assert.match(details, /product\.condition/);
  assert.doesNotMatch(filters, /condition/);
});

test("translations include New / Refurbished / Used labels", () => {
  const translations = read("src/data/translations.js");
  assert.match(translations, /"productForm\.conditionNew": "New"/);
  assert.match(translations, /"productForm\.conditionRefurbished": "Refurbished"/);
  assert.match(translations, /"productForm\.conditionUsed": "Used"/);
  assert.match(translations, /"productForm\.conditionNew": "جديد"/);
});
