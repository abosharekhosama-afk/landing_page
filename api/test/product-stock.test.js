import assert from "node:assert/strict";
import test from "node:test";
import { normalizeStockValue, preserveOmittedVariantStock } from "../src/products/productStock.js";

test("omitted variant stock preserves the existing value", () => {
  assert.deepEqual(
    preserveOmittedVariantStock({ id: "variant-1", stock: 24 }, { id: "variant-1", price: 10 }),
    { id: "variant-1", price: 10, stock: 24 },
  );
});

test("intentional zero stock is retained", () => {
  assert.deepEqual(
    preserveOmittedVariantStock({ stock: 24 }, { stock: 0 }),
    { stock: 0 },
  );
  assert.equal(normalizeStockValue(0, { fallback: 24 }), 0);
});

test("empty stock is rejected instead of becoming zero", () => {
  assert.throws(() => normalizeStockValue("", { fallback: 24 }), /zero or a positive number/);
  assert.equal(normalizeStockValue(undefined, { fallback: 24 }), 24);
});
