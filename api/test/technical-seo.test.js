import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test, { after } from "node:test";
import { hashPassword } from "../src/auth/passwords.js";

const dataStoreDir = fs.mkdtempSync(path.join(os.tmpdir(), "technical-seo-test-"));
const passwordHash = await hashPassword("Technical-seo-123!");
const now = "2026-08-15T00:00:00.000Z";
fs.writeFileSync(path.join(dataStoreDir, "store.json"), JSON.stringify({
  version: 2,
  companies: [
    {
      id: "index-store",
      slug: "index-store",
      name: "Index Store",
      status: "active",
      domain: "",
      storefrontUrl: "https://index-store.example",
      settings: {
        currency: "USD",
        websiteConnection: { siteId: "index-store-storefront", storefrontBaseUrl: "https://index-store.example" },
        robotsIndexing: "index,follow",
        siteTitle: "Index Store",
        metaDescription: "A store that is indexed.",
      },
    },
    {
      id: "noindex-store",
      slug: "noindex-store",
      name: "Noindex Store",
      status: "active",
      domain: "",
      storefrontUrl: "https://noindex-store.example",
      settings: {
        currency: "USD",
        websiteConnection: { siteId: "noindex-store-storefront", storefrontBaseUrl: "https://noindex-store.example" },
        robotsIndexing: "noindex,nofollow",
      },
    },
    {
      id: "no-url-store",
      slug: "no-url-store",
      name: "No URL Store",
      status: "active",
      domain: "",
      settings: {
        currency: "USD",
        websiteConnection: { siteId: "no-url-store-storefront" },
      },
    },
    {
      id: "policy-store",
      slug: "policy-store",
      name: "Policy Store",
      status: "active",
      domain: "",
      storefrontUrl: "https://policy-store.example",
      settings: {
        currency: "USD",
        websiteConnection: { siteId: "policy-store-storefront", storefrontBaseUrl: "https://policy-store.example" },
        robotsIndexing: "index,follow",
        updatedAt: "2026-09-10T12:00:00.000Z",
      },
    },
  ],
  storePolicies: [
    { id: "terms-of-service", company_id: "policy-store", title: "Terms of Service", content: "Terms content.", is_active: true, display_order: 1 },
    { id: "privacy-policy", company_id: "policy-store", title: "Privacy Policy", content: "Privacy content.", is_active: true, display_order: 2 },
    { id: "inactive-policy", company_id: "policy-store", title: "Inactive", content: "Old.", is_active: false, display_order: 3 },
  ],
  domains: [
    { id: "idx-domain", company_id: "index-store", domain: "index-store.example", is_primary: true, is_active: true, is_verified: true, created_at: now, updated_at: now },
    { id: "noi-domain", company_id: "noindex-store", domain: "noindex-store.example", is_primary: true, is_active: true, is_verified: true, created_at: now, updated_at: now },
    { id: "pol-domain", company_id: "policy-store", domain: "policy-store.example", is_primary: true, is_active: true, is_verified: true, created_at: now, updated_at: now },
  ],
  users: [
    { id: "index-admin", email: "admin@index-store.test", name: "Index Admin", password: passwordHash, role: "company_admin", permissions: [], isActive: true, company_id: "index-store", createdAt: now, updatedAt: now },
  ],
  memberships: [
    { id: "index-store:index-admin", companyId: "index-store", userId: "index-admin", role: "company_admin", status: "active", permissions: [], createdAt: now, updatedAt: now },
  ],
  orders: [],
  products: [], categories: [], brands: [],
  websiteTexts: [], websiteMedia: [], websiteMediaHiddenKeys: [], workSessions: [],
}, null, 2));

process.env.DATA_STORE_DIR = dataStoreDir;
process.env.DATABASE_URL = "";
process.env.POSTGRES_URL = "";
process.env.SUPABASE_URL = "";
process.env.SUPABASE_SERVICE_ROLE_KEY = "";
process.env.JWT_SECRET = "technical-seo-test-secret";
process.env.NODE_ENV = "test";
process.env.UPLOADS_DIR = path.join(dataStoreDir, "uploads");
fs.mkdirSync(process.env.UPLOADS_DIR, { recursive: true });

const { app } = await import("../src/server.js");
const server = app.listen(0, "127.0.0.1");
await new Promise((resolve) => server.once("listening", resolve));
after(() => server.close());
const storefrontBaseUrl = `http://127.0.0.1:${server.address().port}/api/storefront`;
const apiBaseUrl = `http://127.0.0.1:${server.address().port}/api`;
const settingsBaseUrl = `http://127.0.0.1:${server.address().port}/api/company/settings`;

function storefrontRequest(pathname, { companyId = "index-store", siteId = "index-store-storefront", origin } = {}) {
  return fetch(`${storefrontBaseUrl}${pathname}`, {
    headers: {
      "X-Company-Id": companyId,
      "X-Site-Id": siteId,
      ...(origin ? { Origin: origin } : {}),
    },
  });
}

