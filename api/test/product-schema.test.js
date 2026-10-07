import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { hashPassword } from "../src/auth/passwords.js";
import { defaultProductSchema } from "../src/productSchema/schema.js";

const dataStoreDir = fs.mkdtempSync(path.join(os.tmpdir(), "igroup-product-schema-"));
const now = "2026-08-30T00:00:00.000Z";
const password = "Schema-test-2026!";
const passwordHash = await hashPassword(password);
const userRows = [
  ["eb-admin", "admin@eb.test", "company_admin", []],
  ["eb-viewer", "viewer@eb.test", "employee", ["product_settings.view"]],
  ["eb-manager", "manager@eb.test", "employee", ["product_settings.manage"]],
  ["icare-admin", "admin@icare.test", "company_admin", []],
].map(([id, email, role, permissions]) => ({
  id, name: id, email, phone: "", password: passwordHash, role, permissions, isActive: true, createdAt: now, updatedAt: now,
}));
const membershipRows = [
  ["eb-chemical", "eb-admin", "company_admin", []],
  ["eb-chemical", "eb-viewer", "employee", ["product_settings.view"]],
  ["eb-chemical", "eb-manager", "employee", ["product_settings.manage"]],
  ["icare", "icare-admin", "company_admin", []],
].map(([companyId, userId, role, permissions]) => ({
  id: `${companyId}:${userId}`, companyId, userId, role, status: "active", permissions, createdAt: now, updatedAt: now,
}));

fs.writeFileSync(path.join(dataStoreDir, "store.json"), `${JSON.stringify({
  version: 2,
  companies: [
    { id: "eb-chemical", slug: "eb-chemical", name: "EB Chemical", status: "active", isDefault: true },
    {
      id: "icare",
      slug: "icare",
      name: "iCare",
      status: "active",
      settings: { adminModules: { product_settings: false } },
    },
  ],
  users: userRows,
  memberships: membershipRows,
  companyProductSchemas: [],
}, null, 2)}\n`, "utf8");

process.env.DATA_STORE_DIR = dataStoreDir;
process.env.DATABASE_URL = "";
process.env.POSTGRES_URL = "";
process.env.SUPABASE_URL = "";
process.env.SUPABASE_SERVICE_ROLE_KEY = "";
process.env.JWT_SECRET = "focused-product-schema-test-secret";
process.env.NODE_ENV = "test";
process.env.ALLOW_LOCAL_CATALOG_STORAGE = "true";
process.env.UPLOADS_DIR = path.join(dataStoreDir, "uploads");
fs.mkdirSync(process.env.UPLOADS_DIR, { recursive: true });

const { app } = await import("../src/server.js");
const server = app.listen(0, "127.0.0.1");
await new Promise((resolve) => server.once("listening", resolve));
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
  const text = await response.text();
  let parsed = null;
  try { parsed = text ? JSON.parse(text) : null; } catch { parsed = text || null; }
  return { response, body: parsed };
}

async function login(email) {
  const result = await request("/auth/login", { body: { email, password } });
  assert.equal(result.response.status, 200);
  return result.body.token;
}

test.after(() => {
  server.close();
  fs.rmSync(dataStoreDir, { recursive: true, force: true });
});

