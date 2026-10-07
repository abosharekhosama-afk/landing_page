import assert from "node:assert/strict";
import test from "node:test";
import { parseRequiredStock, preserveLegacySingleVariantStock } from "../src/utils/productStock.js";

test("legacy single variant hydrates from authoritative catalog stock", () => {
  const result = preserveLegacySingleVariantStock({ stockQty: 24 }, [{ id: "variant-1", stock: 0 }]);
  assert.equal(result[0].stock, 24);
});

test("intentional zero remains valid after catalog stock is zero", () => {
  const result = preserveLegacySingleVariantStock({ stockQty: 0 }, [{ id: "variant-1", stock: 0 }]);
  assert.equal(result[0].stock, 0);
  assert.equal(parseRequiredStock("0"), 0);
});

test("empty form stock is rejected", () => {
  assert.throws(() => parseRequiredStock(""), /cannot be empty/);
});
