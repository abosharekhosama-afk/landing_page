import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  PRODUCT_FILTER_KEYS,
  normalizeCatalogHierarchyInput,
  validateCatalogHierarchy,
} from "../src/routes/catalogHierarchy.js";

const productsSource = fs.readFileSync(new URL("../src/routes/products.js", import.meta.url), "utf8");
const storefrontSource = fs.readFileSync(new URL("../src/storefront/publicContent.js", import.meta.url), "utf8");

const brands = [{ id: "velvet", slug: "velvet", isActive: true, name: "VELVET" }];
const categories = [
  { id: "main-clothing", slug: "clothing", parentId: null, brandId: "velvet", isActive: true, name: { en: "Clothing" } },
  { id: "sub-dresses", slug: "dresses", parentId: "main-clothing", isActive: true, name: { en: "Dresses" } },
  { id: "flat-category", slug: "flat", parentId: null, isActive: true, name: { en: "Flat" } },
  { id: "inactive", slug: "inactive", parentId: null, isActive: false, name: { en: "Inactive" } },
];

test("normalizeCatalogHierarchyInput trims strings, normalizes exact legacy filters, and coerces quickShop", () => {
  const out = normalizeCatalogHierarchyInput({
    mainCategoryId: " main ", subcategoryId: "", manufacturer: "  Acme  ", age: "0-12 months",
    gender: "Boys", quickShop: true,
  });
  assert.deepEqual(out, { mainCategoryId: "main", subcategoryId: null, manufacturer: "Acme", age: ["0-12m"], gender: ["boys"], quickShop: true });
  assert.throws(() => normalizeCatalogHierarchyInput({ quickShop: "yes" }), /quickShop must be a boolean/);
  assert.throws(() => normalizeCatalogHierarchyInput({ age: "1-3 years" }), /invalid value/);
  assert.throws(() => normalizeCatalogHierarchyInput({ age: "3-6" }), /invalid value/);
});

test("validateCatalogHierarchy accepts a valid Brand -> Main -> Subcategory product", () => {
  const result = validateCatalogHierarchy({
    brands,
    categories,
    product: {
      brandId: "velvet",
      mainCategoryId: "main-clothing",
      subcategoryId: "sub-dresses",
      manufacturer: "Acme",
      age: ["7-9y"],
      quickShop: true,
    },
  });
  assert.deepEqual(result, {
    brandId: "velvet",
    mainCategoryId: "main-clothing",
    subcategoryId: "sub-dresses",
    manufacturer: "Acme",
    age: ["7-9y"],
    gender: [],
    skill: [],
    occasion: [],
    material: [],
    productType: [],
    theme: [],
    collection: [],
    quickShop: true,
  });
});

test("validateCatalogHierarchy rejects using a Subcategory as a Main Category", () => {
  assert.throws(
    () => validateCatalogHierarchy({ brands, categories, product: { mainCategoryId: "sub-dresses" } }),
    (error) => error.statusCode === 400 && /Subcategory, not a Main Category/.test(error.message),
  );
});

test("validateCatalogHierarchy rejects a Subcategory that does not belong to the Main Category", () => {
  assert.throws(
    () => validateCatalogHierarchy({ brands, categories, product: { mainCategoryId: "main-clothing", subcategoryId: "flat-category" } }),
    /does not belong/,
  );
});

test("validateCatalogHierarchy rejects a Main Category that does not belong to the selected Brand", () => {
  const foreignBrands = [{ id: "other-brand", slug: "other", isActive: true, name: "Other" }];
  assert.throws(
    () => validateCatalogHierarchy({ brands: foreignBrands, categories, product: { brandId: "other-brand", mainCategoryId: "main-clothing" } }),
    /does not belong to the selected Brand/,
  );
  const result = validateCatalogHierarchy({ brands, categories, product: { brandId: "velvet", mainCategoryId: "main-clothing", subcategoryId: "sub-dresses" } });
  assert.equal(result.brandId, "velvet");
});

test("validateCatalogHierarchy rejects ambiguous legacy age values", () => {
  assert.throws(
    () => validateCatalogHierarchy({
      brands,
      categories,
      product: {
        brandId: "velvet",
        mainCategoryId: "main-clothing",
        subcategoryId: "sub-dresses",
        age: "1-3 years",
      },
    }),
    /invalid value/,
  );
});

test("validateCatalogHierarchy normalizes exact legacy filter values in its result", () => {
  const result = validateCatalogHierarchy({
    brands,
    categories,
    product: {
      brandId: "velvet",
      mainCategoryId: "main-clothing",
      subcategoryId: "sub-dresses",
      age: "0-12 months",
      gender: "Girls",
      skill: "Intermediate",
      occasion: "Everyday",
    },
  });
  assert.deepEqual(result.age, ["0-12m"]);
  assert.deepEqual(result.gender, ["girls"]);
  assert.deepEqual(result.skill, ["intermediate"]);
  assert.deepEqual(result.occasion, ["everyday"]);
});

