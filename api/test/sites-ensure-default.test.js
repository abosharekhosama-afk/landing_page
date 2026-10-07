import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { hashPassword } from "../src/auth/passwords.js";

const dataStoreDir = fs.mkdtempSync(path.join(os.tmpdir(), "igroup-sites-ensure-default-"));
const now = "2026-09-16T00:00:00.000Z";
const password = "Sites-ensure-2026!";
const passwordHash = await hashPassword(password);

const userRows = [
  ["alpha-admin", "admin@alpha.test", "company_admin", []],
  ["beta-admin", "admin@beta.test", "company_admin", []],
  ["gamma-admin", "admin@gamma.test", "company_admin", []],
  ["delta-admin", "admin@delta.test", "company_admin", []],
].map(([id, email, role, permissions]) => ({
  id, name: id, email, phone: "", password: passwordHash, role, permissions, isActive: true, createdAt: now, updatedAt: now,
}));

const membershipRows = [
  ["alpha", "alpha-admin", "company_admin", []],
  ["beta", "beta-admin", "company_admin", []],
  ["gamma", "gamma-admin", "company_admin", []],
  ["delta", "delta-admin", "company_admin", []],
].map(([companyId, userId, role, permissions]) => ({
  id: `${companyId}:${userId}`, companyId, userId, role, status: "active", permissions, createdAt: now, updatedAt: now,
}));

