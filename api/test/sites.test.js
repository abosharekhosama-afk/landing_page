import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { hashPassword } from "../src/auth/passwords.js";

const dataStoreDir = fs.mkdtempSync(path.join(os.tmpdir(), "igroup-sites-"));
const now = "2026-09-16T00:00:00.000Z";
const password = "Sites-test-2026!";
const passwordHash = await hashPassword(password);

const userRows = [
  ["icare-admin", "admin@icare.test", "company_admin", []],
  ["icare-editor", "editor@icare.test", "employee", ["site_editor.access"]],
  ["icare-manager", "manager@icare.test", "employee", ["sites.manage"]],
  ["icare-none", "none@icare.test", "employee", []],
  ["other-admin", "admin@other.test", "company_admin", []],
].map(([id, email, role, permissions]) => ({
  id, name: id, email, phone: "", password: passwordHash, role, permissions, isActive: true, createdAt: now, updatedAt: now,
}));

const membershipRows = [
  ["icare", "icare-admin", "company_admin", []],
  ["icare", "icare-editor", "employee", ["site_editor.access"]],
  ["icare", "icare-manager", "employee", ["sites.manage"]],
  ["icare", "icare-none", "employee", []],
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
      settings: {
        websiteConnection: { siteId: "icare-storefront", defaultLocale: "en" },
      },
    },
    {
      id: "other-company",
      slug: "other-company",
      name: "Other",
      status: "active",
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
process.env.JWT_SECRET = "focused-sites-test-secret";
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

test("sites admin API", async (t) => {
  const adminToken = await login("admin@icare.test");
  const editorToken = await login("editor@icare.test");
  const managerToken = await login("manager@icare.test");
  const noneToken = await login("none@icare.test");
  const otherToken = await login("admin@other.test");

  // Case 1: unauthenticated access is rejected
  await t.test("unauthenticated GET /admin/sites returns 401", async () => {
    assert.equal((await request("/admin/sites")).response.status, 401);
  });

  // Case 2: icare-none (no perms) list returns 403
  await t.test("employee with no permissions is rejected with 403", async () => {
    assert.equal((await request("/admin/sites", { token: noneToken })).response.status, 403);
  });

  // Case 3: icare-editor list returns 200 with default backfill site
  let icareSiteId;
  await t.test("editor with site_editor.access can list sites and sees default backfill", async () => {
    const result = await request("/admin/sites", { token: editorToken });
    assert.equal(result.response.status, 200);
    assert.ok(Array.isArray(result.body.items));
    assert.ok(result.body.items.length > 0);
    const defaultSite = result.body.items.find(
      (s) => s.id === "icare-storefront" || s.slug === "icare-storefront",
    );
    assert.ok(defaultSite, "expected a default backfill site with id or slug icare-storefront");
    assert.equal(defaultSite.companyId, "icare");
    icareSiteId = defaultSite.id;
  });

  // Case 4: icare-editor create returns 403
  await t.test("editor with site_editor.access cannot create a site", async () => {
    const result = await request("/admin/sites", {
      token: editorToken,
      body: { name: "Second Site", slug: "second-site" },
    });
    assert.equal(result.response.status, 403);
  });

  // Case 5: icare-manager create returns 201
  let createdSiteId;
  await t.test("manager with sites.manage can create a site", async () => {
    const result = await request("/admin/sites", {
      token: managerToken,
      body: { name: "Second Site", slug: "second-site" },
    });
    assert.equal(result.response.status, 201);
    assert.equal(result.body.companyId, "icare");
    assert.equal(result.body.slug, "second-site");
    createdSiteId = result.body.id;
  });

  // Case 6: duplicate slug returns 409
  await t.test("duplicate slug is rejected with 409", async () => {
    const result = await request("/admin/sites", {
      token: adminToken,
      body: { name: "Duplicate Site", slug: "second-site" },
    });
    assert.equal(result.response.status, 409);
  });

  // Case 7: missing name returns 400
  await t.test("create with missing name returns 400", async () => {
    const result = await request("/admin/sites", {
      token: adminToken,
      body: { slug: "no-name-site" },
    });
    assert.equal(result.response.status, 400);
  });

  // Case 8: GET /admin/sites/:id for created site returns 200
  await t.test("GET site by id returns 200 for created site", async () => {
    const result = await request(`/admin/sites/${createdSiteId}`, { token: adminToken });
    assert.equal(result.response.status, 200);
    assert.equal(result.body.id, createdSiteId);
    assert.equal(result.body.companyId, "icare");
  });

  // Case 9: other-admin GET that icare site id returns 404
  await t.test("other company cannot see icare site by id", async () => {
    const result = await request(`/admin/sites/${createdSiteId}`, { token: otherToken });
    assert.equal(result.response.status, 404);
  });

  // Case 10: other-admin list items must not include icare site ids
  await t.test("other company list does not include icare site ids", async () => {
    const result = await request("/admin/sites", { token: otherToken });
    assert.equal(result.response.status, 200);
    assert.ok(Array.isArray(result.body.items));
    const hasIcareSite = result.body.items.some((s) => s.id === createdSiteId || s.id === icareSiteId);
    assert.equal(hasIcareSite, false, "other company list should not include icare site ids");
  });

  // Case 11: GET unknown id as icare-admin returns 404
  await t.test("GET unknown site id returns 404", async () => {
    const result = await request("/admin/sites/site-nonexistent-id", { token: adminToken });
    assert.equal(result.response.status, 404);
  });
});