test("product schema admin API", async (t) => {
  const adminToken = await login("admin@eb.test");
  const viewerToken = await login("viewer@eb.test");
  const managerToken = await login("manager@eb.test");
  const icareToken = await login("admin@icare.test");

  await t.test("unauthenticated admin schema is rejected", async () => {
    assert.equal((await request("/admin/product-schema")).response.status, 401);
  });

  await t.test("viewer can read but cannot patch schema", async () => {
    const read = await request("/admin/product-schema", { token: viewerToken });
    assert.equal(read.response.status, 200);
    assert.equal(read.body.version, 1);
    assert.ok(Array.isArray(read.body.fields));
    assert.equal((await request("/admin/product-schema", {
      token: viewerToken,
      method: "PATCH",
      body: read.body,
    })).response.status, 403);
  });

  let savedSchema;
  await t.test("manager can patch whole schema and protected fields persist", async () => {
    const base = defaultProductSchema();
    const next = JSON.parse(JSON.stringify(base));
    const custom = next.fields.find((field) => field.key === "skinTypes");
    custom.enabled = false;
    custom.label.en = "Skin types updated";
    next.fields.push({
      key: "customBadge",
      tab: "custom_sections",
      label: { en: "Custom badge", ar: "شارة مخصصة" },
      type: "text",
      required: false,
      enabled: true,
      storefrontVisible: true,
      sortOrder: 900,
      options: [],
    });
    const patch = await request("/admin/product-schema", {
      token: managerToken,
      method: "PATCH",
      body: next,
    });
    assert.equal(patch.response.status, 200);
    savedSchema = patch.body;
    assert.equal(savedSchema.fields.find((field) => field.key === "skinTypes").enabled, false);
    assert.equal(savedSchema.fields.find((field) => field.key === "customBadge").label.en, "Custom badge");
    assert.equal(savedSchema.fields.find((field) => field.key === "nameEn").protected, true);
    assert.equal(savedSchema.fields.find((field) => field.key === "categoryId").enabled, true);
  });

  await t.test("reload returns persisted schema", async () => {
    const read = await request("/admin/product-schema", { token: adminToken });
    assert.equal(read.response.status, 200);
    assert.equal(read.body.fields.find((field) => field.key === "customBadge").label.en, "Custom badge");
    assert.equal(read.body.fields.find((field) => field.key === "skinTypes").label.en, "Skin types updated");
  });

  await t.test("manager can patch showcase nested fields and reload persists them", async () => {
    const base = savedSchema || defaultProductSchema();
    const next = JSON.parse(JSON.stringify(base));
    const section = next.showcaseSections.find((item) => item.key === "how_it_works");
    assert.ok(section);
    section.fields.push({
      key: "customHighlight",
      tab: "showcase",
      label: { en: "Custom highlight", ar: "تمييز مخصص" },
      type: "textarea",
      required: false,
      enabled: true,
      storefrontVisible: true,
      sortOrder: 15,
      options: [],
    });
    const patch = await request("/admin/product-schema", {
      token: managerToken,
      method: "PATCH",
      body: next,
    });
    assert.equal(patch.response.status, 200);
    const nested = patch.body.showcaseSections
      .find((item) => item.key === "how_it_works")
      .fields.find((field) => field.key === "customHighlight");
    assert.equal(nested.label.en, "Custom highlight");
    assert.equal(nested.tab, "showcase");
    const read = await request("/admin/product-schema", { token: adminToken });
    assert.equal(read.response.status, 200);
    const persisted = read.body.showcaseSections
      .find((item) => item.key === "how_it_works")
      .fields.find((field) => field.key === "customHighlight");
    assert.equal(persisted.label.ar, "تمييز مخصص");
    savedSchema = read.body;
  });

  await t.test("invalid schema patch is rejected", async () => {
    const bad = JSON.parse(JSON.stringify(savedSchema));
    bad.fields.push({
      key: "bad select",
      tab: "custom_sections",
      label: { en: "Bad", ar: "Bad" },
      type: "select",
      options: [],
    });
    assert.equal((await request("/admin/product-schema", {
      token: managerToken,
      method: "PATCH",
      body: bad,
    })).response.status, 400);
  });

  await t.test("module-disabled company receives 403", async () => {
    assert.equal((await request("/admin/product-schema", { token: icareToken })).response.status, 403);
  });

  await t.test("public schema endpoint remains available", async () => {
    const read = await request("/product-schema", { headers: { "X-Company-Id": "eb-chemical" } });
    assert.equal(read.response.status, 200);
    assert.equal(read.body.fields.find((field) => field.key === "customBadge").label.en, "Custom badge");
  });
});
