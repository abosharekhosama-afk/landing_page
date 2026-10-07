import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import { buildCategoryHierarchy, expandedPathsForSearch, filterCategoryHierarchy, visibleCategoriesForTenant } from "../src/utils/categoryHierarchy.js";

const pageSource = fs.readFileSync(new URL("../src/pages/AdminDashboardPage.jsx", import.meta.url), "utf8");
const componentSource = fs.readFileSync(new URL("../src/components/CategoriesHierarchy.jsx", import.meta.url), "utf8");

const brands = Array.from({ length: 12 }, (_, index) => ({ id: `brand-${index + 1}`, name: `Brand ${index + 1}` }));
const categories = [
  { id: "legacy", name: "Legacy", parentId: null, brandId: null },
  { id: "main-1", name: { en: "Vehicles" }, parentId: null, brandId: "brand-1" },
  { id: "sub-1", name: { en: "Push Cars" }, parentId: "main-1", brandId: null },
];

test("legacy global roots are hidden only for Kids Velvet", () => {
  assert.deepEqual(visibleCategoriesForTenant(categories, "kids-velvet").map((item) => item.id), ["main-1", "sub-1"]);
  assert.deepEqual(visibleCategoriesForTenant(categories, "icare").map((item) => item.id), ["legacy", "main-1", "sub-1"]);
});

test("all brands are represented and main/subcategories are nested", () => {
  const hierarchy = buildCategoryHierarchy(brands, categories);
  assert.equal(hierarchy.length, 12);
  assert.equal(hierarchy[0].mainCategories[0].category.id, "main-1");
  assert.equal(hierarchy[0].mainCategories[0].subcategories[0].id, "sub-1");
});

test("nested search reveals the matching brand and main category path", () => {
  const result = filterCategoryHierarchy(buildCategoryHierarchy(brands, categories), "push cars");
  assert.equal(result.length, 1);
  assert.equal(result[0].brand.id, "brand-1");
  assert.equal(result[0].mainCategories[0].category.id, "main-1");
  assert.deepEqual(expandedPathsForSearch(result, "push cars"), { brandIds: ["brand-1"], mainCategoryIds: ["main-1"] });
});

test("Kids Velvet uses hierarchy while other tenants keep the existing flat view", () => {
  assert.match(pageSource, /kind === "categories" && companyId === "kids-velvet"/);
  assert.match(pageSource, /return renderSimpleTable\("categories"\)/);
});

test("add actions preselect brand or parent and preserve existing save rules", () => {
  assert.match(pageSource, /onAddMain=\{\(brandId\) => openNewCategory\(\{ brandId \}\)\}/);
  assert.match(pageSource, /onAddSubcategory=\{\(parentId\) => openNewCategory\(\{ parentId \}\)\}/);
  assert.match(pageSource, /brandId: form\.parentId \? null : form\.brandId \|\| null/);
  assert.match(pageSource, /imageUrl: form\.parentId \? null : form\.image \|\| null/);
});

test("tree starts collapsed and exposes accessible expansion controls", () => {
  assert.match(componentSource, /useState\(\(\) => new Set\(\)\)/);
  assert.match(componentSource, /aria-expanded=\{brandOpen\}/);
  assert.match(componentSource, /aria-expanded=\{mainOpen\}/);
});
