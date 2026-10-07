import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  createCommerceVariant,
  createProductFromForm,
  normalizeProductVariantsForForm,
} from "../src/utils/productVariantsForm.js";

const dashboard = fs.readFileSync(new URL("../src/pages/AdminDashboardPage.jsx", import.meta.url), "utf8");
const util = fs.readFileSync(new URL("../src/utils/productVariantsForm.js", import.meta.url), "utf8");

test("empty product / no variants → normalize returns [] (no 18 / 500ml / #1db7d8 / stock 24)", () => {
  assert.deepEqual(normalizeProductVariantsForForm({}), []);
  assert.deepEqual(normalizeProductVariantsForForm({ variants: [], sizes: [] }), []);
  assert.deepEqual(normalizeProductVariantsForForm({ variants: [], sizes: [], price: 25, stockQty: 4 }), []);
});

test("createProductFromForm with empty variants → variants: [], sizes do not invent 500ml", () => {
  const payload = createProductFromForm({
    nameEn: "Velvet test",
    price: 25,
    size: "",
    variants: [],
    stockQty: 0,
  });
  assert.deepEqual(payload.variants, []);
  assert.deepEqual(payload.sizes, [{ size: "", price: 25 }]);
  assert.ok(!JSON.stringify(payload).includes("500ml"));
});

test("explicit commerce variant builder uses product.price and size: ''", () => {
  const variant = createCommerceVariant({ price: 42, image: "img.jpg" });
  assert.equal(variant.price, 42);
  assert.equal(variant.size, "");
  assert.equal(variant.color_value, "");
  assert.notEqual(variant.color_value, "#1db7d8");
});

test("manually entered size (كرتونة) and price preserved", () => {
  const payload = createProductFromForm({
    nameEn: "Velvet test",
    price: 10,
    size: "",
    variants: [{ color_name: "Default", size: "كرتونة", price: 55, stock: 3 }],
  });
  assert.equal(payload.variants.length, 1);
  assert.equal(payload.variants[0].size, "كرتونة");
  assert.equal(payload.variants[0].price, 55);
  assert.deepEqual(payload.sizes, [{ size: "كرتونة", price: 55 }]);
});

test("empty-size variant with a real price is kept", () => {
  const payload = createProductFromForm({
    nameEn: "Velvet test",
    price: 10,
    size: "",
    variants: [{ color_name: "", size: "", price: 33, stock: 2 }],
  });
  assert.equal(payload.variants.length, 1);
  assert.equal(payload.variants[0].size, "");
  assert.equal(payload.variants[0].price, 33);
});

test("source must not contain fabricated defaults", () => {
  assert.doesNotMatch(dashboard, /defaultPrice: "18"/);
  assert.doesNotMatch(dashboard, /sizesText: "500ml/);
  assert.doesNotMatch(dashboard, /sizesText: "1L/);
  assert.doesNotMatch(dashboard, /sizesText: "1\.5L/);
  assert.doesNotMatch(util, /price: 18/);
  assert.doesNotMatch(util, /stock: 24/);
  assert.doesNotMatch(util, /#1db7d8/);
  assert.doesNotMatch(util, /500ml/);
});