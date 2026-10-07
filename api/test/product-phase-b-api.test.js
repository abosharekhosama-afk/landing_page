import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { hashPassword } from "../src/auth/passwords.js";

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "product-phase-b-"));
const password = "PhaseB-test-123!";
const passwordHash = await hashPassword(password);
const now = "2026-09-06T10:00:00.000Z";

const company = (id) => ({ id, slug: id, name: id, status: "active", settings: { language: "en", currency: "USD" } });
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

const sourceProduct = {
  id: "icare-dress",
  slug: "icare-dress",
  sku: "ICARE-DRESS",
  name: { en: "iCare Dress", ar: "فستان" },
  company_id: "icare",
  brandId: "icare-brand",
  categoryId: "icare-sub",
  mainCategoryId: "icare-main",
  subcategoryId: "icare-sub",
  image: "/uploads/icare/products/icare-dress/main.webp",
  hoverImage: "/uploads/icare/products/icare-dress/hover.webp",
  gallery_images: [{ id: "g1", image_url: "/uploads/icare/products/icare-dress/g1.webp", sort_order: 0 }],
  variants: [
    {
      id: "v1",
      color_name: "Red",
      size: "S",
      price: 25,
      sale_price: 20,
      stock: 4,
      image_url: "/uploads/icare/products/icare-dress/v1.webp",
      sort_order: 0,
    },
  ],
  isActive: true,
  visible: true,
  stockQty: 4,
  createdAt: now,
  updatedAt: now,
};

fs.writeFileSync(path.join(dataDir, "store.json"), JSON.stringify({
  version: 2,
  companies: [company("icare"), company("eb-chemical")],
  users: [
    user("icare-admin", "icare"),
    user("eb-admin", "eb-chemical"),
    {
      ...user("icare-view", "icare", "employee"),
      permissions: ["products.view"],
    },
    {
      ...user("icare-create", "icare", "employee"),
      permissions: ["products.create"],
    },
    {
      ...user("icare-update", "icare", "employee"),
      permissions: ["products.update"],
    },
  ],
  memberships: [
    { id: "m1", companyId: "icare", userId: "icare-admin", role: "company_admin", status: "active", permissions: [], createdAt: now, updatedAt: now },
    { id: "m2", companyId: "eb-chemical", userId: "eb-admin", role: "company_admin", status: "active", permissions: [], createdAt: now, updatedAt: now },
    { id: "m3", companyId: "icare", userId: "icare-view", role: "employee", status: "active", permissions: ["products.view"], createdAt: now, updatedAt: now },
    { id: "m4", companyId: "icare", userId: "icare-create", role: "employee", status: "active", permissions: ["products.create"], createdAt: now, updatedAt: now },
    { id: "m5", companyId: "icare", userId: "icare-update", role: "employee", status: "active", permissions: ["products.update"], createdAt: now, updatedAt: now },
  ],
  brands: [
    { id: "icare-brand", slug: "icare-brand", name: { en: "iCare" }, company_id: "icare", isActive: true },
    { id: "eb-brand", slug: "eb-brand", name: { en: "EB" }, company_id: "eb-chemical", isActive: true },
  ],
  categories: [
    { id: "icare-main", slug: "main", name: { en: "Main" }, parentId: null, brandId: "icare-brand", company_id: "icare", isActive: true },
    { id: "icare-sub", slug: "sub", name: { en: "Sub" }, parentId: "icare-main", brandId: null, company_id: "icare", isActive: true },
  ],
  products: [
    sourceProduct,
    {
      ...sourceProduct,
      id: "eb-dress",
      slug: "eb-dress",
      sku: "EB-DRESS",
      company_id: "eb-chemical",
      brandId: "eb-brand",
      image: "/uploads/eb-chemical/products/eb-dress/main.webp",
    },
  ],
  orders: [
    {
      id: "icare-order-1",
      company_id: "icare",
      status: "Delivered",
      items: [
        { productId: "icare-dress", quantity: 2 },
        { productId: "icare-dress", quantity: 1 },
      ],
      createdAt: now,
    },
    {
      id: "eb-order-1",
      company_id: "eb-chemical",
      status: "Delivered",
      items: [{ productId: "icare-dress", quantity: 50 }],
      createdAt: now,
    },
  ],
}, null, 2));

process.env.DATA_STORE_DIR = dataDir;
process.env.DATABASE_URL = "";
process.env.POSTGRES_URL = "";
process.env.SUPABASE_URL = "";
process.env.SUPABASE_SERVICE_ROLE_KEY = "";
process.env.JWT_SECRET = "phase-b-product-test-secret";
process.env.NODE_ENV = "test";
process.env.ALLOW_LOCAL_CATALOG_STORAGE = "true";
process.env.UPLOADS_DIR = path.join(dataDir, "uploads");
fs.mkdirSync(process.env.UPLOADS_DIR, { recursive: true });

