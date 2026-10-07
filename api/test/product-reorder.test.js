import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { hashPassword } from "../src/auth/passwords.js";
import { buildReorderPatches, parseReorderProductIds } from "../src/products/reorderProducts.js";

test("parseReorderProductIds accepts ordered unique string ids", () => {
  assert.deepEqual(parseReorderProductIds({ productIds: ["a", "b", "c"] }), ["a", "b", "c"]);
});

test("parseReorderProductIds rejects malformed payloads", () => {
  for (const body of [null, {}, { productIds: "a" }, { productIds: [] }, { productIds: [""] }, { productIds: [1] }, { productIds: ["a", "a"] }, { productIds: [null] }]) {
    assert.throws(() => parseReorderProductIds(body), /productIds|product id/i);
  }
});

test("buildReorderPatches assigns contiguous sortOrder and rejects missing ids", () => {
  const productsById = new Map([
    ["p1", { id: "p1", sortOrder: 5, slug: "one" }],
    ["p2", { id: "p2", sortOrder: 1, slug: "two" }],
    ["p3", { id: "p3", sortOrder: 9, slug: "three" }],
  ]);
  const patches = buildReorderPatches(productsById, ["p3", "p1", "p2"]);
  assert.deepEqual(patches.map((p) => [p.id, p.sortOrder, p.previousSortOrder]), [
    ["p3", 0, 9],
    ["p1", 1, 5],
    ["p2", 2, 1],
  ]);
  assert.throws(() => buildReorderPatches(productsById, ["p1", "missing"]), /do not belong/);
});

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "product-phase-c-"));
const password = "PhaseC-test-123!";
const passwordHash = await hashPassword(password);
const now = "2026-09-06T12:00:00.000Z";

const company = (id) => ({
  id,
  slug: id,
  name: id,
  status: "active",
  settings: {
    language: "en",
    currency: "USD",
    websiteConnection: {
      siteId: `${id}-storefront`,
      storefrontBaseUrl: "https://example.test",
      defaultLocale: "en",
      supportedLocales: ["en"],
    },
  },
});
const user = (id, companyId, role = "company_admin") => ({
  id,
  email: `${id}@test.local`,
  password: passwordHash,
  role,
  company_id: companyId,
  permissions: [],
  isActive: true,
  createdAt: now,
  updatedAt: now,
});

function product(id, companyId, sortOrder) {
  return {
    id,
    slug: id,
    sku: id.toUpperCase(),
    name: { en: id, ar: id },
    company_id: companyId,
    brandId: `${companyId}-brand`,
    categoryId: `${companyId}-sub`,
    mainCategoryId: `${companyId}-main`,
    subcategoryId: `${companyId}-sub`,
    image: `/uploads/${companyId}/products/${id}/main.webp`,
    variants: [{ id: `${id}-v1`, color_name: "Default", size: "M", price: 10, stock: 5, sort_order: 0 }],
    isActive: true,
    visible: true,
    sortOrder,
    stockQty: 5,
    createdAt: now,
    updatedAt: now,
  };
}

