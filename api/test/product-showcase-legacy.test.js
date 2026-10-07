import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test, { after } from "node:test";
import { hashPassword } from "../src/auth/passwords.js";
import {
  sanitizeProductSchemaData,
  sharedCatalogProductSchema,
} from "../src/productSchema/schema.js";

const sharedSchema = sharedCatalogProductSchema();

test("sanitize preserves legacy faq showcase when preserveUnknownShowcaseSections is set", () => {
  const faq = { items: [{ q: "Q", a: "A" }] };
  const product = {
    id: "p1",
    slug: "p1",
    name: { en: "Demo", ar: "Demo" },
    customShowcase: { faq },
    image: "https://cdn.example/old.jpg",
  };
  const preserved = sanitizeProductSchemaData(product, sharedSchema, {
    preserveUnknownShowcaseSections: true,
  });
  assert.deepEqual(preserved.customShowcase.faq, faq);
  assert.equal(preserved.image, "https://cdn.example/old.jpg");
});

test("sanitize rejects unknown showcase sections by default (POST/explicit)", () => {
  assert.throws(
    () => sanitizeProductSchemaData({
      id: "p1",
      slug: "p1",
      customShowcase: { faq: { items: [] } },
    }, sharedSchema),
    /Unknown showcase section: faq/,
  );
  assert.throws(
    () => sanitizeProductSchemaData({
      id: "p1",
      slug: "p1",
      customShowcase: { faq: { items: [] } },
    }, sharedSchema, { preserveUnknownShowcaseSections: false }),
    /Unknown showcase section: faq/,
  );
});

const dataStoreDir = fs.mkdtempSync(path.join(os.tmpdir(), "product-showcase-legacy-"));
const now = "2026-09-09T00:00:00.000Z";
const password = "Test-password-123!";
const passwordHash = await hashPassword(password);

fs.writeFileSync(path.join(dataStoreDir, "store.json"), JSON.stringify({
  version: 2,
  companies: [
    {
      id: "kids-velvet",
      slug: "kids-velvet",
      name: "Kids Velvet",
      status: "active",
      settings: { language: "en", currency: "USD" },
    },
  ],
  users: [
    {
      id: "velvet-admin",
      name: "Velvet Admin",
      email: "admin@velvet.test",
      password: passwordHash,
      role: "company_admin",
      permissions: [],
      isActive: true,
      company_id: "kids-velvet",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "velvet-writer",
      name: "Velvet Writer",
      email: "writer@velvet.test",
      password: passwordHash,
      role: "employee",
      permissions: ["products.view", "products.create", "products.update", "product_media.manage"],
      isActive: true,
      company_id: "kids-velvet",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "velvet-viewer",
      name: "Velvet Viewer",
      email: "viewer@velvet.test",
      password: passwordHash,
      role: "employee",
      permissions: ["products.view"],
      isActive: true,
      company_id: "kids-velvet",
      createdAt: now,
      updatedAt: now,
    },
  ],
  memberships: [
    {
      id: "kids-velvet:velvet-admin",
      companyId: "kids-velvet",
      userId: "velvet-admin",
      role: "company_admin",
      status: "active",
      permissions: [],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "kids-velvet:velvet-writer",
      companyId: "kids-velvet",
      userId: "velvet-writer",
      role: "employee",
      status: "active",
      permissions: ["products.view", "products.create", "products.update", "product_media.manage"],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "kids-velvet:velvet-viewer",
      companyId: "kids-velvet",
      userId: "velvet-viewer",
      role: "employee",
      status: "active",
      permissions: ["products.view"],
      createdAt: now,
      updatedAt: now,
    },
  ],
  brands: [
    {
      id: "velvet-brand",
      company_id: "kids-velvet",
      slug: "velvet",
      name: { en: "VELVET", ar: "VELVET" },
      isActive: true,
      sortOrder: 1,
      createdAt: now,
      updatedAt: now,
    },
  ],
  categories: [],
  products: [
    {
      id: "legacy-faq-product",
      company_id: "kids-velvet",
      slug: "legacy-faq-product",
      name: { en: "Legacy FAQ Product", ar: "منتج قديم" },
      brandId: "velvet-brand",
      image: "https://cdn.example/old.jpg",
      customShowcase: {
        faq: { title: { en: "FAQ", ar: "أسئلة" }, items: [{ q: "Q1", a: "A1" }] },
      },
      isActive: true,
      visible: true,
      variants: [{ id: "v1", size: "Standard", price: 10, stock: 5 }],
      createdAt: now,
      updatedAt: now,
    },
  ],
  websiteTexts: [],
  websiteMedia: [],
  websiteMediaHiddenKeys: [],
  workSessions: [],
  domains: [],
  orders: [],
  companyProductSchemas: [],
}, null, 2));