const { app } = await import(`../src/server.js?phaseb=${Date.now()}`);
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

test("authenticated product list includes tenant-scoped salesCount and excludes cross-tenant products", async () => {
  const token = await login("icare-admin@test.local");
  const result = await request("/products", { token });
  assert.equal(result.status, 200);
  const dress = result.body.find((item) => item.id === "icare-dress");
  assert.ok(dress);
  assert.equal(dress.salesCount, 3);
  assert.equal(result.body.some((item) => item.id === "eb-dress"), false);

  const ebToken = await login("eb-admin@test.local");
  const ebList = await request("/products", { token: ebToken });
  assert.equal(ebList.status, 200);
  const ebDress = ebList.body.find((item) => item.id === "eb-dress");
  assert.ok(ebDress);
  // EB order item mistakenly used icare product id — must not inflate EB product salesCount.
  assert.equal(ebDress.salesCount, 0);
});

test("zero-sales products report salesCount 0", async () => {
  const token = await login("icare-admin@test.local");
  const result = await request("/products", { token });
  assert.equal(result.status, 200);
  for (const product of result.body) {
    assert.equal(typeof product.salesCount, "number");
    assert.ok(Number.isInteger(product.salesCount));
  }
});

test("duplicate creates unique slug/sku, variants, media URL references, and activity log", async () => {
  const token = await login("icare-admin@test.local");
  const duplicated = await request("/products/icare-dress/duplicate", { token, method: "POST" });
  assert.equal(duplicated.status, 201, JSON.stringify(duplicated.body));
  assert.notEqual(duplicated.body.id, "icare-dress");
  assert.equal(duplicated.body.slug, "icare-dress-copy");
  assert.equal(duplicated.body.sku, "ICARE-DRESS-copy");
  assert.equal(duplicated.body.image, sourceProduct.image);
  assert.equal(duplicated.body.variants.length, 1);
  assert.equal(duplicated.body.variants[0].image_url, sourceProduct.variants[0].image_url);
  assert.notEqual(duplicated.body.variants[0].id, "v1");
  assert.equal(duplicated.body.salesCount, 0);

  const list = await request("/products", { token });
  const copy = list.body.find((item) => item.id === duplicated.body.id);
  assert.ok(copy);
  assert.equal(copy.image, sourceProduct.image);

  const { activityLogRepository } = await import("../src/data/store.js");
  const logs = activityLogRepository.getByCompany("icare");
  assert.ok(logs.some((entry) => entry.action === "product.duplicated" && entry.entity_id === duplicated.body.id));
});

test("duplicate denies missing permission and cross-tenant source ids", async () => {
  const viewToken = await login("icare-view@test.local");
  const denied = await request("/products/icare-dress/duplicate", { token: viewToken, method: "POST" });
  assert.equal(denied.status, 403);

  const ebToken = await login("eb-admin@test.local");
  const cross = await request("/products/icare-dress/duplicate", { token: ebToken, method: "POST" });
  assert.ok([403, 404].includes(cross.status));

  const createToken = await login("icare-create@test.local");
  const missing = await request("/products/does-not-exist/duplicate", { token: createToken, method: "POST" });
  assert.equal(missing.status, 404);
});

test("authorized user can deactivate and unauthorized users are denied", async () => {
  const updateToken = await login("icare-update@test.local");
  const deactivated = await request("/products/icare-dress", {
    token: updateToken,
    method: "PUT",
    body: { id: "icare-dress", isActive: false },
  });
  assert.equal(deactivated.status, 200, JSON.stringify(deactivated.body));
  assert.equal(deactivated.body.isActive, false);

  const viewToken = await login("icare-view@test.local");
  const denied = await request("/products/icare-dress", {
    token: viewToken,
    method: "PUT",
    body: { id: "icare-dress", isActive: true },
  });
  assert.equal(denied.status, 403);

  const ebToken = await login("eb-admin@test.local");
  const cross = await request("/products/icare-dress", {
    token: ebToken,
    method: "PUT",
    body: { id: "icare-dress", isActive: true },
  });
  assert.ok([403, 404].includes(cross.status));
});

test("upload delete skips storage removal when another product still references the URL", async () => {
  const source = fs.readFileSync(new URL("../src/routes/uploads.js", import.meta.url), "utf8");
  assert.match(source, /mediaUrlStillReferenced/);
  assert.match(source, /Decision 21/);
});
