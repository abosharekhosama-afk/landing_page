import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { hashPassword } from "../src/auth/passwords.js";

const dataStoreDir = fs.mkdtempSync(path.join(os.tmpdir(), "kids-velvet-hierarchy-test-"));
const now = "2026-08-14T00:00:00.000Z";
const password = "Hierarchy-test-2026!";
const passwordHash = await hashPassword(password);

const users = [
  ["kids-admin", "kids-admin@test.local", "company_admin", "kids-velvet"],
  ["icare-admin", "icare-admin@test.local", "company_admin", "icare"],
].map(([id, email, role, companyId]) => ({
  id, name: id, email, password: passwordHash, role, permissions: [], isActive: true,
  company_id: companyId, createdAt: now, updatedAt: now,
}));

const memberships = [
  ["kids-velvet:kids-admin", "kids-velvet", "kids-admin", "company_admin"],
  ["icare:icare-admin", "icare", "icare-admin", "company_admin"],
].map(([id, companyId, userId, role]) => ({
  id, companyId, userId, role, status: "active", permissions: [], createdAt: now, updatedAt: now,
}));

fs.writeFileSync(path.join(dataStoreDir, "store.json"), JSON.stringify({
  version: 2,
  companies: [
    { id: "kids-velvet", slug: "kids-velvet", name: "i-play", status: "active", settings: { websiteConnection: { siteId: "kids-velvet-storefront", storefrontBaseUrl: "https://feature-preview.vercel.app", defaultLocale: "en", supportedLocales: ["en", "ar"] } } },
    { id: "icare", slug: "icare", name: "iCare", status: "active", settings: { language: "ar" } },
  ],
  users,
  memberships,
  brands: [
    { id: "velvet", company_id: "kids-velvet", slug: "velvet", name: "VELVET", isActive: true, createdAt: now, updatedAt: now },
    { id: "baby", company_id: "kids-velvet", slug: "baby", name: "VELVET BABY", isActive: true, createdAt: now, updatedAt: now },
    { id: "icare-brand", company_id: "icare", slug: "icare-brand", name: "iCare Brand", isActive: true, createdAt: now, updatedAt: now },
  ],
  categories: [
    { id: "main-toys", company_id: "kids-velvet", slug: "toys", name: { en: "Toys", ar: "ألعاب" }, brandId: "velvet", parentId: null, isActive: true, sortOrder: 1, createdAt: now, updatedAt: now },
    { id: "sub-toys", company_id: "kids-velvet", slug: "plush-toys", name: { en: "Plush", ar: "دمى" }, parentId: "main-toys", isActive: true, sortOrder: 1, createdAt: now, updatedAt: now },
    { id: "icare-flat", company_id: "icare", slug: "flat", name: { en: "Flat", ar: "مستو" }, parentId: null, isActive: true, sortOrder: 1, createdAt: now, updatedAt: now },
  ],
  products: [],
  websiteTexts: [],
  websiteMedia: [],
  websiteMediaHiddenKeys: [],
  orders: [],
}, null, 2));

process.env.DATA_STORE_DIR = dataStoreDir;
process.env.DATABASE_URL = "";
process.env.POSTGRES_URL = "";
process.env.SUPABASE_URL = "";
process.env.SUPABASE_SERVICE_ROLE_KEY = "";
process.env.JWT_SECRET = "kids-velvet-hierarchy-test-secret";
process.env.NODE_ENV = "test";
process.env.ALLOW_LOCAL_CATALOG_STORAGE = "true";
process.env.UPLOADS_DIR = path.join(dataStoreDir, "uploads");
fs.mkdirSync(process.env.UPLOADS_DIR, { recursive: true });

const { app } = await import("../src/server.js");
const server = app.listen(0, "127.0.0.1");
await new Promise((resolve) => server.once("listening", resolve));
test.after(() => {
  server.close();
  fs.rmSync(dataStoreDir, { recursive: true, force: true });
});
const baseUrl = `http://127.0.0.1:${server.address().port}/api`;

async function request(pathname, { token, body, headers = {}, method = body ? "POST" : "GET" } = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { response, body: await response.json().catch(() => null) };
}

async function login(email) {
  return request("/auth/login", { body: { email, password } });
}

function categoryPayload(overrides = {}) {
  return {
    slug: `slug-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    name: { en: "New Category", ar: "فئة جديدة" },
    isActive: true,
    ...overrides,
  };
}

test("Kids Velvet tenant-scoped category hierarchy", async (t) => {
  const kids = await login("kids-admin@test.local");
  assert.equal(kids.response.status, 200);
  const kidsToken = kids.body.token;

  await t.test("a Main Category (no parent) requires a tenant-scoped brandId", async () => {
    const result = await request("/categories", { token: kidsToken, body: categoryPayload() });
    assert.equal(result.response.status, 400);
    assert.match(result.body.message, /brandId is required for a Main Category/);
  });

  await t.test("a Main Category persists its own brandId", async () => {
    const result = await request("/categories", {
      token: kidsToken,
      body: categoryPayload({ brandId: "velvet", imageUrl: "https://cdn.example/toys.png", heroVideo: "https://cdn.example/toys.mp4" }),
    });
    assert.equal(result.response.status, 201);
    assert.equal(result.body.brandId, "velvet");
    assert.equal(result.body.imageUrl, "https://cdn.example/toys.png");
    assert.equal(result.body.heroVideo, "https://cdn.example/toys.mp4");
    assert.equal(result.body.parentId, null);
  });

  await t.test("a Subcategory inherits the Main Category parent brandId", async () => {
    const result = await request("/categories", {
      token: kidsToken,
      body: categoryPayload({ parentId: "main-toys" }),
    });
    assert.equal(result.response.status, 201);
    assert.equal(result.body.parentId, "main-toys");
    assert.equal(result.body.brandId, "velvet");
  });

  await t.test("a Subcategory cannot use another Subcategory as its parent", async () => {
    const result = await request("/categories", {
      token: kidsToken,
      body: categoryPayload({ parentId: "sub-toys" }),
    });
    assert.equal(result.response.status, 400);
    assert.match(result.body.message, /Parent category must be a Main Category/);
  });

  await t.test("a brandId owned by another tenant is rejected (tenant-scoped FK)", async () => {
    const result = await request("/categories", {
      token: kidsToken,
      body: categoryPayload({ brandId: "icare-brand" }),
    });
    assert.equal(result.response.status, 404);
    assert.match(result.body.message, /Brand not found/);
  });

  await t.test("updating a Main Category to a foreign tenant brand is rejected", async () => {
    const result = await request("/categories/main-toys", {
      token: kidsToken,
      method: "PATCH",
      body: { brandId: "icare-brand" },
    });
    assert.equal(result.response.status, 404);
    assert.match(result.body.message, /Brand not found/);
  });

  await t.test("iCare keeps the legacy flat category behavior (brandId optional)", async () => {
    const icare = await login("icare-admin@test.local");
    assert.equal(icare.response.status, 200);
    const result = await request("/categories", {
      token: icare.body.token,
      body: categoryPayload(),
    });
    assert.equal(result.response.status, 201);
    assert.equal(result.body.brandId, null);
  });
});