import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createTranslator } from "../src/data/translations.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dashboard = fs.readFileSync(path.join(root, "src/pages/AdminDashboardPage.jsx"), "utf8");
const panel = fs.readFileSync(path.join(root, "src/components/ProductDisplayPriorityPanel.jsx"), "utf8");
const listStart = dashboard.indexOf("function ProductsListPage({");
const listEnd = dashboard.indexOf("function ProductsTrashPage({");
const list = dashboard.slice(listStart, listEnd);

test("products page title and subtitle resolve in English and Arabic", () => {
  const en = createTranslator("en");
  const ar = createTranslator("ar");
  assert.equal(en("admin.products"), "Products");
  assert.equal(ar("admin.products"), "المنتجات");
  assert.equal(en("admin.productsSubtitle"), "Manage catalog products for this company.");
  assert.equal(ar("admin.productsSubtitle"), "إدارة منتجات الكتالوج لهذه الشركة.");
  assert.notEqual(en("admin.products"), "admin.products");
  assert.notEqual(ar("admin.productsSubtitle"), "admin.productsSubtitle");
  assert.match(list, /t\("admin\.products"\)/);
  assert.match(list, /t\("admin\.productsSubtitle"\)/);
});

test("display priority selection uses the product form classifications", () => {
  const form = fs.readFileSync(path.join(root, "src/utils/productVariantsForm.js"), "utf8");
  assert.match(panel, /PRODUCT_FILTER_FORM_GROUPS/);
  assert.match(panel, /PRODUCT_FILTER_FORM_LABELS/);
  assert.match(panel, /PRODUCT_MERCHANDISING_FLAGS/);
  assert.match(panel, /getLocalizedFilterAttributeOptions\("collection"/);
  assert.match(panel, /getMainCategories/);
  assert.match(panel, /getSubcategoriesForMain/);
  assert.match(panel, /t\(`productForm\.\$\{id\}`\)/);
  assert.match(dashboard, /PRODUCT_FILTER_FORM_LABELS/);
  assert.match(dashboard, /PRODUCT_MERCHANDISING_FLAGS\.map/);
  assert.match(form, /age: \{ en: "Age", ar: "العمر" \}/);
  assert.doesNotMatch(panel, /FILTER_GROUP_LABELS/);
  assert.doesNotMatch(panel, /FLAG_IDS = \["newArrival", "bestseller"\]/);
});

test("display priority controls stay in a start-aligned layout", () => {
  assert.match(panel, /products-display-priority/);
  assert.doesNotMatch(panel, /admin-toolbar/);
  assert.doesNotMatch(panel, /style=\{\{/);
});

test("products list no longer contains mojibake punctuation", () => {
  assert.doesNotMatch(list, /â€¦|â€”|â€“|â‹®/);
  assert.doesNotMatch(dashboard, /ط§|â€/);
});
