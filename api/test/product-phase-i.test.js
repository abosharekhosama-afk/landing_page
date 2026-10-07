import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { hashPassword } from "../src/auth/passwords.js";
import { serializePublicProduct } from "../src/storefront/publicContent.js";
import {
  assertConditionMutationAllowed,
  canonicalProductCondition,
  isProductConditionEnabled,
  normalizeOptionalProductCondition,
  stripProductCondition,
} from "../src/products/productSettings.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "product-phase-i-"));
const password = "PhaseI-condition-123!";
const passwordHash = await hashPassword(password);
const now = "2026-09-07T14:00:00.000Z";

const company = (id, settings = {}) => ({
  id,
  slug: id,
  name: id,
  status: "active",
  settings: {
    language: "en",
    currency: "USD",
    websiteConnection: {
      siteId: `${id}-storefront`,
      storefrontBaseUrl: `https://${id}.example`,
      defaultLocale: "en",
      supportedLocales: ["en"],
    },
    ...settings,
  },
});

const user = (id, companyId, role = "company_admin", permissions = []) => ({
  id,
  email: `${id}@test.local`,
  password: passwordHash,
  role,
  company_id: companyId,
  permissions,
  isActive: true,
  createdAt: now,
  updatedAt: now,
});

const productBase = {
  brandId: "icare-brand",
  categoryId: "icare-sub",
  mainCategoryId: "icare-main",
  subcategoryId: "icare-sub",
  isActive: true,
  visible: true,
  createdAt: now,
  updatedAt: now,
};

fs.writeFileSync(path.join(dataDir, "store.json"), JSON.stringify({
  version: 2,
  companies: [
    company("icare", { productConditionEnabled: false }),
    company("eb-chemical", { productConditionEnabled: false }),
  ],
  domains: [
    {
      id: "icare-domain",
      company_id: "icare",
      domain: "icare.example",
      is_primary: true,
      is_active: true,
      is_verified: true,
      created_at: now,
      updated_at: now,
    },
  ],
  users: [
    user("icare-admin", "icare"),
    user("eb-admin", "eb-chemical"),
    user("icare-update", "icare", "employee", ["products.view", "products.update", "products.create"]),
    user("icare-view", "icare", "employee", ["products.view"]),
  ],
  memberships: [
    { id: "m1", companyId: "icare", userId: "icare-admin", role: "company_admin", status: "active", permissions: [], createdAt: now, updatedAt: now },
    { id: "m2", companyId: "eb-chemical", userId: "eb-admin", role: "company_admin", status: "active", permissions: [], createdAt: now, updatedAt: now },
    { id: "m3", companyId: "icare", userId: "icare-update", role: "employee", status: "active", permissions: ["products.view", "products.update", "products.create"], createdAt: now, updatedAt: now },
    { id: "m4", companyId: "icare", userId: "icare-view", role: "employee", status: "active", permissions: ["products.view"], createdAt: now, updatedAt: now },
  ],
  brands: [
    { id: "icare-brand", slug: "icare-brand", name: { en: "iCare" }, company_id: "icare", isActive: true },
    { id: "eb-brand", slug: "eb-brand", name: { en: "EB" }, company_id: "eb-chemical", isActive: true },
  ],
  categories: [
    { id: "icare-main", slug: "main", name: { en: "Main" }, parentId: null, brandId: "icare-brand", company_id: "icare", isActive: true },
    { id: "icare-sub", slug: "sub", name: { en: "Sub" }, parentId: "icare-main", brandId: null, company_id: "icare", isActive: true },
    { id: "eb-main", slug: "eb-main", name: { en: "EB Main" }, parentId: null, brandId: "eb-brand", company_id: "eb-chemical", isActive: true },
    { id: "eb-sub", slug: "eb-sub", name: { en: "EB Sub" }, parentId: "eb-main", brandId: null, company_id: "eb-chemical", isActive: true },
  ],
  products: [
    {
      ...productBase,
      id: "icare-plain",
      slug: "icare-plain",
      sku: "PLAIN-1",
      name: { en: "Plain Product" },
      company_id: "icare",
      variants: [{ id: "v1", size: "M", price: 15, stock: 4 }],
      stockQty: 4,
    },
    {
      ...productBase,
      id: "icare-conditioned",
      slug: "icare-conditioned",
      sku: "COND-1",
      name: { en: "Conditioned Product" },
      company_id: "icare",
      condition: "refurbished",
      variants: [{ id: "v2", size: "S", price: 12, stock: 8 }],
      stockQty: 8,
    },
    {
      id: "eb-item",
      slug: "eb-item",
      sku: "EB-1",
      name: { en: "EB Item" },
      company_id: "eb-chemical",
      brandId: "eb-brand",
      categoryId: "eb-sub",
      mainCategoryId: "eb-main",
      subcategoryId: "eb-sub",
      isActive: true,
      visible: true,
      condition: "used",
      variants: [{ id: "ev1", size: "L", price: 9, stock: 1 }],
      createdAt: now,
      updatedAt: now,
    },
  ],
  orders: [],
}, null, 2));

