import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { hashPassword } from "../src/auth/passwords.js";

// Phase 1 My Sites — API coverage for the primaryDomain enrichment on the
// sites admin API (api/src/routes/sites.js).
//
// Companies are seeded WITH a `domain` so the in-memory domain registry
// resolves (store.js initializes the registry from company.domain when no
// top-level `domains` array is persisted). Domains remain company-scoped:
// the API never invents a site-scoped domain.

const dataStoreDir = fs.mkdtempSync(path.join(os.tmpdir(), "igroup-phase1-sites-"));
const now = "2026-09-22T00:00:00.000Z";
const password = "Phase1-sites-2026!";
const passwordHash = await hashPassword(password);

const userRows = [
  ["icare-admin", "admin@icare.test", "company_admin", []],
  ["icare-manager", "manager@icare.test", "employee", ["sites.manage"]],
  ["other-admin", "admin@other.test", "company_admin", []],
].map(([id, email, role, permissions]) => ({
  id, name: id, email, phone: "", password: passwordHash, role, permissions, isActive: true, createdAt: now, updatedAt: now,
}));

const membershipRows = [
  ["icare", "icare-admin", "company_admin", []],
  ["icare", "icare-manager", "employee", ["sites.manage"]],
  ["other-company", "other-admin", "company_admin", []],
].map(([companyId, userId, role, permissions]) => ({
  id: `${companyId}:${userId}`, companyId, userId, role, status: "active", permissions, createdAt: now, updatedAt: now,
}));

fs.writeFileSync(path.join(dataStoreDir, "store.json"), `${JSON.stringify({
  version: 2,
  companies: [
    {
      id: "icare",
      slug: "icare",
      name: "iCare",
      status: "active",
      domain: "icare.example.com",
      settings: {
        websiteConnection: { siteId: "icare-storefront", defaultLocale: "en" },
      },
    },
    {
      id: "other-company",
      slug: "other-company",
      name: "Other",
      status: "active",
      domain: "other.example.com",
      settings: {},
    },
  ],
  users: userRows,
  memberships: membershipRows,
  companySites: [],
  deliveryZones: [],
  orders: [],
}, null, 2)}\n`, "utf8");

process.env.DATA_STORE_DIR = dataStoreDir;
process.env.DATABASE_URL = "";
process.env.POSTGRES_URL = "";
process.env.SUPABASE_URL = "";
process.env.SUPABASE_SERVICE_ROLE_KEY = "";
process.env.JWT_SECRET = "focused-phase1-sites-test-secret";
process.env.NODE_ENV = "test";
process.env.ALLOW_LOCAL_CATALOG_STORAGE = "true";
process.env.UPLOADS_DIR = path.join(dataStoreDir, "uploads");
fs.mkdirSync(process.env.UPLOADS_DIR, { recursive: true });

const { app } = await import("../src/server.js");
const { inMemoryModuleStore } = await import("../src/moduleRegistry.js");

const websiteTextsModule = [
  {
    module_key: "storefront.website_texts",
    enabled: true,
    active: true,
    allowed_roles: ["super_admin", "company_admin", "admin", "manager", "employee", "staff"],
    required_permissions: ["website_texts.manage", "sites.manage", "site_editor.access"],
    sort_order: 230,
  },
];

inMemoryModuleStore.set("icare", websiteTextsModule);
inMemoryModuleStore.set("other-company", websiteTextsModule);

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
  return { response, body: await response.json().catch(() => null) };
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

test("Phase 1 My Sites: primaryDomain enrichment on list/get + cross-company isolation", async (t) => {
  const adminToken = await login("admin@icare.test");
  const managerToken = await login("manager@icare.test");
  const otherToken = await login("admin@other.test");

  await t.test("list includes primaryDomain resolved from the company domain registry", async () => {
    const result = await request("/admin/sites", { token: adminToken });
    assert.equal(result.response.status, 200);
    assert.ok(Array.isArray(result.body.items));
    assert.ok(result.body.items.length > 0, "expected at least the default backfill site");
    for (const site of result.body.items) {
      assert.equal(site.companyId, "icare");
      assert.equal(site.primaryDomain, "icare.example.com");
    }
  });

  await t.test("get by id includes primaryDomain", async () => {
    const list = await request("/admin/sites", { token: adminToken });
    const siteId = list.body.items[0].id;
    const result = await request(`/admin/sites/${siteId}`, { token: adminToken });
    assert.equal(result.response.status, 200);
    assert.equal(result.body.id, siteId);
    assert.equal(result.body.primaryDomain, "icare.example.com");
  });

  await t.test("create still works and returns primaryDomain", async () => {
    const result = await request("/admin/sites", {
      token: managerToken,
      body: { name: "Phase1 Site", slug: "phase1-site" },
    });
    assert.equal(result.response.status, 201);
    assert.equal(result.body.companyId, "icare");
    assert.equal(result.body.slug, "phase1-site");
    assert.equal(result.body.primaryDomain, "icare.example.com");
  });

  await t.test("cross-company isolation: other company sees only its own sites and domain", async () => {
    const result = await request("/admin/sites", { token: otherToken });
    assert.equal(result.response.status, 200);
    assert.ok(Array.isArray(result.body.items));
    assert.ok(result.body.items.length > 0, "expected at least the default backfill site");
    for (const site of result.body.items) {
      assert.equal(site.companyId, "other-company");
      assert.equal(site.primaryDomain, "other.example.com");
    }
  });

  await t.test("cross-company isolation: other company cannot read an icare site by id", async () => {
    const list = await request("/admin/sites", { token: adminToken });
    const icareSiteId = list.body.items[0].id;
    const result = await request(`/admin/sites/${icareSiteId}`, { token: otherToken });
    assert.equal(result.response.status, 404);
  });
});