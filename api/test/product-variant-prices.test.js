import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

process.env.NODE_ENV = "test";
const {
  normalizeProduct,
  normalizeVariants,
  positivePriceOrNull,
  resolveVariantPrice,
  sizesFromVariants,
} = await import("../src/routes/products.js");

const productsSource = fs.readFileSync(new URL("../src/routes/products.js", import.meta.url), "utf8");
const postgresStoreSource = fs.readFileSync(new URL("../src/data/postgresStore.js", import.meta.url), "utf8");
const dashboardSource = fs.readFileSync(
  new URL("../../cpanel/src/pages/AdminDashboardPage.jsx", import.meta.url),
  "utf8",
);
const variantsFormSource = fs.readFileSync(
  new URL("../../cpanel/src/utils/productVariantsForm.js", import.meta.url),
  "utf8",
);

test("positivePriceOrNull only accepts finite positive numbers", () => {
  assert.equal(positivePriceOrNull(18), 18);
  assert.equal(positivePriceOrNull("12.5"), 12.5);
  assert.equal(positivePriceOrNull(0), null);
  assert.equal(positivePriceOrNull(-4), null);
  assert.equal(positivePriceOrNull(""), null);
  assert.equal(positivePriceOrNull(null), null);
  assert.equal(positivePriceOrNull(undefined), null);
  assert.equal(positivePriceOrNull("abc"), null);
});

test("resolveVariantPrice never returns 0 while a valid product price exists", () => {
  assert.equal(resolveVariantPrice("", 55), 55);
  assert.equal(resolveVariantPrice(0, 55), 55);
  assert.equal(resolveVariantPrice(null, 55), 55);
  assert.equal(resolveVariantPrice(undefined, 55), 55);
  assert.equal(resolveVariantPrice("18", 55), 18);
  assert.equal(resolveVariantPrice(0, 0), 0);
  assert.equal(resolveVariantPrice("", "40"), 40);
});

test("normalizeVariants replaces an empty/zero variant price with the product price", () => {
  const variants = normalizeVariants({
    id: "velvet-1",
    price: 55,
    variants: [
      { color_name: "Default", size: "500ml", price: "", stock: 24 },
      { color_name: "Blue", size: "500ml", price: 0, stock: 5 },
    ],
  });
  assert.equal(variants[0].price, 55);
  assert.equal(variants[1].price, 55);
});

test("normalizeVariants keeps a legitimate positive variant price", () => {
  const variants = normalizeVariants({
    id: "velvet-2",
    price: 55,
    variants: [{ color_name: "Default", size: "500ml", price: 18, stock: 5 }],
  });
  assert.equal(variants[0].price, 18);
});

test("normalizeVariants sizes fallback resolves an empty size price from the product price", () => {
  const variants = normalizeVariants({
    id: "velvet-3",
    price: 40,
    sizes: [{ size: "500ml", price: "" }],
    stockQty: 24,
  });
  assert.equal(variants.length, 1);
  assert.equal(variants[0].price, 40);
});

test("sizesFromVariants ignores non-positive prices when picking the minimum", () => {
  assert.deepEqual(
    sizesFromVariants([
      { color_name: "Default", size: "500ml", price: 0 },
      { color_name: "Blue", size: "500ml", price: 30 },
    ], []),
    [{ size: "500ml", price: 30 }],
  );
  assert.deepEqual(sizesFromVariants([{ color_name: "Default", size: "500ml", price: 0 }], []), []);
  assert.deepEqual(sizesFromVariants([], [{ size: "500ml", price: 25 }]), [{ size: "500ml", price: 25 }]);
});

test("normalizeProduct exposes positive variant prices in sizes", () => {
  const product = normalizeProduct({
    id: "velvet-4",
    price: 55,
    variants: [{ color_name: "Default", size: "500ml", price: "", stock: 24 }],
  });
  assert.equal(product.variants[0].price, 55);
  assert.deepEqual(product.sizes, [{ size: "500ml", price: 55 }]);
});

test("persistence keeps the product price as the variant price fallback", () => {
  assert.match(postgresStoreSource, /price: Number\(variant\.price \|\| product\.price \|\| 0\)/);
});

test("the product route resolves prices through resolveVariantPrice instead of Number(price || 0)", () => {
  assert.match(productsSource, /price: resolveVariantPrice\(variant\.price, product\.price\)/);
  assert.match(productsSource, /price: resolveVariantPrice\(sizeOption\.price, product\.price\)/);
  assert.doesNotMatch(productsSource, /price: Number\(variant\.price \|\| 0\)/);
});

test("the CPanel form never converts an empty price into 0", () => {
  assert.match(variantsFormSource, /price: positivePriceOrNull\(variant\.price\) \?\? positivePriceOrNull\(product\.price\) \?\? ""/);
  assert.doesNotMatch(variantsFormSource, /price: Number\(variant\.price \?\? product\.price \?\? 0\)/);
  assert.doesNotMatch(variantsFormSource, /price: Number\(variant\.price \|\| 0\)/);
  assert.match(variantsFormSource, /if \(variantPrice === null\) delete base\.price;/);
  assert.match(variantsFormSource, /const price = positivePriceOrNull\(variant\.price\);\s*\n\s*if \(price === null\) return;/);
  assert.match(dashboardSource, /return positivePriceOrNull\(product\.price\) \?\? 0;/);
});