process.env.DATA_STORE_DIR = dataDir;
process.env.DATABASE_URL = "";
process.env.POSTGRES_URL = "";
process.env.SUPABASE_URL = "";
process.env.SUPABASE_SERVICE_ROLE_KEY = "";
process.env.JWT_SECRET = "phase-i-product-test-secret";
process.env.NODE_ENV = "test";
process.env.ALLOW_LOCAL_CATALOG_STORAGE = "true";
process.env.UPLOADS_DIR = path.join(dataDir, "uploads");
fs.mkdirSync(process.env.UPLOADS_DIR, { recursive: true });

const { app } = await import(`../src/server.js?phasei=${Date.now()}`);
const { productRepository } = await import("../src/data/store.js");
const server = app.listen(0, "127.0.0.1");
await new Promise((resolve) => server.once("listening", resolve));
test.after(() => {
  server.close();
});
const base = `http://127.0.0.1:${server.address().port}/api`;

async function request(url, { token, body, method, headers } = {}) {
  const response = await fetch(`${base}${url}`, {
    method: method || (body ? "POST" : "GET"),
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(headers || {}),
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
  assert.equal(result.status, 200, `login failed for ${email}: ${JSON.stringify(result.body)}`);
  return result.body.token;
}

function catalogBody(overrides = {}) {
  const stamp = Date.now();
  return {
    slug: `cond-${stamp}`,
    sku: `COND-${stamp}`,
    name: { en: "Condition Item", ar: "حالة" },
    brandId: "icare-brand",
    categoryId: "icare-sub",
    mainCategoryId: "icare-main",
    subcategoryId: "icare-sub",
    variants: [{ color_name: "Default", size: "S", price: 8, stock: 3 }],
    isActive: true,
    visible: true,
    ...overrides,
  };
}

async function enableCondition(token, enabled = true) {
  const updated = await request("/company/settings", {
    token,
    method: "PATCH",
    body: { productConditionEnabled: enabled },
  });
  assert.equal(updated.status, 200, JSON.stringify(updated.body));
  assert.equal(updated.body.productConditionEnabled, enabled);
  return updated.body;
}

test("condition helpers: enum, unset, invalid, and disabled mutation", () => {
  assert.equal(canonicalProductCondition("New"), "new");
  assert.equal(canonicalProductCondition("Refurbished"), "refurbished");
  assert.equal(canonicalProductCondition("Used"), "used");
  assert.equal(canonicalProductCondition(""), null);
  assert.equal(canonicalProductCondition("Like New"), undefined);
  assert.equal(normalizeOptionalProductCondition(null), null);
  assert.equal(normalizeOptionalProductCondition("New"), "new");
  assert.throws(() => normalizeOptionalProductCondition("Open Box"));
  assert.equal(isProductConditionEnabled({ settings: {} }), false);
  assert.equal(isProductConditionEnabled({ settings: { productConditionEnabled: true } }), true);
  assert.throws(
    () => assertConditionMutationAllowed({}, { settings: { productConditionEnabled: false } }, { condition: "new" }),
  );
  assert.doesNotThrow(
    () => assertConditionMutationAllowed(
      {},
      { settings: { productConditionEnabled: false } },
      { condition: null },
      { condition: null },
    ),
  );
  assert.doesNotThrow(
    () => assertConditionMutationAllowed(
      {},
      { settings: { productConditionEnabled: false } },
      { condition: "refurbished" },
      { condition: "refurbished" },
    ),
  );
  assert.equal(stripProductCondition({ id: "p", condition: "new" }).condition, undefined);
});

test("public serializer omits condition unless enabled and set", () => {
  const product = {
    id: "p1",
    slug: "p1",
    name: { en: "P" },
    condition: "used",
    variants: [{ id: "v1", size: "S", price: 10, stock: 1, costPrice: 2 }],
  };
  const disabled = serializePublicProduct(product);
  assert.equal(Object.hasOwn(disabled, "condition"), false);
  const enabledUnset = serializePublicProduct({ ...product, condition: null }, { conditionEnabled: true });
  assert.equal(Object.hasOwn(enabledUnset, "condition"), false);
  const enabledSet = serializePublicProduct(product, { conditionEnabled: true });
  assert.equal(enabledSet.condition, "used");
  assert.equal(JSON.stringify(enabledSet).includes("costPrice"), false);
});

test("Phase I product condition HTTP", async (t) => {
  await t.test("condition disabled by default; enable/disable is tenant-scoped", async () => {

  const token = await login("icare-admin@test.local");
  const read = await request("/company/settings", { token });
  assert.equal(read.status, 200);
  assert.equal(read.body.productConditionEnabled, false);

  await enableCondition(token, true);
  const ebToken = await login("eb-admin@test.local");
  const ebRead = await request("/company/settings", { token: ebToken });
  assert.equal(ebRead.body.productConditionEnabled, false);

  const invalid = await request("/company/settings", {
    token,
    method: "PATCH",
    body: { productConditionEnabled: "yes" },
  });
  assert.equal(invalid.status, 400);

    await enableCondition(token, false);
  });

  await t.test("create/update accept New/Refurbished/Used when enabled and reject invalid values", async () => {
  const token = await login("icare-admin@test.local");
  await enableCondition(token, true);

  const without = await request("/products", { token, body: catalogBody() });
  assert.equal(without.status, 201, JSON.stringify(without.body));
  assert.equal(without.body.condition, null);

  const createdNew = await request("/products", { token, body: catalogBody({ condition: "New" }) });
  assert.equal(createdNew.status, 201, JSON.stringify(createdNew.body));
  assert.equal(createdNew.body.condition, "new");

  const createdRefurb = await request("/products", { token, body: catalogBody({ condition: "Refurbished" }) });
  assert.equal(createdRefurb.status, 201, JSON.stringify(createdRefurb.body));
  assert.equal(createdRefurb.body.condition, "refurbished");

  const createdUsed = await request("/products", { token, body: catalogBody({ condition: "Used" }) });
  assert.equal(createdUsed.status, 201, JSON.stringify(createdUsed.body));
  assert.equal(createdUsed.body.condition, "used");

  const invalidCreate = await request("/products", { token, body: catalogBody({ condition: "Like New" }) });
  assert.equal(invalidCreate.status, 400);

  const updatedNew = await request("/products/icare-plain", {
    token,
    method: "PUT",
    body: { ...catalogBody({ slug: "icare-plain", sku: "PLAIN-1" }), id: "icare-plain", condition: "new" },
  });
  assert.equal(updatedNew.status, 200, JSON.stringify(updatedNew.body));
  assert.equal(updatedNew.body.condition, "new");

  const updatedRefurb = await request("/products/icare-plain", {
    token,
    method: "PUT",
    body: { id: "icare-plain", condition: "refurbished" },
  });
  assert.equal(updatedRefurb.status, 200, JSON.stringify(updatedRefurb.body));
  assert.equal(updatedRefurb.body.condition, "refurbished");

  const updatedUsed = await request("/products/icare-plain", {
    token,
    method: "PUT",
    body: { id: "icare-plain", condition: "used" },
  });
  assert.equal(updatedUsed.status, 200, JSON.stringify(updatedUsed.body));
  assert.equal(updatedUsed.body.condition, "used");

  const invalidUpdate = await request("/products/icare-plain", {
    token,
    method: "PUT",
    body: { id: "icare-plain", condition: "Damaged" },
  });
  assert.equal(invalidUpdate.status, 400);

  const cleared = await request("/products/icare-plain", {
    token,
    method: "PUT",
    body: { id: "icare-plain", condition: null },
  });
  assert.equal(cleared.status, 200, JSON.stringify(cleared.body));
    assert.equal(cleared.body.condition, null);
  });

  await t.test("condition mutations are rejected while the feature is disabled", async () => {
  const token = await login("icare-admin@test.local");
  await enableCondition(token, false);

  const createRejected = await request("/products", { token, body: catalogBody({ condition: "new" }) });
  assert.equal(createRejected.status, 403);

    const updateRejected = await request("/products/icare-conditioned", {
      token,
      method: "PUT",
      body: { id: "icare-conditioned", condition: "used" },
    });
    assert.equal(updateRejected.status, 403);

    const roundTrip = await request("/products/icare-conditioned", {
      token,
      method: "PUT",
      body: { id: "icare-conditioned", condition: "refurbished" },
    });
    assert.equal(roundTrip.status, 200, JSON.stringify(roundTrip.body));
    assert.equal(roundTrip.body.condition, "refurbished");

    const list = await request("/products", { token });
    assert.equal(list.status, 200);
    const preserved = list.body.find((item) => item.id === "icare-conditioned");
    assert.ok(preserved);
    assert.equal(preserved.condition, "refurbished");

    const storefront = await request("/storefront/content?locale=en", {
      headers: { "X-Company-Id": "icare", "X-Site-Id": "icare-storefront" },
    });
    assert.equal(storefront.status, 200);
    const publicRow = storefront.body.products.find((item) => item.id === "icare-conditioned");
    assert.ok(publicRow);
    assert.equal(Object.hasOwn(publicRow, "condition"), false);
  });

  await t.test("unauthorized users cannot update condition; tenant isolation holds", async () => {
  const admin = await login("icare-admin@test.local");
  await enableCondition(admin, true);

  const viewer = await login("icare-view@test.local");
  const denied = await request("/products/icare-conditioned", {
    token: viewer,
    method: "PUT",
    body: { id: "icare-conditioned", condition: "new" },
  });
  assert.equal(denied.status, 403);

  const updater = await login("icare-update@test.local");
  const allowed = await request("/products/icare-conditioned", {
    token: updater,
    method: "PUT",
    body: { id: "icare-conditioned", condition: "new" },
  });
  assert.equal(allowed.status, 200, JSON.stringify(allowed.body));
  assert.equal(allowed.body.condition, "new");

  const ebToken = await login("eb-admin@test.local");
  const cross = await request("/products/icare-conditioned", {
    token: ebToken,
    method: "PUT",
    body: { id: "icare-conditioned", condition: "used" },
  });
  assert.equal(cross.status, 404);

  const ebSettings = await request("/company/settings", {
    token: ebToken,
    method: "PATCH",
    body: { productConditionEnabled: true },
  });
  assert.equal(ebSettings.status, 200);
  const icareSettings = await request("/company/settings", { token: admin });
    assert.equal(icareSettings.body.productConditionEnabled, true);
  });

  await t.test("duplicate copies condition when enabled and strips it when disabled", async () => {
  const token = await login("icare-admin@test.local");
  await enableCondition(token, true);
  await request("/products/icare-conditioned", {
    token,
    method: "PUT",
    body: { id: "icare-conditioned", condition: "used" },
  });

  const copied = await request("/products/icare-conditioned/duplicate", { token, method: "POST" });
  assert.equal(copied.status, 201, JSON.stringify(copied.body));
  assert.equal(copied.body.condition, "used");
  assert.notEqual(copied.body.id, "icare-conditioned");

  await enableCondition(token, false);
  const stripped = await request("/products/icare-conditioned/duplicate", { token, method: "POST" });
  assert.equal(stripped.status, 201, JSON.stringify(stripped.body));
    assert.equal(stripped.body.condition, null);
  });

  await t.test("trash preserves condition, restore keeps it, public omits trashed, permanent delete removes it", async () => {
  const token = await login("icare-admin@test.local");
  await enableCondition(token, true);
  const created = await request("/products", { token, body: catalogBody({ condition: "new", slug: `trash-cond-${Date.now()}` }) });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  const id = created.body.id;
  assert.equal(created.body.condition, "new");

  const trashed = await request(`/products/${id}`, { token, method: "DELETE" });
  assert.equal(trashed.status, 204);

  const stored = productRepository.findByCompany("icare", id);
  assert.ok(stored);
  assert.equal(stored.condition, "new");
  assert.ok(stored.deletedAt || stored.deleted_at);

    const list = await request("/products", { token });
    assert.equal(list.body.some((item) => item.id === id), false);

  const storefront = await request("/storefront/content?locale=en", {
    headers: { "X-Company-Id": "icare", "X-Site-Id": "icare-storefront" },
  });
  assert.equal(storefront.status, 200);
  assert.equal(storefront.body.products.some((item) => item.id === id), false);

  const restored = await request(`/products/${id}/restore`, { token, method: "POST" });
  assert.equal(restored.status, 200, JSON.stringify(restored.body));
  assert.equal(restored.body.condition, "new");

  const trashAgain = await request(`/products/${id}`, { token, method: "DELETE" });
  assert.equal(trashAgain.status, 204);

  const removed = await request(`/products/${id}/permanent`, { token, method: "DELETE" });
  assert.equal(removed.status, 204);
    assert.equal(productRepository.findByCompany("icare", id), null);
  });

  await t.test("storefront exposes condition only when enabled and set; no cross-tenant leak", async () => {
  const token = await login("icare-admin@test.local");
  await enableCondition(token, true);
  await request("/products/icare-conditioned", {
    token,
    method: "PUT",
    body: { id: "icare-conditioned", condition: "refurbished" },
  });

  const enabled = await request("/storefront/content?locale=en", {
    headers: { "X-Company-Id": "icare", "X-Site-Id": "icare-storefront" },
  });
  assert.equal(enabled.status, 200);
  const conditioned = enabled.body.products.find((item) => item.id === "icare-conditioned");
  const plain = enabled.body.products.find((item) => item.id === "icare-plain");
  assert.equal(conditioned.condition, "refurbished");
  assert.equal(Object.hasOwn(plain, "condition"), false);
  assert.equal(enabled.body.products.some((item) => item.id === "eb-item"), false);
  assert.equal(JSON.stringify(conditioned).includes("costPrice"), false);
  assert.equal(JSON.stringify(conditioned).includes("productConditionEnabled"), false);

  const detail = await request("/storefront/products/icare-conditioned", {
    headers: { "X-Company-Id": "icare", "X-Site-Id": "icare-storefront" },
  });
  assert.equal(detail.status, 200);
  assert.equal(detail.body.condition, "refurbished");

  await enableCondition(token, false);
  const disabled = await request("/storefront/content?locale=en", {
    headers: { "X-Company-Id": "icare", "X-Site-Id": "icare-storefront" },
  });
  assert.equal(disabled.status, 200);
  const hidden = disabled.body.products.find((item) => item.id === "icare-conditioned");
    assert.equal(Object.hasOwn(hidden, "condition"), false);
  });
});