process.env.DATA_STORE_DIR = dataStoreDir;
process.env.DATABASE_URL = "";
process.env.POSTGRES_URL = "";
process.env.SUPABASE_URL = "";
process.env.SUPABASE_SERVICE_ROLE_KEY = "";
process.env.JWT_SECRET = "product-showcase-legacy-test-secret";
process.env.NODE_ENV = "test";
process.env.ALLOW_LOCAL_CATALOG_STORAGE = "true";
process.env.UPLOADS_DIR = path.join(dataStoreDir, "uploads");
fs.mkdirSync(process.env.UPLOADS_DIR, { recursive: true });

const { app } = await import("../src/server.js");
const server = app.listen(0, "127.0.0.1");
await new Promise((resolve) => server.once("listening", resolve));
after(() => {
  server.close();
  fs.rmSync(dataStoreDir, { recursive: true, force: true });
});

const baseUrl = `http://127.0.0.1:${server.address().port}/api`;

async function request(pathname, { token, method = "GET", body } = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { response, body: await response.json().catch(() => null) };
}

async function login(email) {
  const result = await request("/auth/login", {
    method: "POST",
    body: { email, password },
  });
  assert.equal(result.response.status, 200, `login failed for ${email}: ${JSON.stringify(result.body)}`);
  return result.body.token;
}

test("legacy faq + image-only PUT succeeds and preserves FAQ", async () => {
  const token = await login("admin@velvet.test");
  const updated = await request("/products/legacy-faq-product", {
    token,
    method: "PUT",
    body: {
      image: "https://cdn.example/new.jpg",
      brandId: "velvet-brand",
    },
  });
  assert.equal(updated.response.status, 200, JSON.stringify(updated.body));
  assert.equal(updated.body.image, "https://cdn.example/new.jpg");
  assert.deepEqual(updated.body.customShowcase?.faq, {
    title: { en: "FAQ", ar: "أسئلة" },
    items: [{ q: "Q1", a: "A1" }],
  });
});

test("explicit unknown showcase PUT is rejected with 400", async () => {
  const token = await login("admin@velvet.test");
  const updated = await request("/products/legacy-faq-product", {
    token,
    method: "PUT",
    body: {
      brandId: "velvet-brand",
      customShowcase: { faq: { items: [{ q: "Nope", a: "Nope" }] } },
    },
  });
  assert.equal(updated.response.status, 400);
  assert.match(String(updated.body?.message || ""), /Unknown showcase section: faq/);
});

test("unknown showcase on POST is rejected with 400", async () => {
  const token = await login("admin@velvet.test");
  const created = await request("/products", {
    token,
    method: "POST",
    body: {
      id: "new-with-faq",
      slug: "new-with-faq",
      name: { en: "New", ar: "جديد" },
      brandId: "velvet-brand",
      customShowcase: { faq: { items: [] } },
    },
  });
  assert.equal(created.response.status, 400);
  assert.match(String(created.body?.message || ""), /Unknown showcase section: faq/);
});

test("employee with products.update can PUT; view-only employee cannot", async () => {
  const writerToken = await login("writer@velvet.test");
  const viewerToken = await login("viewer@velvet.test");

  const allowed = await request("/products/legacy-faq-product", {
    token: writerToken,
    method: "PUT",
    body: {
      brandId: "velvet-brand",
      image: "https://cdn.example/writer.jpg",
    },
  });
  assert.equal(allowed.response.status, 200, JSON.stringify(allowed.body));
  assert.equal(allowed.body.image, "https://cdn.example/writer.jpg");
  assert.ok(allowed.body.customShowcase?.faq);

  const denied = await request("/products/legacy-faq-product", {
    token: viewerToken,
    method: "PUT",
    body: {
      brandId: "velvet-brand",
      image: "https://cdn.example/viewer.jpg",
    },
  });
  assert.equal(denied.response.status, 403);

  const mediaDenied = await request("/uploads/products/legacy-faq-product", {
    token: viewerToken,
    method: "POST",
    body: {},
  });
  assert.equal(mediaDenied.response.status, 403);
});
