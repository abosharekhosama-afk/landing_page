import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { reconcileProductVariantsWithClient } from "../src/data/postgresStore.js";

const productRoutes = fs.readFileSync(new URL("../src/routes/products.js", import.meta.url), "utf8");

function variantClient(initialRows = []) {
  const rows = new Map(initialRows.map((row) => [row.id, { ...row }]));
  const calls = [];
  return {
    calls,
    rows,
    async query(sql, params = []) {
      const normalized = sql.replace(/\s+/g, " ").trim().toLowerCase();
      calls.push({ sql: normalized, params });
      if (normalized.startsWith("select id from public.product_variants")) {
        return { rows: [...rows.values()].map(({ id }) => ({ id })) };
      }
      if (/^insert into public\."?product_variants"?/.test(normalized)) {
        const id = params[0];
        if (rows.has(id)) Object.assign(new Error("duplicate"), { code: "23505", constraint: "product_variants_pkey" });
        rows.set(id, { id, company_id: params[1], product_id: params[2] });
        return { rows: [{ id }] };
      }
      if (/^update public\."?product_variants"?/.test(normalized)) {
        assert.equal(rows.has(params[2]), true);
        return { rows: [] };
      }
      if (normalized.startsWith("delete from public.product_variants")) {
        const retained = new Set(params[2] || []);
        for (const id of rows.keys()) if (!retained.has(id)) rows.delete(id);
        return { rows: [] };
      }
      throw new Error(`Unexpected SQL: ${normalized}`);
    },
  };
}

const product = (variants) => ({ id: "qa-product", variants });
const variant = (patch = {}) => ({ color_name: "Default", size: "500ml", price: 10, stock: 5, ...patch });

test("create ignores a client temporary variant id and inserts one server-safe id", async () => {
  const client = variantClient();
  const saved = await reconcileProductVariantsWithClient(client, "icare", product([variant({ id: "product-variant-0" })]), { isCreate: true });
  assert.equal(saved.variants.length, 1);
  assert.notEqual(saved.variants[0].id, "product-variant-0");
  assert.equal(client.rows.size, 1);
});

test("repeated save updates an owned existing variant without reinserting it", async () => {
  const client = variantClient([{ id: "existing-variant", company_id: "icare", product_id: "qa-product" }]);
  const saved = await reconcileProductVariantsWithClient(client, "icare", product([variant({ id: "existing-variant", stock: 6 })]));
  assert.equal(saved.variants[0].id, "existing-variant");
  assert.equal(client.calls.filter(({ sql }) => /^insert into public\."?product_variants"?/.test(sql)).length, 0);
  assert.equal(client.calls.filter(({ sql }) => /^update public\."?product_variants"?/.test(sql)).length, 1);
});

test("adding a second new variant preserves the existing id and allocates a unique id", async () => {
  const client = variantClient([{ id: "existing-variant", company_id: "icare", product_id: "qa-product" }]);
  const saved = await reconcileProductVariantsWithClient(client, "icare", product([
    variant({ id: "existing-variant" }),
    variant({ id: "product-variant-1", size: "1L" }),
  ]));
  assert.equal(saved.variants[0].id, "existing-variant");
  assert.notEqual(saved.variants[1].id, "product-variant-1");
  assert.notEqual(saved.variants[1].id, saved.variants[0].id);
  assert.equal(client.rows.size, 2);
});

test("product persistence errors are logged diagnostically but returned without raw constraints", () => {
  assert.match(productRoutes, /constraint: error\?\.constraint/);
  assert.match(productRoutes, /PRODUCT_VARIANT_CONFLICT/);
  assert.match(productRoutes, /PRODUCT_SAVE_FAILED/);
});
