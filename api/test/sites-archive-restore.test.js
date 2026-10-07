import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { hashPassword } from "../src/auth/passwords.js";

const dataStoreDir = fs.mkdtempSync(path.join(os.tmpdir(), "igroup-site-archive-"));
const now = "2026-09-16T00:00:00.000Z";
const password = "SiteArchive-test-2026!";
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
process.env.JWT_SECRET = "site-archive-restore-test-secret";
process.env.NODE_ENV = "test";
process.env.ALLOW_LOCAL_CATALOG_STORAGE = "true";
process.env.UPLOADS_DIR = path.join(dataStoreDir, "uploads");
fs.mkdirSync(process.env.UPLOADS_DIR, { recursive: true });

const { app } = await import("../src/server.js");
const { buildSiteContext, isArchivedSite, resolveSiteContext, SiteContextError } = await import(
  "../src/landingPlatform/siteContext.js"
);

const server = app.listen(0, "127.0.0.1");
await new Promise((resolve) => server.once("listening", resolve));
const baseUrl = `http://127.0.0.1:${server.address().port}/api`;

async function request(pathname, { token, body, method = body ? "POST" : "GET" } = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readPersistedSites() {
  const persisted = JSON.parse(fs.readFileSync(path.join(dataStoreDir, "store.json"), "utf8"));
  return Array.isArray(persisted.companySites) ? persisted.companySites : [];
}

function siteFixture(id, status, companyId = "icare") {
  return { id, companyId, slug: id, name: id, status, defaultLocale: "en", settings: {} };
}

test.after(() => {
  server.close();
  fs.rmSync(dataStoreDir, { recursive: true, force: true });
});


test("sites archive/restore API", async (t) => {
  const adminToken = await login("admin@icare.test");
  const editorToken = await login("editor@icare.test");
  const managerToken = await login("manager@icare.test");
  const noneToken = await login("none@icare.test");
  const otherToken = await login("admin@other.test");

  // Seed: one active site + one draft site (both created through the API).
  const activeCreated = await request("/admin/sites", {
    method: "POST",
    token: adminToken,
    body: { name: "Archive Target", slug: "archive-target", status: "active" },
  });
  assert.equal(activeCreated.response.status, 201);
  const activeSite = activeCreated.body;

  const draftCreated = await request("/admin/sites", {
    method: "POST",
    token: adminToken,
    body: { name: "Draft Target", slug: "draft-target", status: "draft" },
  });
  assert.equal(draftCreated.response.status, 201);
  const draftSite = draftCreated.body;

  await t.test("unauthenticated PATCH /admin/sites/:id returns 401", async () => {
    const result = await request(`/admin/sites/${activeSite.id}`, { method: "PATCH", body: { status: "archived" } });
    assert.equal(result.response.status, 401);
  });

  await t.test("employee without sites.manage is rejected with 403", async () => {
    const result = await request(`/admin/sites/${activeSite.id}`, { token: noneToken, method: "PATCH", body: { status: "archived" } });
    assert.equal(result.response.status, 403);
  });

  await t.test("editor with only site_editor.access is rejected with 403", async () => {
    const archiveAttempt = await request(`/admin/sites/${activeSite.id}`, { token: editorToken, method: "PATCH", body: { status: "archived" } });
    assert.equal(archiveAttempt.response.status, 403);
    const restoreAttempt = await request(`/admin/sites/${activeSite.id}`, { token: editorToken, method: "PATCH", body: { status: "active" } });
    assert.equal(restoreAttempt.response.status, 403);
  });

  await t.test("invalid status values are rejected with 400", async () => {
    const invalidBodies = [
      { status: "draft" },
      { status: "deleted" },
      { status: "" },
      { status: 123 },
      {},
      { status: "archived", name: "Renamed" },
      { status: "active", slug: "other-slug" },
      { status: "archived", defaultLocale: "ar" },
      { status: "archived", settings: { theme: "x" } },
    ];
    for (const body of invalidBodies) {
      const result = await request(`/admin/sites/${activeSite.id}`, { token: managerToken, method: "PATCH", body });
      assert.equal(result.response.status, 400, `expected 400 for body ${JSON.stringify(body)}`);
    }
    const noBody = await request(`/admin/sites/${activeSite.id}`, { token: managerToken, method: "PATCH" });
    assert.equal(noBody.response.status, 400);
    const unchanged = await request(`/admin/sites/${activeSite.id}`, { token: adminToken });
    assert.equal(unchanged.body.status, "active");
    assert.equal(unchanged.body.name, "Archive Target");
    assert.equal(unchanged.body.slug, "archive-target");
  });

  await t.test("site from another company returns 404 and unknown id returns 404", async () => {
    const crossCompany = await request(`/admin/sites/${activeSite.id}`, { token: otherToken, method: "PATCH", body: { status: "archived" } });
    assert.equal(crossCompany.response.status, 404);
    const unknown = await request("/admin/sites/site-does-not-exist", { token: adminToken, method: "PATCH", body: { status: "archived" } });
    assert.equal(unknown.response.status, 404);
    const check = await request(`/admin/sites/${activeSite.id}`, { token: adminToken });
    assert.equal(check.body.status, "active");
  });

  let archivedUpdatedAt;
  await t.test("manager with sites.manage can archive an active site", async () => {
    const before = await request(`/admin/sites/${activeSite.id}`, { token: adminToken });
    assert.equal(before.body.status, "active");
    await sleep(10);
    const result = await request(`/admin/sites/${activeSite.id}`, { token: managerToken, method: "PATCH", body: { status: "archived" } });
    assert.equal(result.response.status, 200);
    assert.equal(result.body.id, activeSite.id);
    assert.equal(result.body.status, "archived");
    assert.ok(result.body.updatedAt > before.body.updatedAt, "updatedAt must advance on archive");
    archivedUpdatedAt = result.body.updatedAt;
  });

  await t.test("archived site is still listed by GET /admin/sites", async () => {
    const result = await request("/admin/sites", { token: adminToken });
    assert.equal(result.response.status, 200);
    const listed = result.body.items.find((site) => site.id === activeSite.id);
    assert.ok(listed, "archived site must remain in the admin list");
    assert.equal(listed.status, "archived");
    const single = await request(`/admin/sites/${activeSite.id}`, { token: adminToken });
    assert.equal(single.response.status, 200);
    assert.equal(single.body.status, "archived");
  });

  await t.test("archived status is persisted in storage", async () => {
    const row = readPersistedSites().find((site) => site.id === activeSite.id);
    assert.ok(row, "site row must exist in store.json");
    assert.equal(row.status, "archived");
    assert.equal(row.updatedAt, archivedUpdatedAt);
  });

  await t.test("draft site can be archived", async () => {
    const result = await request(`/admin/sites/${draftSite.id}`, { token: adminToken, method: "PATCH", body: { status: "archived" } });
    assert.equal(result.response.status, 200);
    assert.equal(result.body.status, "archived");
    const row = readPersistedSites().find((site) => site.id === draftSite.id);
    assert.equal(row?.status, "archived");
  });

  await t.test("admin can restore an archived site back to active", async () => {
    await sleep(10);
    const result = await request(`/admin/sites/${activeSite.id}`, { token: adminToken, method: "PATCH", body: { status: "active" } });
    assert.equal(result.response.status, 200);
    assert.equal(result.body.status, "active");
    assert.ok(result.body.updatedAt > archivedUpdatedAt, "updatedAt must advance on restore");
    const row = readPersistedSites().find((site) => site.id === activeSite.id);
    assert.equal(row?.status, "active");
  });

  await t.test("restore without sites.manage is rejected with 403", async () => {
    const archived = await request(`/admin/sites/${draftSite.id}`, { token: adminToken, method: "PATCH", body: { status: "archived" } });
    assert.equal(archived.response.status, 200);
    const result = await request(`/admin/sites/${draftSite.id}`, { token: noneToken, method: "PATCH", body: { status: "active" } });
    assert.equal(result.response.status, 403);
    const restore = await request(`/admin/sites/${draftSite.id}`, { token: adminToken, method: "PATCH", body: { status: "active" } });
    assert.equal(restore.response.status, 200);
  });
});

test("site context contract rejects archived sites (SITE_ARCHIVED)", async (t) => {
  await t.test("isArchivedSite is true only for archived status", () => {
    assert.equal(isArchivedSite(siteFixture("s1", "archived")), true);
    assert.equal(isArchivedSite(siteFixture("s2", "active")), false);
    assert.equal(isArchivedSite(siteFixture("s3", "draft")), false);
    assert.equal(isArchivedSite(null), false);
  });

  await t.test("explicit siteId for an active site resolves normally", () => {
    const context = resolveSiteContext({
      companyId: "icare",
      siteId: "site-active",
      sites: [siteFixture("site-active", "active")],
      resolveMode: "none",
    });
    assert.equal(context.siteId, "site-active");
    assert.equal(context.status, "active");
    assert.equal(context.source, "explicit");
  });

  await t.test("explicit siteId for a draft site resolves (draft is manageable)", () => {
    const context = resolveSiteContext({
      companyId: "icare",
      siteId: "site-draft",
      sites: [siteFixture("site-draft", "draft")],
      resolveMode: "none",
    });
    assert.equal(context.siteId, "site-draft");
    assert.equal(context.status, "draft");
  });

  await t.test("explicit siteId for an archived site throws SITE_ARCHIVED", () => {
    assert.throws(
      () => resolveSiteContext({
        companyId: "icare",
        siteId: "site-archived",
        sites: [siteFixture("site-archived", "archived")],
        resolveMode: "none",
      }),
      (error) => error instanceof SiteContextError && error.code === "SITE_ARCHIVED",
    );
  });

  await t.test("buildSiteContext rejects an archived site", () => {
    assert.throws(
      () => buildSiteContext({ companyId: "icare", site: siteFixture("site-archived", "archived"), source: "explicit" }),
      (error) => error instanceof SiteContextError && error.code === "SITE_ARCHIVED",
    );
  });

  await t.test("single-site fallback never picks an archived site", () => {
    const context = resolveSiteContext({
      companyId: "icare",
      sites: [siteFixture("site-only-archived", "archived")],
      resolveMode: "single-site-fallback",
    });
    assert.equal(context.siteId, null);
    assert.equal(context.source, "none");
  });

  await t.test("single-site fallback still picks a non-archived single site", () => {
    const context = resolveSiteContext({
      companyId: "icare",
      sites: [siteFixture("site-only-active", "active")],
      resolveMode: "single-site-fallback",
    });
    assert.equal(context.siteId, "site-only-active");
    assert.equal(context.source, "single-site");
  });
});
