import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  getMainCategories,
  getMainCategoriesForBrand,
  getSubcategoriesForMain,
  isCompleteProductHierarchy,
  isMainCategory,
  resolveMainCategoryFor,
  validateProductHierarchySelection,
} from "../src/utils/adminCategories.js";

const dashboardSource = fs.readFileSync(new URL("../src/pages/AdminDashboardPage.jsx", import.meta.url), "utf8");

const brands = [
  { id: "velvet", name: { en: "VELVET" }, isActive: true },
  { id: "baby", name: { en: "BABY" }, isActive: true },
];

const categories = [
  { id: "main-clothing", slug: "clothing", parentId: null, brandId: "velvet", isActive: true, name: { en: "Clothing" } },
  { id: "main-toys", slug: "toys", parentId: null, brandId: "velvet", isActive: true, name: { en: "Toys" } },
  { id: "main-baby", slug: "baby-main", parentId: null, brandId: "baby", isActive: true, name: { en: "Baby" } },
  { id: "sub-dresses", slug: "dresses", parentId: "main-clothing", isActive: true, name: { en: "Dresses" } },
  { id: "sub-shirt", slug: "shirt", parentId: "main-clothing", isActive: true, name: { en: "Shirts" } },
  { id: "sub-doll", slug: "doll", parentId: "main-toys", isActive: true, name: { en: "Dolls" } },
];

test("isMainCategory only returns true for parentless categories", () => {
  assert.equal(isMainCategory(categories[0]), true);
  assert.equal(isMainCategory(categories[3]), false);
  assert.equal(isMainCategory(null), false);
});

test("getMainCategories returns top-level categories", () => {
  assert.deepEqual(getMainCategories(categories).map((category) => category.id), ["main-clothing", "main-toys", "main-baby"]);
});

test("getMainCategoriesForBrand filters mains by selected brand", () => {
  assert.deepEqual(getMainCategoriesForBrand(categories, "").map((category) => category.id), []);
  assert.deepEqual(getMainCategoriesForBrand(categories, "velvet").map((category) => category.id), ["main-clothing", "main-toys"]);
  assert.deepEqual(getMainCategoriesForBrand(categories, "baby").map((category) => category.id), ["main-baby"]);
});

test("getSubcategoriesForMain returns only the children of the given Main Category", () => {
  assert.deepEqual(getSubcategoriesForMain(categories, "main-clothing").map((category) => category.id), ["sub-dresses", "sub-shirt"]);
  assert.deepEqual(getSubcategoriesForMain(categories, "main-toys").map((category) => category.id), ["sub-doll"]);
  assert.deepEqual(getSubcategoriesForMain(categories, ""), []);
});

test("resolveMainCategoryFor prefers explicit main and derives from subcategory parent", () => {
  assert.equal(resolveMainCategoryFor(categories, "main-toys", "sub-dresses"), "main-toys");
  assert.equal(resolveMainCategoryFor(categories, "", "sub-dresses"), "main-clothing");
  assert.equal(resolveMainCategoryFor(categories, "", "missing"), "");
});

test("validateProductHierarchySelection requires Brand → Main → Sub and rejects stale chains", () => {
  assert.equal(validateProductHierarchySelection({ brands, categories, brandId: "", mainCategoryId: "", subcategoryId: "" }).field, "brandId");
  assert.equal(validateProductHierarchySelection({ brands, categories, brandId: "velvet", mainCategoryId: "", subcategoryId: "" }).field, "mainCategoryId");
  assert.equal(validateProductHierarchySelection({ brands, categories, brandId: "velvet", mainCategoryId: "main-clothing", subcategoryId: "" }).field, "subcategoryId");
  assert.equal(validateProductHierarchySelection({ brands, categories, brandId: "baby", mainCategoryId: "main-clothing", subcategoryId: "sub-dresses" }).field, "mainCategoryId");
  assert.equal(validateProductHierarchySelection({ brands, categories, brandId: "velvet", mainCategoryId: "main-clothing", subcategoryId: "sub-doll" }).field, "subcategoryId");
  assert.equal(validateProductHierarchySelection({ brands, categories, brandId: "velvet", mainCategoryId: "main-clothing", subcategoryId: "sub-dresses" }).ok, true);
});