fs.writeFileSync(path.join(dataStoreDir, "store.json"), `${JSON.stringify({
  version: 2,
  companies: [
    {
      id: "alpha",
      slug: "alpha",
      name: "Alpha",
      status: "active",
      settings: {
        websiteConnection: { siteId: "shared-storefront", defaultLocale: "en" },
      },
    },
    {
      id: "beta",
      slug: "beta",
      name: "Beta",
      status: "active",
      settings: {
        websiteConnection: { siteId: "shared-storefront", defaultLocale: "en" },
      },
    },
    {
      id: "gamma",
      slug: "gamma",
      name: "Gamma",
      status: "active",
      settings: {},
    },
    {
      id: "delta",
      slug: "delta",
      name: "Delta",
      status: "active",
      settings: {
        websiteConnection: { siteId: "delta-legacy", defaultLocale: "en" },
      },
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
process.env.JWT_SECRET = "focused-sites-ensure-default-test-secret";
process.env.NODE_ENV = "test";
process.env.ALLOW_LOCAL_CATALOG_STORAGE = "true";
process.env.UPLOADS_DIR = path.join(dataStoreDir, "uploads");
fs.mkdirSync(process.env.UPLOADS_DIR, { recursive: true });

const { app } = await import("../src/server.js");
const { inMemoryModuleStore } = await import("../src/moduleRegistry.js");
const { companies, persistCompanyStore, tenantCompanySiteRepository } = await import("../src/data/store.js");

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

inMemoryModuleStore.set("alpha", websiteTextsModule);
inMemoryModuleStore.set("beta", websiteTextsModule);
inMemoryModuleStore.set("gamma", websiteTextsModule);
inMemoryModuleStore.set("delta", websiteTextsModule);

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

test("duplicate legacy websiteConnection.siteId across companies", async (t) => {
  const alphaToken = await login("admin@alpha.test");
  const betaToken = await login("admin@beta.test");

  let alphaSite;
  let betaSite;

  await t.test("alpha gets exactly one default site with a unique id and the shared slug", async () => {
    const result = await request("/admin/sites", { token: alphaToken });
    assert.equal(result.response.status, 200);
    assert.ok(Array.isArray(result.body.items));
    assert.equal(result.body.items.length, 1);
    alphaSite = result.body.items[0];
    assert.equal(alphaSite.companyId, "alpha");
    assert.equal(alphaSite.slug, "shared-storefront");
    assert.match(alphaSite.id, /^site-/);
  });

  await t.test("beta gets exactly one default site with a different id and the shared slug", async () => {
    const result = await request("/admin/sites", { token: betaToken });
    assert.equal(result.response.status, 200);
    assert.ok(Array.isArray(result.body.items));
    assert.equal(result.body.items.length, 1);
    betaSite = result.body.items[0];
    assert.equal(betaSite.companyId, "beta");
    assert.equal(betaSite.slug, "shared-storefront");
    assert.match(betaSite.id, /^site-/);
    assert.notEqual(betaSite.id, alphaSite.id);
  });

  await t.test("websiteConnection.siteId is not rewritten on either company", () => {
    const alpha = companies.find((c) => c.id === "alpha");
    const beta = companies.find((c) => c.id === "beta");
    assert.equal(alpha.settings.websiteConnection.siteId, "shared-storefront");
    assert.equal(beta.settings.websiteConnection.siteId, "shared-storefront");
  });

  await t.test("cross-tenant site access is 404", async () => {
    const alphaResult = await request(`/admin/sites/${betaSite.id}`, { token: alphaToken });
    assert.equal(alphaResult.response.status, 404);
    const betaResult = await request(`/admin/sites/${alphaSite.id}`, { token: betaToken });
    assert.equal(betaResult.response.status, 404);
  });
});

test("ensureDefaultForCompany rolls back and rethrows on persist failure", async (t) => {
  await t.test("persist failure rejects and leaves no in-memory site", async () => {
    await assert.rejects(
      () => tenantCompanySiteRepository.ensureDefaultForCompany("gamma", {
        persist: async () => { throw new Error("persist failed"); },
      }),
      /persist failed/,
    );
    assert.equal(tenantCompanySiteRepository.listByCompany("gamma").length, 0);
  });

  await t.test("a real persist succeeds and creates exactly one site", async () => {
    const created = await tenantCompanySiteRepository.ensureDefaultForCompany("gamma");
    assert.ok(created);
    assert.equal(tenantCompanySiteRepository.listByCompany("gamma").length, 1);
    assert.equal(created.slug, "gamma-storefront");
  });

  await t.test("a third call returns the existing site without duplicating", async () => {
    const again = await tenantCompanySiteRepository.ensureDefaultForCompany("gamma");
    const sites = tenantCompanySiteRepository.listByCompany("gamma");
    assert.equal(sites.length, 1);
    assert.equal(again.id, sites[0].id);
  });
});

function sqlBackfillWouldInsert(companyId) {
  return tenantCompanySiteRepository.listByCompany(companyId).length === 0;
}

function sqlShapedDefaultSite(company) {
  const legacySiteId = company.settings?.websiteConnection?.siteId || "";
  return {
    id: `${company.id}-${legacySiteId || "storefront"}`,
    slug: legacySiteId || `${company.id}-storefront`,
    name: company.name,
    status: "active",
    defaultLocale: company.settings?.websiteConnection?.defaultLocale || "en",
    settings: legacySiteId ? { legacyWebsiteConnectionSiteId: legacySiteId } : {},
  };
}

test("API lazy site first then SQL-shaped backfill does not duplicate", async () => {
  const token = await login("admin@alpha.test");
  const first = await request("/admin/sites", { token });
  assert.equal(first.response.status, 200);
  assert.equal(first.body.items.length, 1);
  const existingId = first.body.items[0].id;

  assert.equal(sqlBackfillWouldInsert("alpha"), false, "SQL backfill must skip companies that already have a site");

  const second = await request("/admin/sites", { token });
  assert.equal(second.response.status, 200);
  assert.equal(second.body.items.length, 1);
  assert.equal(second.body.items[0].id, existingId);
  assert.equal(companies.find((c) => c.id === "alpha").settings.websiteConnection.siteId, "shared-storefront");
});

test("SQL-shaped backfill first then API ensure/list does not duplicate", async () => {
  const token = await login("admin@delta.test");
  const company = companies.find((c) => c.id === "delta");
  const seeded = tenantCompanySiteRepository.createForCompany("delta", sqlShapedDefaultSite(company));
  assert.equal(seeded.id, "delta-delta-legacy");
  assert.equal(tenantCompanySiteRepository.listByCompany("delta").length, 1);

  const listed = await request("/admin/sites", { token });
  assert.equal(listed.response.status, 200);
  assert.equal(listed.body.items.length, 1);
  assert.equal(listed.body.items[0].id, seeded.id);
  assert.equal(listed.body.items[0].slug, "delta-legacy");

  const ensured = await tenantCompanySiteRepository.ensureDefaultForCompany("delta");
  assert.equal(ensured.id, seeded.id);
  assert.equal(tenantCompanySiteRepository.listByCompany("delta").length, 1);
  assert.equal(company.settings.websiteConnection.siteId, "delta-legacy");
});

test("migration 035 SQL backfill is skip-if-exists and does not rewrite websiteConnection", () => {
  const sql = fs.readFileSync(new URL("../supabase/migrations/035_company_sites.sql", import.meta.url), "utf8");
  assert.match(sql, /where not exists \(\s*select 1 from public\.company_sites s where s\.company_id = c\.id/i);
  assert.match(sql, /on conflict \(id\) do nothing/i);
  assert.doesNotMatch(sql, /update public\.companies/i);
});