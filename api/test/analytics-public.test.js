import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test, { after } from "node:test";

const dataStoreDir = fs.mkdtempSync(path.join(os.tmpdir(), "analytics-public-test-"));
const now = "2026-09-01T10:00:00.000Z";

fs.writeFileSync(path.join(dataStoreDir, "store.json"), JSON.stringify({
  version: 2,
  companies: [
    {
      id: "tenant-a",
      slug: "tenant-a",
      name: "Tenant A",
      status: "active",
      settings: {
        websiteConnection: {
          siteId: "tenant-a-storefront",
          storefrontBaseUrl: "https://tenant-a.example",
          defaultLocale: "en",
          supportedLocales: ["en", "ar"],
        },
      },
    },
    {
      id: "tenant-b",
      slug: "tenant-b",
      name: "Tenant B",
      status: "active",
      settings: {
        websiteConnection: {
          siteId: "tenant-b-storefront",
          storefrontBaseUrl: "https://tenant-b.example",
          defaultLocale: "en",
          supportedLocales: ["en"],
        },
      },
    },
  ],
  domains: [
    { id: "a-domain", company_id: "tenant-a", domain: "tenant-a.example", is_primary: true, is_active: true, is_verified: true, created_at: now, updated_at: now },
    { id: "b-domain", company_id: "tenant-b", domain: "tenant-b.example", is_primary: true, is_active: true, is_verified: true, created_at: now, updated_at: now },
  ],
  users: [],
  memberships: [],
  orders: [],
  products: [
    { id: "p1", company_id: "tenant-a", slug: "lego-set", name: { en: "Lego Set", ar: "ليجو" }, price: 10, isActive: true, visible: true, stockQty: 5 },
    { id: "p2", company_id: "tenant-b", slug: "other-product", name: { en: "Other", ar: "آخر" }, price: 5, isActive: true, visible: true, stockQty: 2 },
  ],
  searchRedirects: [
    {
      id: "redirect-a",
      company_id: "tenant-a",
      inputTermNormalized: "ليجو",
      inputTermDisplay: "ليجو",
      targetTermNormalized: "lego",
      targetTermDisplay: "lego",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "redirect-inactive",
      company_id: "tenant-a",
      inputTermNormalized: "old",
      inputTermDisplay: "old",
      targetTermNormalized: "new",
      targetTermDisplay: "new",
      isActive: false,
      createdAt: now,
      updatedAt: now,
    },
  ],
  categories: [],
  brands: [],
  websiteTexts: [],
  websiteMedia: [],
  websiteMediaHiddenKeys: [],
  workSessions: [],
}, null, 2));

process.env.DATA_STORE_DIR = dataStoreDir;
process.env.DATABASE_URL = "";
process.env.POSTGRES_URL = "";
process.env.SUPABASE_URL = "";
process.env.SUPABASE_SERVICE_ROLE_KEY = "";
process.env.JWT_SECRET = "analytics-public-test-secret";
process.env.NODE_ENV = "test";
process.env.UPLOADS_DIR = path.join(dataStoreDir, "uploads");
fs.mkdirSync(process.env.UPLOADS_DIR, { recursive: true });

const { app } = await import("../src/server.js");
const server = app.listen(0, "127.0.0.1");
await new Promise((resolve) => server.once("listening", resolve));
after(() => server.close());

const baseUrl = `http://127.0.0.1:${server.address().port}/api/storefront/analytics`;

async function post(pathname, {
  companyId = "tenant-a",
  siteId = "tenant-a-storefront",
  origin = "https://tenant-a.example",
  body = {},
} = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Company-Id": companyId,
      "X-Site-Id": siteId,
      Origin: origin,
    },
    body: JSON.stringify(body),
  });
  return { response, body: await response.json().catch(() => null) };
}

test("search analytics returns original and resolved terms without redirect", async () => {
  const { response, body } = await post("/search", { body: { term: "lego set" } });
  assert.equal(response.status, 201);
  assert.equal(body.originalTerm, "lego set");
  assert.equal(body.term, "lego set");
  assert.equal(body.resolvedTerm, "lego set");
  assert.equal(body.redirected, false);
  assert.ok(body.resultsCount >= 1);
});

test("search analytics applies active redirect and exposes contract fields", async () => {
  const { response, body } = await post("/search", { body: { term: "ليجو" } });
  assert.equal(response.status, 201);
  assert.equal(body.originalTerm, "ليجو");
  assert.equal(body.term, "lego");
  assert.equal(body.resolvedTerm, "lego");
  assert.equal(body.redirected, true);
  assert.ok(body.resultsCount >= 1);
});

test("inactive redirect is ignored by public search contract", async () => {
  const { response, body } = await post("/search", { body: { term: "old" } });
  assert.equal(response.status, 201);
  assert.equal(body.originalTerm, "old");
  assert.equal(body.term, "old");
  assert.equal(body.redirected, false);
});

test("search analytics requires site context", async () => {
  const missingSite = await post("/search", { siteId: "wrong-site", body: { term: "lego" } });
  assert.equal(missingSite.response.status, 404);
});

test("search analytics isolates companies", async () => {
  const otherTenant = await post("/search", {
    companyId: "tenant-b",
    siteId: "tenant-b-storefront",
    origin: "https://tenant-b.example",
    body: { term: "ليجو" },
  });
  assert.equal(otherTenant.response.status, 201);
  assert.equal(otherTenant.body.redirected, false);
  assert.equal(otherTenant.body.term, "ليجو");
});

test("visitor ingestion requires site context and rejects admin paths", async () => {
  const missingSite = await post("/visitor", { siteId: "", body: { sessionKey: "s1", path: "/" } });
  assert.equal(missingSite.response.status, 404);

  const adminPath = await post("/visitor", { body: { sessionKey: "s1", path: "/admin/dashboard" } });
  assert.equal(adminPath.response.status, 400);
  assert.match(adminPath.body.message, /admin|cpanel/i);
});

test("visitor heartbeat updates live window without corrupting counts on duplicates", async () => {
  const sessionKey = "session-live-1";
  const first = await post("/visitor", {
    body: { sessionKey, eventType: "pageview", path: "/products" },
  });
  assert.equal(first.response.status, 201);

  const heartbeat = await post("/visitor", {
    body: { sessionKey, eventType: "heartbeat", path: "/products" },
  });
  assert.equal(heartbeat.response.status, 201);

  const { searchEventRepository, visitorSessionRepository } = await import("../src/data/store.js");
  const sessions = visitorSessionRepository.getByCompany("tenant-a");
  const session = sessions.find((entry) => entry.sessionKey === sessionKey);
  assert.ok(session);
  assert.equal(session.pageViews, 1);
  assert.equal(session.productViews, 0);
});

test("visitor without visitorKey does not mark returning classification", async () => {
  const { response } = await post("/visitor", {
    body: { sessionKey: "anon-session", eventType: "pageview", path: "/shop" },
  });
  assert.equal(response.status, 201);
  const { visitorSessionRepository } = await import("../src/data/store.js");
  const session = visitorSessionRepository.getByCompany("tenant-a").find((entry) => entry.sessionKey === "anon-session");
  assert.equal(session.isReturning, false);
  assert.equal(session.visitorKey, "");
});
