import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { buildProductPayload } from "../src/catalog/velvetWorkbookCatalog.js";

const productRoutes = fs.readFileSync(new URL("../src/routes/products.js", import.meta.url), "utf8");
const postgresStore = fs.readFileSync(new URL("../src/data/postgresStore.js", import.meta.url), "utf8");
const store = fs.readFileSync(new URL("../src/data/store.js", import.meta.url), "utf8");
const supabaseStore = fs.readFileSync(new URL("../src/data/supabaseStore.js", import.meta.url), "utf8");

test("product routes and stores never fabricate a volume fallback (500ml / 1L / 1.5L)", () => {
  for (const source of [productRoutes, postgresStore, store, supabaseStore]) {
    assert.doesNotMatch(source, /\|\|\s*["']500ml["']/);
    assert.doesNotMatch(source, /\|\|\s*["']1L["']/);
    assert.doesNotMatch(source, /\|\|\s*["']1\.5L["']/);
  }
});

test("buildProductPayload still returns empty variants and sizes", () => {
  const payload = buildProductPayload(
    { sourceProductId: "564", title: "Sensory set", minPrice: 25 },
    {
      brandId: "kv-brand-baby",
      categoryId: "kv-main-baby-dev",
      mainCategoryId: "kv-main-baby-dev",
      subcategoryId: "kv-sub-sensory",
      velvetPath: null,
    },
  );
  assert.deepEqual(payload.variants, []);
  assert.deepEqual(payload.sizes, []);
  assert.equal(payload.price, 25);
});