import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { hashPassword } from "../src/auth/passwords.js";
import { applyInventoryUpdate, inventoryProduct, normalizeInventoryTimestamp } from "../src/products/inventory.js";
import { serializePublicProduct } from "../src/storefront/publicContent.js";

const variantProduct = {
  id: "play-1",
  company_id: "kids-velvet",
  name: { en: "Toy" },
  variants: [
    { id: "red", stock: 3, size: "Small" },
    { id: "blue", stock: 7, size: "Large" },
  ],
};

test("variant inventory is canonical and updates persist without changing other variants", () => {
  const updated = applyInventoryUpdate(variantProduct, { variants: [{ id: "red", stock: 0 }] });
  assert.equal(updated.variants[0].stock, 0);
  assert.equal(updated.variants[1].stock, 7);
  assert.equal(updated.stockQty, 7);
  assert.equal(inventoryProduct(updated).stock, 7);
});

test("product stock is used when no variants exist", () => {
  const updated = applyInventoryUpdate({ id: "plain", stockQty: 4 }, { stock: 9 });
  assert.equal(updated.stockQty, 9);
});

test("inventory timestamps preserve valid values and normalize missing or malformed values", () => {
  const valid = "2026-08-16T08:23:08.149Z";
  assert.equal(normalizeInventoryTimestamp(valid), valid);
  assert.equal(normalizeInventoryTimestamp(null), null);
  assert.equal(normalizeInventoryTimestamp(""), null);
  assert.equal(normalizeInventoryTimestamp({}), null);
  assert.equal(inventoryProduct({ id: "bad-date", updatedAt: {} }).updatedAt, null);
});

test("negative and unknown variant stock updates are rejected", () => {
  assert.throws(() => applyInventoryUpdate(variantProduct, { variants: [{ id: "red", stock: -1 }] }), /positive number/);
  assert.throws(() => applyInventoryUpdate(variantProduct, { variants: [{ id: "other", stock: 2 }] }), /Unknown product variant/);
});

test("public product contract exposes aggregate stock and variant stock", () => {
  const result = serializePublicProduct(variantProduct);
  assert.equal(result.stock, 10);
  assert.deepEqual(result.variants.map((variant) => variant.stock), [3, 7]);
});

test("inventory route derives tenant from req.companyId and never accepts payload company scope", () => {
  const source = fs.readFileSync(new URL("../src/routes/inventory.js", import.meta.url), "utf8");
  assert.match(source, /findByCompany\(req\.companyId, req\.params\.id\)/);
  assert.match(source, /saveProductWithTenantCatalogLock\(req\.companyId, updated\)/);
  assert.doesNotMatch(source, /req\.body\.companyId/);
});

test("authenticated inventory API persists variant stock and rejects negative or cross-tenant updates", async (t) => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "inventory-api-"));
  const password = "Inventory-test-123!";
  const passwordHash = await hashPassword(password);
  const company = (id) => ({ id, slug: id, name: id, status: "active", settings: { language: "en", currency: "USD" } });
  const user = (id, companyId) => ({ id, email: `${id}@test.local`, password: passwordHash, role: "company_admin", company_id: companyId, permissions: [], isActive: true });
  fs.writeFileSync(path.join(dataDir, "store.json"), JSON.stringify({
    version: 2,
    companies: [company("kids-velvet"), company("icare")],
    users: [user("velvet-admin", "kids-velvet"), user("icare-admin", "icare")],
    memberships: [
      { id: "kv-membership", companyId: "kids-velvet", userId: "velvet-admin", role: "company_admin", status: "active", permissions: [] },
      { id: "icare-membership", companyId: "icare", userId: "icare-admin", role: "company_admin", status: "active", permissions: [] },
    ],
    products: [variantProduct, { ...variantProduct, id: "icare-product", company_id: "icare" }],
  }));
  process.env.DATA_STORE_DIR = dataDir;
  process.env.DATABASE_URL = "";
  process.env.POSTGRES_URL = "";
  process.env.NODE_ENV = "test";
  process.env.JWT_SECRET = "inventory-api-test-secret";
  const { app } = await import(`../src/server.js?inventory=${Date.now()}`);
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => server.close());
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const request = async (url, { token, body, method = body ? "POST" : "GET" } = {}) => {
    const response = await fetch(`${base}${url}`, { method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { "Content-Type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
    return { status: response.status, body: await response.json().catch(() => null) };
  };
  const login = async (email) => (await request("/auth/login", { body: { email, password } })).body.token;
  const velvetToken = await login("velvet-admin@test.local");
  const icareToken = await login("icare-admin@test.local");
  const saved = await request("/admin/inventory/play-1", { token: velvetToken, method: "PATCH", body: { variants: [{ id: "red", stock: 1 }] } });
  assert.equal(saved.status, 200);
  assert.equal(saved.body.variants.find((variant) => variant.id === "red").stock, 1);
  assert.equal((await request("/admin/inventory/play-1", { token: velvetToken, method: "PATCH", body: { variants: [{ id: "red", stock: -1 }] } })).status, 400);
  assert.ok([403, 404].includes((await request("/admin/inventory/play-1", { token: icareToken, method: "PATCH", body: { variants: [{ id: "red", stock: 2 }] } })).status));
});
