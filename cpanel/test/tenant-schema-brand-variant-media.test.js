import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const wizard = fs.readFileSync(new URL("../src/pages/AdminDashboardPage.jsx", import.meta.url), "utf8");
const schemaApi = fs.readFileSync(new URL("../src/utils/productSchemaApi.js", import.meta.url), "utf8");

test("ProductWizard loads tenant product schema instead of hardcoding Velvet hides", () => {
  assert.match(schemaApi, /fetchCompanyProductSchema/);
  assert.match(schemaApi, /\/product-schema/);
  assert.match(wizard, /fetchCompanyProductSchema/);
  assert.match(wizard, /showSchemaDetailMedia/);
  assert.match(wizard, /showSchemaDetailFields/);
  assert.doesNotMatch(wizard, /display:\s*none/);
});

test("Brand editor exposes independent Brand Page Header Image field", () => {
  assert.match(wizard, /headerImage/);
  assert.match(wizard, /Brand Page Header Image/);
  assert.match(wizard, /صورة هيدر صفحة البراند/);
  assert.match(wizard, /headerImage: form\.headerImage \|\| null/);
});

test("ProductWizard variant editor still manages per-variant image_url media", () => {
  assert.match(wizard, /image_url/);
  assert.match(wizard, /uploadVariantImage/);
});