fs.writeFileSync(path.join(dataDir, "store.json"), JSON.stringify({
  version: 2,
  companies: [company("icare"), company("eb-chemical")],
  domains: [
    { id: "icare-domain", company_id: "icare", domain: "icare.example.test", is_primary: true, is_active: true, is_verified: true, created_at: now, updated_at: now },
    { id: "eb-domain", company_id: "eb-chemical", domain: "eb.example.test", is_primary: true, is_active: true, is_verified: true, created_at: now, updated_at: now },
  ],
  users: [
    user("icare-admin", "icare"),
    user("eb-admin", "eb-chemical"),
    { ...user("icare-view", "icare", "employee"), permissions: ["products.view"] },
    { ...user("icare-update", "icare", "employee"), permissions: ["products.update"] },
  ],
  memberships: [
    { id: "m1", companyId: "icare", userId: "icare-admin", role: "company_admin", status: "active", permissions: [], createdAt: now, updatedAt: now },
    { id: "m2", companyId: "eb-chemical", userId: "eb-admin", role: "company_admin", status: "active", permissions: [], createdAt: now, updatedAt: now },
    { id: "m3", companyId: "icare", userId: "icare-view", role: "employee", status: "active", permissions: ["products.view"], createdAt: now, updatedAt: now },
    { id: "m4", companyId: "icare", userId: "icare-update", role: "employee", status: "active", permissions: ["products.update"], createdAt: now, updatedAt: now },
  ],
  brands: [
    { id: "icare-brand", slug: "icare-brand", name: { en: "iCare" }, company_id: "icare", isActive: true },
    { id: "eb-brand", slug: "eb-brand", name: { en: "EB" }, company_id: "eb-chemical", isActive: true },
  ],
  categories: [
    { id: "icare-main", slug: "main", name: { en: "Main" }, parentId: null, brandId: "icare-brand", company_id: "icare", isActive: true },
    { id: "icare-sub", slug: "sub", name: { en: "Sub" }, parentId: "icare-main", brandId: null, company_id: "icare", isActive: true },
    { id: "eb-chemical-main", slug: "main", name: { en: "Main" }, parentId: null, brandId: "eb-brand", company_id: "eb-chemical", isActive: true },
    { id: "eb-chemical-sub", slug: "sub", name: { en: "Sub" }, parentId: "eb-chemical-main", brandId: null, company_id: "eb-chemical", isActive: true },
  ],
  products: [
    product("icare-a", "icare", 0),
    product("icare-b", "icare", 1),
    product("icare-c", "icare", 2),
    product("eb-x", "eb-chemical", 0),
    product("eb-y", "eb-chemical", 1),
  ],
  orders: [],
}, null, 2));

process.env.DATA_STORE_DIR = dataDir;
process.env.DATABASE_URL = "";
process.env.POSTGRES_URL = "";
process.env.SUPABASE_URL = "";
process.env.SUPABASE_SERVICE_ROLE_KEY = "";
process.env.JWT_SECRET = "phase-c-product-test-secret";
process.env.NODE_ENV = "test";
process.env.ALLOW_LOCAL_CATALOG_STORAGE = "true";
process.env.UPLOADS_DIR = path.join(dataDir, "uploads");
fs.mkdirSync(process.env.UPLOADS_DIR, { recursive: true });

const { app } = await import(`../src/server.js?phasec=${Date.now()}`);
const server = app.listen(0, "127.0.0.1");
await new Promise((resolve) => server.once("listening", resolve));
test.after(() => {
  server.close();
});
const base = `http://127.0.0.1:${server.address().port}/api`;