function settingsRequest(pathname, { token, method = "GET", body } = {}) {
  return fetch(`${settingsBaseUrl}${pathname}`, {
    method,
    headers: {
      "X-Company-Id": "index-store",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

async function login() {
  const res = await fetch(`${apiBaseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@index-store.test", password: "Technical-seo-123!" }),
  });
  assert.equal(res.status, 200);
  return (await res.json()).token;
}

// ──────────────────────────────────────────────────────────────────────────────
// robots.txt
// ──────────────────────────────────────────────────────────────────────────────

test("robots.txt returns text/plain for tenant with index policy and site URL", async () => {
  const res = await storefrontRequest("/robots.txt");
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type"), /text\/plain/);
  const text = await res.text();
  assert.match(text, /User-agent: \*/);
  assert.match(text, /Allow: \//);
  assert.match(text, /Sitemap: https:\/\/index-store\.example\/api\/storefront\/sitemap\.xml/);
});

test("robots.txt returns Disallow for tenant with noindex policy", async () => {
  const res = await storefrontRequest("/robots.txt", { companyId: "noindex-store", siteId: "noindex-store-storefront" });
  assert.equal(res.status, 200);
  const text = await res.text();
  assert.match(text, /User-agent: \*/);
  assert.match(text, /Disallow: \//);
  assert.ok(!text.includes("Sitemap:"), "noindex robots.txt must not expose Sitemap directive");
});

test("robots.txt returns 404 for tenant with no resolvable storefront", async () => {
  const res = await storefrontRequest("/robots.txt", { companyId: "no-url-store", siteId: "no-url-store-storefront" });
  assert.equal(res.status, 404);
});

// ──────────────────────────────────────────────────────────────────────────────
// sitemap.xml
// ──────────────────────────────────────────────────────────────────────────────

test("sitemap.xml returns valid XML with all real public storefront paths", async () => {
  const res = await storefrontRequest("/sitemap.xml");
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type"), /application\/xml/);
  const xml = await res.text();
  assert.match(xml, /<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);
  assert.match(xml, /<loc>https:\/\/index-store\.example\/<\/loc>/);
  assert.match(xml, /<loc>https:\/\/index-store\.example\/products<\/loc>/);
  assert.match(xml, /<loc>https:\/\/index-store\.example\/about<\/loc>/);
  assert.match(xml, /<loc>https:\/\/index-store\.example\/sustainability<\/loc>/);
  assert.match(xml, /<loc>https:\/\/index-store\.example\/how-it-works<\/loc>/);
  assert.match(xml, /<loc>https:\/\/index-store\.example\/follow-us<\/loc>/);
  assert.match(xml, /<loc>https:\/\/index-store\.example\/business-information<\/loc>/);
  assert.match(xml, /<\/urlset>/);
});

test("sitemap.xml includes active store policies as /policies/:id entries", async () => {
  const res = await storefrontRequest("/sitemap.xml", { companyId: "policy-store", siteId: "policy-store-storefront" });
  assert.equal(res.status, 200);
  const xml = await res.text();
  assert.match(xml, /<loc>https:\/\/policy-store\.example\/policies\/terms-of-service<\/loc>/);
  assert.match(xml, /<loc>https:\/\/policy-store\.example\/policies\/privacy-policy<\/loc>/);
  assert.ok(!xml.includes("inactive-policy"), "inactive policy must not appear in sitemap");
});

test("sitemap.xml returns 404 for tenant with no site URL", async () => {
  const res = await storefrontRequest("/sitemap.xml", { companyId: "no-url-store", siteId: "no-url-store-storefront" });
  assert.equal(res.status, 404);
});

// ──────────────────────────────────────────────────────────────────────────────
// Content endpoint: site.robotsIndexing and site.siteUrl fields
// ──────────────────────────────────────────────────────────────────────────────

test("storefront /content exposes site.robotsIndexing and site.siteUrl", async () => {
  const res = await storefrontRequest("/content?locale=en");
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.site.robotsIndexing, "index,follow");
  assert.match(body.site.siteUrl, /^https:\/\/index-store\.example/);
});

test("storefront /content exposes noindex robotsIndexing for noindex tenant", async () => {
  const res = await storefrontRequest("/content?locale=en", { companyId: "noindex-store", siteId: "noindex-store-storefront" });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.site.robotsIndexing, "noindex,nofollow");
});

// ──────────────────────────────────────────────────────────────────────────────
// Settings PATCH: robotsIndexing accept/reject
// ──────────────────────────────────────────────────────────────────────────────

test("settings PATCH accepts valid robotsIndexing values", async () => {
  const token = await login();
  const setRes = await settingsRequest("", { token, method: "PATCH", body: { robotsIndexing: "noindex,nofollow" } });
  assert.equal(setRes.status, 200);
  const verify = await settingsRequest("", { token });
  assert.equal(verify.status, 200);
  const body = await verify.json();
  assert.equal(body.robotsIndexing, "noindex,nofollow");

  // restore
  await settingsRequest("", { token, method: "PATCH", body: { robotsIndexing: "index,follow" } });
});

test("settings PATCH rejects invalid robotsIndexing value", async () => {
  const token = await login();
  const res = await settingsRequest("", { token, method: "PATCH", body: { robotsIndexing: "bogus" } });
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.ok(body.message || body.error, "error message present");
});