test("validateCatalogHierarchy rejects unknown/inactive brand and category references", () => {
  assert.throws(
    () => validateCatalogHierarchy({ brands, categories, product: { brandId: "nope" } }),
    (error) => error.statusCode === 404 && /Brand not found/.test(error.message),
  );
  assert.throws(() => validateCatalogHierarchy({ brands, categories, product: { subcategoryId: "inactive" } }), /inactive/);
  assert.throws(
    () => validateCatalogHierarchy({ brands, categories, product: {}, requireMainCategory: true }),
    /Main Category is required/,
  );
});

test("requireFullHierarchy rejects missing Brand or incomplete Main/Sub chains", () => {
  assert.throws(
    () => validateCatalogHierarchy({ brands, categories, product: {}, requireFullHierarchy: true }),
    /Brand is required/,
  );
  assert.throws(
    () => validateCatalogHierarchy({ brands, categories, product: { brandId: "velvet" }, requireFullHierarchy: true }),
    /Main Category is required/,
  );
  assert.throws(
    () => validateCatalogHierarchy({
      brands,
      categories,
      product: { brandId: "velvet", mainCategoryId: "main-clothing" },
      requireFullHierarchy: true,
    }),
    /Subcategory is required/,
  );
  assert.throws(
    () => validateCatalogHierarchy({
      brands,
      categories,
      product: { brandId: "velvet", mainCategoryId: "main-clothing", subcategoryId: "flat-category" },
      requireFullHierarchy: true,
    }),
    /Selected category must be a Subcategory|does not belong/,
  );
  const result = validateCatalogHierarchy({
    brands,
    categories,
    product: { brandId: "velvet", mainCategoryId: "main-clothing", subcategoryId: "sub-dresses" },
    requireFullHierarchy: true,
  });
  assert.equal(result.subcategoryId, "sub-dresses");
});

test("requireFullHierarchy with allowBrandOnly accepts brand-only products", () => {
  const result = validateCatalogHierarchy({
    brands,
    categories,
    product: { brandId: "velvet" },
    requireFullHierarchy: true,
    allowBrandOnly: true,
  });
  assert.equal(result.brandId, "velvet");
  assert.equal(result.mainCategoryId, null);
  assert.equal(result.subcategoryId, null);
  assert.throws(
    () => validateCatalogHierarchy({
      brands,
      categories,
      product: { brandId: "velvet", mainCategoryId: "main-clothing" },
      requireFullHierarchy: true,
      allowBrandOnly: true,
    }),
    /Subcategory is required/,
  );
});

test("backward compatible: a lone legacy categoryId validates without a Main Category", () => {
  const result = validateCatalogHierarchy({ brands, categories, product: { categoryId: "flat-category" } });
  assert.equal(result.subcategoryId, "flat-category");
  assert.equal(result.mainCategoryId, null);
});

test("PRODUCT_FILTER_KEYS exposes the Kids Velvet filters", () => {
  assert.deepEqual([...PRODUCT_FILTER_KEYS], [
    "age", "gender", "skill", "occasion", "material", "productType", "theme", "collection", "quickShop",
  ]);
});

test("products route wires hierarchy normalization and validation into create/update", () => {
  assert.match(productsSource, /normalizeCatalogHierarchyInput\(req\.body\)/);
  assert.match(productsSource, /applyCatalogHierarchyAndFilters\(req\.companyId/);
  assert.match(productsSource, /requireFullHierarchy:\s*true/);
  assert.match(productsSource, /allowBrandOnly:\s*companyId\s*===\s*KIDS_VELVET_COMPANY_ID/);
  assert.match(productsSource, /KIDS_VELVET_COMPANY_ID\s*=\s*"kids-velvet"/);
  assert.match(productsSource, /requirePermission\("products\.create"\)/);
  assert.match(productsSource, /requirePermission\("products\.update"\)/);
  assert.match(productsSource, /category_id and brand_id are not accepted/);
});

test("storefront product serialization exposes hierarchy, manufacturer, and filters", () => {
  assert.match(storefrontSource, /mainCategoryId: product\.mainCategoryId/);
  assert.match(storefrontSource, /subcategoryId:/);
  assert.match(storefrontSource, /manufacturer: String\(product\.manufacturer/);
  assert.match(storefrontSource, /publicFilterAttribute\("age", product\.age\)/);
  for (const key of ["gender", "skill", "occasion", "material", "productType", "theme", "collection"]) {
    assert.match(storefrontSource, new RegExp(`publicFilterAttribute\\("${key}", product\\.${key}\\)`));
  }
  assert.match(storefrontSource, /quickShop: product\.quickShop === true/);
});
