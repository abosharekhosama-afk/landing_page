import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { hashPassword } from "../src/auth/passwords.js";

const now = "2026-09-21T12:00:00.000Z";
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "inventory-valuation-route-"));
const password = "Valuation-route-123!";
const passwordHash = await hashPassword(password);
const company = (id, settings = {}) => ({
  id, slug: id, name: id, status: "active",
  settings: { language: "en", currency: "ILS", ...settings },
});
const user = (id, companyId, role = "company_admin", permissions = []) => ({
  id, email: `${id}@test.local`, password: passwordHash, role,
  company_id: companyId, permissions, isActive: true, createdAt: now, updatedAt: now,
});
const productBase = {
  brandId: "val-brand", categoryId: "val-sub", mainCategoryId: "val-main",
  subcategoryId: "val-sub", isActive: true, visible: true, createdAt: now, updatedAt: now,
};
fs.writeFileSync(path.join(dataDir, "store.json"), JSON.stringify({
  version: 2,
  companies: [
    company("valco", { costPriceEnabled: true }),
    company("otherco", { costPriceEnabled: true }),
    company("nocost", { costPriceEnabled: false }),
  ],
  users: [
    user("val-admin", "valco"),
    user("val-plain", "valco", "employee", ["inventory.view", "products.view"]),
    user("val-cost", "valco", "employee", ["inventory.view", "products.view", "products.cost_price.manage"]),
    user("other-admin", "otherco"),
    user("nocost-admin", "nocost"),
  ],
  memberships: [
    { id: "m1", companyId: "valco", userId: "val-admin", role: "company_admin", status: "active", permissions: [], createdAt: now, updatedAt: now },
    { id: "m2", companyId: "valco", userId: "val-plain", role: "employee", status: "active", permissions: ["inventory.view", "products.view"], createdAt: now, updatedAt: now },
    { id: "m3", companyId: "valco", userId: "val-cost", role: "employee", status: "active", permissions: ["inventory.view", "products.view", "products.cost_price.manage"], createdAt: now, updatedAt: now },
    { id: "m4", companyId: "otherco", userId: "other-admin", role: "company_admin", status: "active", permissions: [], createdAt: now, updatedAt: now },
    { id: "m5", companyId: "nocost", userId: "nocost-admin", role: "company_admin", status: "active", permissions: [], createdAt: now, updatedAt: now },
  ],
  brands: [
    { id: "val-brand", slug: "val-brand", name: { en: "Val" }, company_id: "valco", isActive: true },
    { id: "other-brand", slug: "other-brand", name: { en: "Other" }, company_id: "otherco", isActive: true },
  ],
  categories: [
    { id: "val-main", slug: "main", name: { en: "Main" }, parentId: null, brandId: "val-brand", company_id: "valco", isActive: true },
    { id: "val-sub", slug: "sub", name: { en: "Sub" }, parentId: "val-main", brandId: null, company_id: "valco", isActive: true },
    { id: "other-main", slug: "main", name: { en: "Main" }, parentId: null, brandId: "other-brand", company_id: "otherco", isActive: true },
  ],
  products: [
    { ...productBase, id: "val-plain", slug: "val-plain", sku: "PLAIN-1", name: { en: "Plain" }, company_id: "valco", stockQty: 4, price: 15, costPrice: 10, variants: [{ id: "plain-v", color_name: "Default", size: "M", price: 15, stock: 4, costPrice: 10 }] },
    { ...productBase, id: "val-mixed", slug: "val-mixed", sku: "MIXED-1", name: { en: "Mixed" }, company_id: "valco", stockQty: 5, variants: [{ id: "mix-a", color_name: "Red", size: "S", price: 20, stock: 3, costPrice: 5, sku: "MIX-A" }, { id: "mix-b", color_name: "Blue", size: "M", price: 30, stock: 2, sku: "MIX-B" }] },
    { ...productBase, id: "other-item", slug: "other-item", sku: "OTHER-1", name: { en: "Other" }, company_id: "otherco", brandId: "other-brand", categoryId: "other-main", mainCategoryId: "other-main", subcategoryId: "other-main", stockQty: 9, price: 9, costPrice: 1, variants: [{ id: "other-v", color_name: "Default", size: "L", price: 9, stock: 9, costPrice: 1 }] },
    { ...productBase, id: "val-trashed", slug: "val-trashed", sku: "TRASH-1", name: { en: "Trashed" }, company_id: "valco", stockQty: 7, price: 10, costPrice: 2, deletedAt: now, variants: [{ id: "trash-v", color_name: "Default", size: "M", price: 10, stock: 7, costPrice: 2 }] },
  ],
  orders: [],
}, null, 2));

