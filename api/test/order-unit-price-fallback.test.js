import assert from "node:assert/strict";
import test from "node:test";

import { priceRetailOrder, resolveRetailUnitPrice } from "../src/pricing/retailPricing.js";

test("unit: a valid positive variant price wins over the product price", () => {
  const resolved = resolveRetailUnitPrice({ price: 15 }, { price: 18 });
  assert.equal(resolved.basePrice, 18);
  assert.equal(resolved.unitPrice, 18);
});

test("unit: a zero variant price falls back to the positive product price", () => {
  const resolved = resolveRetailUnitPrice({ price: 55 }, { price: 0 });
  assert.equal(resolved.basePrice, 55);
  assert.equal(resolved.unitPrice, 55);
});

test("unit: an invalid variant price falls back to the positive product price", () => {
  for (const invalid of [null, undefined, "", -4, "abc", Number.NaN]) {
    const resolved = resolveRetailUnitPrice({ price: 40 }, { price: invalid });
    assert.equal(resolved.basePrice, 40, `variant price ${String(invalid)}`);
    assert.equal(resolved.unitPrice, 40, `variant price ${String(invalid)}`);
  }
});

test("unit: a missing variant resolves the product price", () => {
  assert.equal(resolveRetailUnitPrice({ price: 25 }, null).unitPrice, 25);
  assert.equal(resolveRetailUnitPrice({}, null).unitPrice, 0);
  assert.equal(resolveRetailUnitPrice({ price: 0 }, { price: 0 }).unitPrice, 0);
});

test("order line: the submitted client price never overrides the catalog price", () => {
  const priced = priceRetailOrder({
    items: [{
      productId: "velvet-src-104",
      variantId: "8df1e315-cbee-45ef-bc96-4df584200024",
      quantity: 5,
      price: 18,
    }],
    products: [{
      id: "velvet-src-104",
      price: 15,
      variants: [{ id: "8df1e315-cbee-45ef-bc96-4df584200024", price: 15 }],
    }],
    automaticDiscounts: [],
  });

  const [line] = priced.items;
  assert.equal(line.price, 15);
  assert.equal(line.basePrice, 15);
  assert.equal(line.lineTotal, 75);
  assert.equal(line.automaticDiscountAmount, 0);
  assert.equal(priced.merchandiseSubtotal, 75);
  assert.equal(priced.subtotalAfterAutomatic, 75);
  assert.equal(priced.automaticDiscountTotal, 0);
  assert.equal(priced.subtotal, 75);
});

test("order line: a zero variant price is never charged as 0 while the product price is valid", () => {
  const priced = priceRetailOrder({
    items: [{ productId: "p1", variantId: "v1", quantity: 3, price: 0 }],
    products: [{ id: "p1", price: 60, variants: [{ id: "v1", price: 0 }] }],
    automaticDiscounts: [],
  });

  assert.equal(priced.items[0].price, 60);
  assert.equal(priced.items[0].lineTotal, 180);
  assert.equal(priced.subtotal, 180);
});
