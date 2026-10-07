import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  COSMETICS_MEDIA_FIELD_KEYS,
  COSMETICS_PRODUCT_FIELD_KEYS,
  defaultProductSchema,
  isProductSchemaFieldEnabled,
  resolveDefaultProductSchema,
  sharedCatalogProductSchema,
} from "../src/productSchema/schema.js";
import {
  deriveProductOptionsFromVariants,
  serializePublicBrand,
  serializePublicProduct,
} from "../src/storefront/publicContent.js";

const cpanel = fs.readFileSync(new URL("../../cpanel/src/pages/AdminDashboardPage.jsx", import.meta.url), "utf8");
const migration = fs.readFileSync(new URL("../supabase/migrations/021_brand_header_image.sql", import.meta.url), "utf8");
const brandsRoute = fs.readFileSync(new URL("../src/routes/brands.js", import.meta.url), "utf8");

test("non-default tenants receive shared catalog schema without cosmetics fields", () => {
  const velvet = resolveDefaultProductSchema("kids-velvet");
  const shared = sharedCatalogProductSchema();
  assert.deepEqual(
    velvet.mediaFields.map((entry) => entry.key),
    shared.mediaFields.map((entry) => entry.key),
  );
  for (const key of COSMETICS_MEDIA_FIELD_KEYS) {
    assert.equal(isProductSchemaFieldEnabled(velvet, key), false);
  }
  for (const key of COSMETICS_PRODUCT_FIELD_KEYS) {
    assert.equal(isProductSchemaFieldEnabled(velvet, key), false);
  }
  assert.ok(isProductSchemaFieldEnabled(velvet, "image"));
  assert.ok(isProductSchemaFieldEnabled(velvet, "nameEn"));
});

test("default company keeps cosmetics product schema fields", () => {
  const eb = resolveDefaultProductSchema("eb-chemical");
  const cosmetics = defaultProductSchema();
  assert.deepEqual(
    eb.mediaFields.map((entry) => entry.key),
    cosmetics.mediaFields.map((entry) => entry.key),
  );
  for (const key of ["dsiHowItWorks1", "dsiSafeToUse", "dsiPracticalBanner", "dsiFaq", "howToUse", "ingredients"]) {
    assert.equal(isProductSchemaFieldEnabled(eb, key), true);
  }
});

test("CPanel ProductWizard gates cosmetics fields by tenant product schema", () => {
  assert.match(cpanel, /fetchCompanyProductSchema/);
  assert.match(cpanel, /showSchemaDetailMedia/);
  assert.match(cpanel, /showSchemaDetailFields/);
  assert.match(cpanel, /schemaDetailMediaFields/);
  assert.doesNotMatch(cpanel, /display\s*:\s*none/);
});

test("brand page header image is independent of hero poster", () => {
  assert.match(migration, /header_image/);
  assert.match(brandsRoute, /headerImage/);
  assert.match(cpanel, /Brand Page Header Image/);
  assert.match(cpanel, /صورة هيدر صفحة البراند/);

  const brand = serializePublicBrand({
    id: "velvet",
    slug: "velvet",
    name: { en: "VELVET", ar: "VELVET" },
    logoUrl: "https://cdn.example/logo.png",
    heroPoster: "https://cdn.example/poster.jpg",
    headerImage: "https://cdn.example/header.jpg",
  });
  assert.equal(brand.heroPoster, "https://cdn.example/poster.jpg");
  assert.equal(brand.headerImage, "https://cdn.example/header.jpg");

  const missing = serializePublicBrand({ id: "x", slug: "x", name: "X" });
  assert.equal(missing.headerImage, "");
});

test("public variants expose image and derive color option images from variants", () => {
  const product = serializePublicProduct({
    id: "p1",
    slug: "toy",
    name: { en: "Toy", ar: "لعبة" },
    variants: [
      { id: "v1", colorName: "Blue", colorValue: "#00f", size: "S", price: 10, stock: 2, image_url: "https://cdn.example/blue.jpg" },
      { id: "v2", colorName: "Blue", colorValue: "#00f", size: "M", price: 10, stock: 1, image_url: "https://cdn.example/blue.jpg" },
      { id: "v3", colorName: "Red", colorValue: "#f00", size: "L", price: 12, stock: 0, image_url: "https://cdn.example/red.jpg" },
    ],
  });

  assert.equal(product.variants.length, 3);
  assert.equal(product.variants[0].image, "https://cdn.example/blue.jpg");
  assert.equal(product.variants[0].size.en, "S");
  assert.equal(product.variants[0].colorName.en, "Blue");

  const colorOption = product.options.find((option) => option.name.en === "Color");
  const sizeOption = product.options.find((option) => option.name.en === "Size");
  assert.ok(colorOption);
  assert.ok(sizeOption);
  assert.equal(colorOption.values.length, 2);
  assert.equal(colorOption.values.find((value) => value.label.en === "Blue").image, "https://cdn.example/blue.jpg");
  assert.equal(colorOption.values.find((value) => value.label.en === "Red").image, "https://cdn.example/red.jpg");
  assert.deepEqual(sizeOption.values.map((value) => value.label.en).sort(), ["L", "M", "S"]);
});

test("deriving options does not invent unavailable color-size combinations", () => {
  const options = deriveProductOptionsFromVariants([
    { colorName: "Blue", colorValue: "#00f", size: "S", image: "https://cdn.example/blue.jpg" },
    { colorName: "Red", colorValue: "#f00", size: "L", image: "https://cdn.example/red.jpg" },
  ]);
  const colors = options.find((option) => option.name.en === "Color").values.map((value) => value.label.en);
  const sizes = options.find((option) => option.name.en === "Size").values.map((value) => value.label.en);
  assert.deepEqual(colors.sort(), ["Blue", "Red"]);
  assert.deepEqual(sizes.sort(), ["L", "S"]);
});