test("incomplete hierarchy detection does not invent relationships", () => {
  assert.equal(isCompleteProductHierarchy({ brandId: "velvet", mainCategoryId: "main-clothing", subcategoryId: "sub-dresses" }), true);
  assert.equal(isCompleteProductHierarchy({ brandId: "velvet", mainCategoryId: "main-clothing" }), false);
  assert.equal(isCompleteProductHierarchy({}), false);
});

test("ProductWizard renders required Brand/Main/Sub cascade and advanced options", () => {
  assert.match(dashboardSource, /name="brandId"[\s\S]*?onChange=\{changeBrand\}/);
  assert.match(dashboardSource, /name="mainCategoryId"[\s\S]*?onChange=\{changeMainCategory\}/);
  assert.match(dashboardSource, /name="subcategoryId"[\s\S]*?onChange=\{changeSubcategory\}/);
  assert.match(dashboardSource, /getMainCategoriesForBrand\(/);
  assert.match(dashboardSource, /getSubcategoriesForMain\(/);
  assert.match(dashboardSource, /validateProductHierarchySelection\(/);
  assert.match(dashboardSource, /product-form-classification/);
  assert.match(dashboardSource, /product-form-attributes/);
  assert.match(dashboardSource, /product-advanced-toggle/);
  assert.match(dashboardSource, /Advanced Settings|إعدادات متقدمة/);
  assert.match(dashboardSource, /Select a Brand first|اختر علامة تجارية أولاً/);
  assert.match(dashboardSource, /hierarchyIncomplete/);
  assert.match(dashboardSource, /readOnly/);
  assert.match(dashboardSource, /mainCategoryId: form\.mainCategoryId/);
  assert.match(dashboardSource, /subcategoryId: form\.subcategoryId/);
  assert.match(dashboardSource, /manufacturer: form\.manufacturer/);
  assert.match(dashboardSource, /primaryVariant/);
  assert.match(dashboardSource, /updateVariant\(primaryVariantIndex, "price"/);
  assert.match(dashboardSource, /updateVariant\(primaryVariantIndex, "sale_price"/);
  assert.match(dashboardSource, /PRODUCT_FILTER_FORM_GROUPS/);
  assert.match(dashboardSource, /toggleFilterAttribute\(/);
  assert.match(dashboardSource, /name=\{group\}/);
  assert.match(dashboardSource, /name="quickShop"/);
});

test("ProductWizard basic tab surfaces primary pricing before classification", () => {
  const basicBlock = dashboardSource.slice(
    dashboardSource.indexOf('{step === "basic" &&'),
    dashboardSource.indexOf('{step === "pricing" &&'),
  );
  const priceIdx = basicBlock.indexOf('t("productForm.price")');
  const saleIdx = basicBlock.indexOf('t("productForm.salePrice")');
  const classificationIdx = basicBlock.indexOf("product-form-classification");
  const attributesIdx = basicBlock.indexOf("product-form-attributes");
  const statusIdx = basicBlock.indexOf("hierarchyLabels.status");
  const advancedIdx = basicBlock.indexOf("product-advanced-toggle");
  assert.ok(priceIdx >= 0 && saleIdx > priceIdx);
  assert.ok(classificationIdx > saleIdx);
  assert.ok(attributesIdx > classificationIdx);
  assert.ok(statusIdx > attributesIdx);
  assert.ok(advancedIdx > statusIdx);
});

test("ProductWizard Attributes block is on basic and not inside Advanced Settings", () => {
  const basicBlock = dashboardSource.slice(
    dashboardSource.indexOf('{step === "basic" &&'),
    dashboardSource.indexOf('{step === "pricing" &&'),
  );
  const attributesBlock = basicBlock.slice(
    basicBlock.indexOf("product-form-attributes"),
    basicBlock.indexOf("hierarchyLabels.status"),
  );
  const advancedBody = basicBlock.slice(
    basicBlock.indexOf("product-advanced-body"),
    basicBlock.lastIndexOf("</div>"),
  );
  assert.match(attributesBlock, /PRODUCT_FILTER_FORM_GROUPS\.map/);
  assert.match(attributesBlock, /requiresCanonicalAgeSelection\(form\.age\)/);
  assert.doesNotMatch(advancedBody, /PRODUCT_FILTER_FORM_GROUPS\.map/);
});