process.env.DATA_STORE_DIR = dataDir;
process.env.DATABASE_URL = "";
process.env.POSTGRES_URL = "";
process.env.SUPABASE_URL = "";
process.env.SUPABASE_SERVICE_ROLE_KEY = "";
process.env.JWT_SECRET = "inventory-valuation-route-secret";
process.env.NODE_ENV = "test";
process.env.ALLOW_LOCAL_CATALOG_STORAGE = "true";


const { app } = await import(`../src/server.js?valuation-route=${Date.now()}`);
const server = app.listen(0, "127.0.0.1");
await new Promise((resolve) => server.once("listening", resolve));
test.after(() => { server.close(); });
const base = `http://127.0.0.1:${server.address().port}/api`;

async function request(url, { token } = {}) {
  const response = await fetch(`${base}${url}`, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  return { status: response.status, body: await response.json().catch(() => null) };
}

async function login(email) {
  const response = await fetch(`${base}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const body = await response.json();
  assert.equal(response.status, 200, `login failed for ${email}: ${JSON.stringify(body)}`);
  return body.token;
}

test("valuation route requires tenant auth and never accepts payload company scope", () => {
  const source = fs.readFileSync(new URL("../src/routes/inventory.js", import.meta.url), "utf8");
  assert.match(source, /router\.get\("\/valuation"/);
  assert.match(source, /findByCompany\(req\.companyId, req\.params\.id\)/);
  assert.doesNotMatch(source, /req\.body\.companyId/);
});

test("valuation isolates tenants, aggregates honestly, and filters cost status", async () => {
  const admin = await login("val-admin@test.local");
  const full = await request("/admin/inventory/valuation", { token: admin });
  assert.equal(full.status, 200, JSON.stringify(full.body));
  assert.equal(full.body.summary.totalQuantity, 9);
  assert.equal(full.body.summary.productsWithStock, 2);
  assert.equal(full.body.summary.costValue, 55);
  assert.equal(full.body.summary.retailValue, 180);
  // Plain margin 20 + mix-a margin 45; mix-b missing cost excluded from margin.
  assert.equal(full.body.summary.potentialMargin, 65);
  assert.equal(full.body.summary.missingCostCount, 1);
  assert.equal(full.body.summary.valuationComplete, false);
  assert.equal(full.body.summary.costVisible, true);
  assert.equal(full.body.summary.currency, "ILS");
  assert.equal(full.body.items.length, 3);
  assert.ok(!full.body.items.some((row) => row.productId === "val-trashed"));
  assert.ok(!full.body.items.some((row) => row.productId === "other-item"));
  const hasCost = await request("/admin/inventory/valuation?costStatus=HAS_COST", { token: admin });
  assert.equal(hasCost.body.items.length, 2);
  const missing = await request("/admin/inventory/valuation?costStatus=MISSING_COST", { token: admin });
  assert.equal(missing.body.items.length, 1);
  assert.equal(missing.body.items[0].variantId, "mix-b");
  const search = await request("/admin/inventory/valuation?q=MIX-A", { token: admin });
  assert.ok(search.body.items.some((row) => row.sku === "MIX-A"));
  const other = await login("other-admin@test.local");
  const otherView = await request("/admin/inventory/valuation", { token: other });
  assert.ok(otherView.body.items.every((row) => row.productId === "other-item"));
  assert.equal((await request("/admin/inventory/valuation")).status, 401);
});

test("valuation masks every cost field without permission or company setting", async () => {
  const plain = await login("val-plain@test.local");
  const masked = await request("/admin/inventory/valuation", { token: plain });
  assert.equal(masked.status, 200, JSON.stringify(masked.body));
  assert.equal(masked.body.summary.costVisible, false);
  assert.equal(masked.body.summary.costValue, null);
  assert.equal(masked.body.summary.potentialMargin, null);
  assert.equal(masked.body.summary.missingCostCount, null);
  assert.equal(masked.body.summary.retailValue, 180);
  assert.ok(masked.body.items.every((row) => row.costPerUnit === null && row.costValue === null && row.potentialMargin === null && row.costStatus === null));
  const costUser = await login("val-cost@test.local");
  const visible = await request("/admin/inventory/valuation", { token: costUser });
  assert.equal(visible.body.summary.costVisible, true);
  assert.equal(visible.body.summary.costValue, 55);
  const nocost = await login("nocost-admin@test.local");
  const disabled = await request("/admin/inventory/valuation", { token: nocost });
  assert.equal(disabled.body.summary.costVisible, false);
  assert.equal(disabled.body.summary.costValue, null);
});