async function request(url, { token, body, method } = {}) {
  const response = await fetch(`${base}${url}`, {
    method: method || (body ? "POST" : "GET"),
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let parsed = null;
  try { parsed = text ? JSON.parse(text) : null; } catch { parsed = text; }
  return { status: response.status, body: parsed };
}

async function login(email) {
  const result = await request("/auth/login", { body: { email, password } });
  assert.equal(result.status, 200, `login failed for ${email}`);
  return result.body.token;
}

test("successful reorder persists sortOrder for multiple products", async () => {
  const token = await login("icare-update@test.local");
  const result = await request("/admin/products/reorder", {
    token,
    method: "PATCH",
    body: { productIds: ["icare-c", "icare-a", "icare-b"] },
  });
  assert.equal(result.status, 200, JSON.stringify(result.body));
  assert.deepEqual(result.body.productIds, ["icare-c", "icare-a", "icare-b"]);
  assert.deepEqual(result.body.products.map((p) => [p.id, p.sortOrder]), [
    ["icare-c", 0],
    ["icare-a", 1],
    ["icare-b", 2],
  ]);

  const adminToken = await login("icare-admin@test.local");
  const list = await request("/products", { token: adminToken });
  assert.equal(list.status, 200, JSON.stringify(list.body));
  const byId = Object.fromEntries(list.body.map((p) => [p.id, p.sortOrder]));
  assert.equal(byId["icare-c"], 0);
  assert.equal(byId["icare-a"], 1);
  assert.equal(byId["icare-b"], 2);
});

test("reorder requires products.update permission", async () => {
  const viewToken = await login("icare-view@test.local");
  const denied = await request("/admin/products/reorder", {
    token: viewToken,
    method: "PATCH",
    body: { productIds: ["icare-a", "icare-b", "icare-c"] },
  });
  assert.equal(denied.status, 403);

  const updateToken = await login("icare-update@test.local");
  const allowed = await request("/admin/products/reorder", {
    token: updateToken,
    method: "PATCH",
    body: { productIds: ["icare-b", "icare-c", "icare-a"] },
  });
  assert.equal(allowed.status, 200, JSON.stringify(allowed.body));
});

test("cross-tenant product ids are rejected with no partial mutation", async () => {
  const token = await login("icare-update@test.local");
  const adminToken = await login("icare-admin@test.local");
  const before = await request("/products", { token: adminToken });
  assert.equal(before.status, 200, JSON.stringify(before.body));
  const beforeOrders = Object.fromEntries(before.body.map((p) => [p.id, p.sortOrder]));

  const cross = await request("/admin/products/reorder", {
    token,
    method: "PATCH",
    body: { productIds: ["icare-a", "eb-x", "icare-b"] },
  });
  assert.equal(cross.status, 400);
  assert.match(String(cross.body?.message || ""), /invalid|do not belong/i);

  const after = await request("/products", { token: adminToken });
  const afterOrders = Object.fromEntries(after.body.map((p) => [p.id, p.sortOrder]));
  assert.deepEqual(afterOrders, beforeOrders);

  const ebToken = await login("eb-admin@test.local");
  const ebList = await request("/products", { token: ebToken });
  const ebX = ebList.body.find((p) => p.id === "eb-x");
  assert.equal(ebX.sortOrder, 0);
});

test("invalid reorder payloads are rejected", async () => {
  const token = await login("icare-update@test.local");
  for (const body of [{}, { productIds: [] }, { productIds: ["icare-a", "icare-a"] }, { productIds: [null] }]) {
    const result = await request("/admin/products/reorder", { token, method: "PATCH", body });
    assert.equal(result.status, 400, JSON.stringify(body));
  }
});

test("successful reorder creates exactly one product.reordered activity log", async () => {
  const token = await login("icare-admin@test.local");
  const { activityLogRepository } = await import("../src/data/store.js");
  const beforeCount = activityLogRepository.getByCompany("icare")
    .filter((entry) => entry.action === "product.reordered").length;

  const result = await request("/admin/products/reorder", {
    token,
    method: "PATCH",
    body: { productIds: ["icare-a", "icare-c", "icare-b"] },
  });
  assert.equal(result.status, 200, JSON.stringify(result.body));

  const logs = activityLogRepository.getByCompany("icare")
    .filter((entry) => entry.action === "product.reordered");
  assert.equal(logs.length, beforeCount + 1);
  const latest = logs[logs.length - 1];
  assert.equal(latest.metadata?.count, 3);
  assert.equal(latest.after_data?.productIds?.length, 3);
});

test("storefront content products remain sorted by sortOrder then slug", async () => {
  const token = await login("icare-admin@test.local");
  await request("/admin/products/reorder", {
    token,
    method: "PATCH",
    body: { productIds: ["icare-c", "icare-b", "icare-a"] },
  });

  const response = await fetch(`${base}/storefront/content`, {
    headers: {
      "X-Company-Id": "icare",
      "X-Site-Id": "icare-storefront",
    },
  });
  const content = { status: response.status, body: await response.json().catch(() => null) };
  assert.equal(content.status, 200, JSON.stringify(content.body));
  const ids = content.body.products.map((p) => p.id);
  assert.deepEqual(ids, ["icare-c", "icare-b", "icare-a"]);
  const orders = content.body.products.map((p) => p.sortOrder);
  assert.deepEqual(orders, [0, 1, 2]);
});

test("file-store reorder rolls back in-memory changes when persist fails", async () => {
  const { productRepository, reorderProductsWithTenantCatalogLock } = await import("../src/data/store.js");
  const before = Object.fromEntries(
    productRepository.getByCompany("icare").map((p) => [p.id, p.sortOrder]),
  );

  const originalWrite = fs.writeFileSync;
  fs.writeFileSync = () => {
    throw new Error("forced persist failure");
  };
  try {
    await assert.rejects(
      () => reorderProductsWithTenantCatalogLock("icare", ["icare-b", "icare-a", "icare-c"]),
      /forced persist failure/,
    );
  } finally {
    fs.writeFileSync = originalWrite;
  }

  const after = Object.fromEntries(
    productRepository.getByCompany("icare").map((p) => [p.id, p.sortOrder]),
  );
  assert.deepEqual(after, before);
});
