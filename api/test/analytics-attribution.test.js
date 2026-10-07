import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test, { after } from "node:test";
import { hashPassword } from "../src/auth/passwords.js";
import {
  aggregateVisitorAnalytics,
  ATTRIBUTION_FIELDS,
  buildCampaignSummary,
  campaignKey,
  mergeAttribution,
  normalizeAttribution,
  referrerHostname,
  upsertVisitorSession,
} from "../src/analytics/visitorAnalytics.js";

const dayMs = 24 * 60 * 60 * 1000;
const FIXED_NOW = new Date("2026-09-01T12:00:00.000Z");
const recentIso = new Date(FIXED_NOW.getTime() - dayMs).toISOString();
const oldIso = new Date(FIXED_NOW.getTime() - 31 * dayMs).toISOString();

const ATTR_A = Object.freeze({
  utm_source: "ig",
  utm_medium: "social",
  utm_campaign: "launch",
  referrer: "news.site.test",
});

test("attribution input is whitelisted, capped, and referrers keep a hostname only", () => {
  const normalized = normalizeAttribution({
    utm_source: "  fb  ",
    utm_campaign: "x".repeat(400),
    utm_content: "",
    email: "person@example.com",
    phone: "0599000111",
    referrer: "https://News.Site.Test/article?email=person@example.com",
  });
  assert.equal(normalized.utm_source, "fb");
  assert.equal(normalized.utm_campaign.length, 200);
  assert.equal(Object.hasOwn(normalized, "utm_content"), false);
  assert.equal(Object.hasOwn(normalized, "email"), false, "PII fields must be dropped");
  assert.equal(Object.hasOwn(normalized, "phone"), false, "PII fields must be dropped");
  assert.equal(normalized.referrer, "news.site.test");

  assert.equal(referrerHostname("https://Partner.test/path?q=1"), "partner.test");
  assert.deepEqual(normalizeAttribution(null), {});
  assert.deepEqual(normalizeAttribution("utm_source=fb"), {});
  assert.deepEqual(normalizeAttribution(["utm_source"]), {});
});

test("campaign identity separates posts and ignores the referrer", () => {
  const base = { utm_source: "ig", utm_medium: "social", utm_campaign: "launch" };
  assert.equal(
    campaignKey({ ...base, referrer: "a.test" }),
    campaignKey({ ...base, referrer: "b.test" }),
    "referrer must not split one campaign into two rows",
  );
  assert.notEqual(
    campaignKey(base),
    campaignKey({ ...base, utm_content: "post_01" }),
    "each post must keep its own row",
  );
  assert.notEqual(campaignKey(base), campaignKey({}));
});

test("first-touch merge keeps entry values and only fills empty fields", () => {
  const merged = mergeAttribution(
    { utm_source: "ig", referrer: "news.site.test" },
    { utm_source: "fb", utm_campaign: "spring" },
  );
  assert.equal(merged.utm_source, "ig");
  assert.equal(merged.referrer, "news.site.test");
  assert.equal(merged.utm_campaign, "spring");
});

test("session upsert stores attribution once and later events never erase it", () => {
  let sessions = upsertVisitorSession([], {
    companyId: "demo",
    siteId: "store",
    sessionKey: "k1",
    eventType: "pageview",
    attribution: { utm_source: "fb", referrer: "https://Partner.test/path" },
    now: FIXED_NOW,
  });
  sessions = upsertVisitorSession(sessions, {
    companyId: "demo",
    siteId: "store",
    sessionKey: "k1",
    eventType: "add_to_cart",
    attribution: { utm_source: "ig", utm_campaign: "spring" },
    now: FIXED_NOW,
  });

  assert.equal(sessions.length, 1);
  assert.equal(sessions[0].attribution.utm_source, "fb");
  assert.equal(sessions[0].attribution.utm_campaign, "spring");
  assert.equal(sessions[0].attribution.referrer, "partner.test");
});

function campaignEvent(key, eventType, companyId = "demo", createdAt = recentIso, sessionKey = `s-${key}`) {
  return {
    id: `event-${key}`,
    company_id: companyId,
    siteId: "store",
    sessionKey,
    eventType,
    path: "",
    productId: "",
    createdAt,
  };
}

function orderRecord(id, overrides = {}) {
  return {
    id,
    company_id: "demo",
    createdAt: recentIso,
    status: "Awaiting Employee Review",
    total: 100,
    attribution: ATTR_A,
    customerUserId: "cust-1",
    customer: { name: "Customer", phone: "0599000111" },
    items: [],
    ...overrides,
  };
}

const unitSessions = [
  { id: "s1", company_id: "demo", siteId: "store", sessionKey: "s1", firstSeenAt: recentIso, attribution: ATTR_A },
  { id: "s2", company_id: "demo", siteId: "store", sessionKey: "s2", firstSeenAt: recentIso, attribution: {} },
  { id: "s3", company_id: "demo", siteId: "store", sessionKey: "s3", firstSeenAt: oldIso, attribution: ATTR_A },
  { id: "x1", company_id: "other", siteId: "store", sessionKey: "x1", firstSeenAt: recentIso, attribution: ATTR_A },
];

const unitEvents = [
  campaignEvent("e1", "product_view", "demo", recentIso, "s1"),
  campaignEvent("e2", "add_to_cart", "demo", recentIso, "s1"),
  campaignEvent("e3", "remove_from_cart", "demo", recentIso, "s1"),
  campaignEvent("e4", "initiate_checkout", "demo", recentIso, "s1"),
  campaignEvent("e5", "add_to_cart", "demo", oldIso, "s1"),
  campaignEvent("e6", "product_view", "demo", recentIso, "s2"),
  campaignEvent("e7", "pageview", "demo", recentIso, "s1"),
  campaignEvent("e8", "purchase", "demo", recentIso, "order:ORD-ATT-1"),
  campaignEvent("e9", "add_to_cart", "other", recentIso, "x1"),
];

const unitOrders = [
  orderRecord("ORD-A1", { total: 100, customerUserId: "cust-1" }),
  orderRecord("ORD-A2", { total: 50, status: "Refunded", customerUserId: "cust-2" }),
  orderRecord("ORD-A3", { total: 70, status: "Cancelled", customerUserId: "cust-3" }),
  orderRecord("ORD-A4", { total: 40, status: "Delivered", customerUserId: null, customer: { name: "Cash", phone: "" } }),
  orderRecord("ORD-A5", { total: 999, status: "Delivered", createdAt: oldIso }),
  orderRecord("ORD-X1", { total: 888, company_id: "other", status: "Delivered" }),
  orderRecord("ORD-NONE", { total: 30, status: "Delivered", attribution: {}, customerUserId: "cust-6" }),
  orderRecord("ORD-MAIL", {
    total: 20,
    status: "Delivered",
    attribution: { utm_source: "nl", utm_medium: "email", utm_campaign: "newsletter" },
    customerUserId: "cust-7",
  }),
];

test("campaign summary joins sessions, events, and backend-confirmed orders", () => {
  const demoSessions = unitSessions.filter((record) => record.company_id === "demo");
  const demoEvents = unitEvents.filter((record) => record.company_id === "demo");
  const demoOrders = unitOrders.filter((record) => record.company_id === "demo");
  const summary = buildCampaignSummary(demoSessions, demoEvents, demoOrders, FIXED_NOW);
  assert.equal(summary.range.days, 7);
  assert.equal(summary.truncated, false);
  assert.equal(summary.rows.length, 3, "only real campaigns and the no-campaign row may appear");

  const campaignA = summary.rows.find((row) => row.key === campaignKey(ATTR_A));
  assert.ok(campaignA, "the attributed campaign row must exist");
  assert.equal(campaignA.campaign, "launch");
  assert.equal(campaignA.source, "ig");
  assert.equal(campaignA.medium, "social");
  assert.equal(campaignA.sessions, 1, "only in-window sessions count");
  assert.equal(campaignA.productViews, 1);
  assert.equal(campaignA.addToCart, 1);
  assert.equal(campaignA.removeFromCart, 1);
  assert.equal(campaignA.checkoutStarted, 1);
  assert.equal(campaignA.orders, 4, "cancelled and refunded orders still happened");
  assert.equal(campaignA.purchases, 2, "cancelled and refunded orders are not purchases");
  assert.equal(campaignA.revenue, 140, "revenue only sums purchases");
  assert.equal(campaignA.returnedOrders, 1);
  assert.equal(campaignA.returnedValue, 50);
  assert.equal(
    campaignA.uniquePurchasingCustomers,
    null,
    "a purchase without account id or phone cannot be counted",
  );
  assert.equal(campaignA.conversionRate, 4, "orders divided by attributed visits");

  const noCampaign = summary.rows.find((row) => row.key === campaignKey({}));
  assert.ok(noCampaign, "visits and orders without campaign data stay visible");
  assert.equal(noCampaign.sessions, 1);
  assert.equal(noCampaign.productViews, 1);
  assert.equal(noCampaign.orders, 1);
  assert.equal(noCampaign.purchases, 1);
  assert.equal(noCampaign.revenue, 30);
  assert.equal(noCampaign.uniquePurchasingCustomers, 1);
  assert.equal(noCampaign.conversionRate, 1);

  const newsletter = summary.rows.find((row) => row.campaign === "newsletter");
  assert.ok(newsletter, "orders can be attributed even without a recorded session");
  assert.equal(newsletter.sessions, 0);
  assert.equal(newsletter.revenue, 20);
  assert.equal(newsletter.conversionRate, null, "no visits means no derivable rate");
  assert.equal(newsletter.uniquePurchasingCustomers, 1);
});

test("aggregate exposes campaigns and never leaks another tenant's rows", () => {
  const summary = aggregateVisitorAnalytics(unitSessions, unitEvents, {
    companyId: "demo",
    orders: unitOrders,
    now: FIXED_NOW,
  });
  const campaignA = summary.campaigns.rows.find((row) => row.key === campaignKey(ATTR_A));
  assert.ok(campaignA, "campaigns block must be part of the aggregate");
  assert.equal(campaignA.revenue, 140, "the other tenant's 888 order must not be counted");

  const other = aggregateVisitorAnalytics(unitSessions, unitEvents, {
    companyId: "other",
    orders: unitOrders,
    now: FIXED_NOW,
  });
  const otherA = other.campaigns.rows.find((row) => row.key === campaignKey(ATTR_A));
  assert.equal(otherA.revenue, 888, "each company only ever reads its own orders");
  assert.equal(otherA.sessions, 1);
});

// ---------------------------------------------------------------------------
// Route-level verification: ingest attribution, order attribution, access.
// ---------------------------------------------------------------------------

const dataStoreDir = fs.mkdtempSync(path.join(os.tmpdir(), "analytics-attribution-"));
const nowIso = new Date().toISOString();
const password = "Attribution-test-2026!";
const passwordHash = await hashPassword(password);
const oneDayAgo = new Date(Date.now() - dayMs).toISOString();
const thirtyOneDaysAgo = new Date(Date.now() - 31 * dayMs).toISOString();

const routeCampaign = { utm_source: "ig", utm_medium: "social", utm_campaign: "launch" };

function routeOrder(id, overrides = {}) {
  return {
    id,
    company_id: "attr-co",
    createdAt: oneDayAgo,
    status: "Awaiting Employee Review",
    total: 100,
    attribution: { ...routeCampaign, referrer: "news.site.test" },
    customerUserId: "cust-1",
    customer: { name: "Route Customer", phone: "0599000222" },
    items: [{ productId: "attr-product", productName: "Attr Product", quantity: 1, price: 100, lineTotal: 100 }],
    ...overrides,
  };
}

const seedEvents = [
  { id: "r-pv", company_id: "attr-co", siteId: "attr-store", sessionKey: "attr-s1", eventType: "product_view", path: "/products/seed", productId: "attr-product", createdAt: oneDayAgo },
  { id: "r-atc", company_id: "attr-co", siteId: "attr-store", sessionKey: "attr-s1", eventType: "add_to_cart", path: "/products/seed", productId: "attr-product", createdAt: oneDayAgo },
  { id: "r-ic", company_id: "attr-co", siteId: "attr-store", sessionKey: "attr-s1", eventType: "initiate_checkout", path: "/checkout", productId: "", createdAt: oneDayAgo },
  { id: "r-pv2", company_id: "attr-co", siteId: "attr-store", sessionKey: "attr-s2", eventType: "product_view", path: "/", productId: "", createdAt: oneDayAgo },
  { id: "x-atc", company_id: "other-co", siteId: "other-store", sessionKey: "other-s1", eventType: "add_to_cart", path: "/products/seed", productId: "attr-product", createdAt: oneDayAgo },
];

const seedSessions = [
  {
    id: "attr-s1",
    company_id: "attr-co",
    siteId: "attr-store",
    sessionKey: "attr-s1",
    visitorKey: "v-1",
    firstSeenAt: oneDayAgo,
    lastSeenAt: oneDayAgo,
    pageViews: 2,
    productViews: 2,
    isReturning: false,
    lastPath: "/products/seed",
    attribution: { ...routeCampaign, referrer: "news.site.test" },
  },
  {
    id: "attr-s2",
    company_id: "attr-co",
    siteId: "attr-store",
    sessionKey: "attr-s2",
    visitorKey: "v-2",
    firstSeenAt: oneDayAgo,
    lastSeenAt: oneDayAgo,
    pageViews: 1,
    productViews: 1,
    isReturning: false,
    lastPath: "/",
    attribution: {},
  },
  {
    id: "x-s1",
    company_id: "other-co",
    siteId: "other-store",
    sessionKey: "other-s1",
    visitorKey: "x-1",
    firstSeenAt: oneDayAgo,
    lastSeenAt: oneDayAgo,
    pageViews: 1,
    productViews: 1,
    isReturning: false,
    lastPath: "/products/seed",
    attribution: { ...routeCampaign, referrer: "news.site.test" },
  },
];

fs.writeFileSync(path.join(dataStoreDir, "store.json"), JSON.stringify({
  version: 2,
  companies: [
    {
      id: "attr-co",
      slug: "attr-co",
      name: "Attribution Co",
      status: "active",
      settings: {
        websiteConnection: {
          siteId: "attr-store",
          storefrontBaseUrl: "https://attr.test",
          defaultLocale: "en",
          supportedLocales: ["en"],
        },
      },
    },
    {
      id: "other-co",
      slug: "other-co",
      name: "Other Co",
      status: "active",
      settings: {
        websiteConnection: {
          siteId: "other-store",
          storefrontBaseUrl: "https://other.test",
          defaultLocale: "en",
          supportedLocales: ["en"],
        },
      },
    },
  ],
  domains: [
    { id: "attr-domain", company_id: "attr-co", domain: "attr.test", is_primary: true, is_active: true, is_verified: true, created_at: nowIso, updated_at: nowIso },
    { id: "other-domain", company_id: "other-co", domain: "other.test", is_primary: true, is_active: true, is_verified: true, created_at: nowIso, updated_at: nowIso },
  ],
  users: [
    { id: "attr-admin", name: "Attr Admin", email: "admin@attr.test", phone: "", password: passwordHash, role: "company_admin", permissions: [], isActive: true, createdAt: nowIso, updatedAt: nowIso },
    { id: "attr-reporter", name: "Attr Reporter", email: "reporter@attr.test", phone: "", password: passwordHash, role: "employee", permissions: [], isActive: true, createdAt: nowIso, updatedAt: nowIso },
    { id: "attr-plain", name: "Attr Plain", email: "plain@attr.test", phone: "", password: passwordHash, role: "employee", permissions: [], isActive: true, createdAt: nowIso, updatedAt: nowIso },
    { id: "other-admin", name: "Other Admin", email: "admin@other.test", phone: "", password: passwordHash, role: "company_admin", permissions: [], isActive: true, createdAt: nowIso, updatedAt: nowIso },
  ],
  memberships: [
    { id: "attr-co:attr-admin", companyId: "attr-co", userId: "attr-admin", role: "company_admin", status: "active", permissions: [], createdAt: nowIso, updatedAt: nowIso },
    { id: "attr-co:attr-reporter", companyId: "attr-co", userId: "attr-reporter", role: "employee", status: "active", permissions: ["reports.view"], createdAt: nowIso, updatedAt: nowIso },
    { id: "attr-co:attr-plain", companyId: "attr-co", userId: "attr-plain", role: "employee", status: "active", permissions: [], createdAt: nowIso, updatedAt: nowIso },
    { id: "other-co:other-admin", companyId: "other-co", userId: "other-admin", role: "company_admin", status: "active", permissions: [], createdAt: nowIso, updatedAt: nowIso },
  ],
  products: [
    {
      id: "attr-product",
      slug: "attr-product",
      sku: "ATTR-1",
      name: { en: "Attr Product" },
      company_id: "attr-co",
      isActive: true,
      visible: true,
      price: 100,
      stockQty: 100,
      sizes: [{ size: "Standard", price: 100 }],
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  ],
  orders: [
    routeOrder("ORD-ROUTE-1"),
    routeOrder("ORD-ROUTE-2", { total: 50, status: "Refunded", customerUserId: "cust-2" }),
    routeOrder("ORD-ROUTE-3", { total: 70, status: "Cancelled", customerUserId: "cust-3" }),
    routeOrder("ORD-ROUTE-4", { total: 40, status: "Delivered", customerUserId: null, customer: { name: "Cash", phone: "" } }),
    routeOrder("ORD-ROUTE-OLD", { status: "Delivered", createdAt: thirtyOneDaysAgo }),
    routeOrder("ORD-ROUTE-X", { company_id: "other-co", total: 888, status: "Delivered", customerUserId: "cust-x" }),
  ],
  deliveryZones: [],
  automaticDiscounts: [],
  visitorSessions: seedSessions,
  visitorEvents: seedEvents,
}, null, 2));

process.env.DATA_STORE_DIR = dataStoreDir;
process.env.DATABASE_URL = "";
process.env.POSTGRES_URL = "";
process.env.SUPABASE_URL = "";
process.env.SUPABASE_SERVICE_ROLE_KEY = "";
process.env.JWT_SECRET = "analytics-attribution-test-secret";
process.env.NODE_ENV = "test";
process.env.ALLOW_LOCAL_CATALOG_STORAGE = "true";
process.env.UPLOADS_DIR = path.join(dataStoreDir, "uploads");
fs.mkdirSync(process.env.UPLOADS_DIR, { recursive: true });

const { app } = await import("../src/server.js");
const { inMemoryModuleStore } = await import("../src/moduleRegistry.js");
for (const companyId of ["attr-co", "other-co"]) {
  inMemoryModuleStore.set(companyId, [{
    module_key: "settings.reports",
    enabled: true,
    active: true,
    allowed_roles: ["super_admin", "company_admin", "admin", "manager", "employee", "staff"],
    required_permissions: ["reports.view"],
    sort_order: 520,
  }]);
}
const server = app.listen(0, "127.0.0.1");
await new Promise((resolve) => server.once("listening", resolve));
after(() => {
  server.close();
  fs.rmSync(dataStoreDir, { recursive: true, force: true });
});

const baseUrl = `http://127.0.0.1:${server.address().port}/api`;

async function login(email) {
  const result = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  assert.equal(result.status, 200, `login failed for ${email}`);
  return (await result.json()).token;
}

async function visitors(token, companyId = "attr-co") {
  const response = await fetch(`${baseUrl}/admin/analytics/visitors`, {
    headers: { Authorization: `Bearer ${token}`, "X-Company-Id": companyId },
  });
  return { status: response.status, body: await response.json().catch(() => null) };
}

async function ingest(body, overrides = {}) {
  const response = await fetch(`${baseUrl}/storefront/analytics/visitor`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Company-Id": "attr-co",
      "X-Site-Id": "attr-store",
      Origin: "https://attr.test",
      ...overrides.headers,
    },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json().catch(() => null) };
}

test("reports.view reads campaign rows built from the company's own records", async () => {
  const token = await login("reporter@attr.test");
  const { status, body } = await visitors(token);
  assert.equal(status, 200);
  assert.ok(body.campaigns, "campaigns block must be present");
  assert.equal(body.campaigns.range.days, 7);

  const campaignA = body.campaigns.rows.find((row) => row.key === campaignKey({ ...routeCampaign }));
  assert.ok(campaignA, "the seeded campaign must appear");
  assert.equal(campaignA.sessions, 1);
  assert.equal(campaignA.productViews, 1);
  assert.equal(campaignA.addToCart, 1);
  assert.equal(campaignA.checkoutStarted, 1);
  assert.equal(campaignA.orders, 4);
  assert.equal(campaignA.purchases, 2);
  assert.equal(campaignA.revenue, 140, "another tenant's order must never leak in");
  assert.equal(campaignA.returnedOrders, 1);
  assert.equal(campaignA.returnedValue, 50);
  assert.equal(campaignA.uniquePurchasingCustomers, null);
  assert.equal(campaignA.conversionRate, 4);

  const otherToken = await login("admin@other.test");
  const other = await visitors(otherToken, "other-co");
  const otherA = other.body.campaigns.rows.find((row) => row.key === campaignKey({ ...routeCampaign }));
  assert.equal(otherA.revenue, 888);
  assert.equal(otherA.orders, 1);
});

test("analytics campaigns stay behind reports.view", async () => {
  const plainToken = await login("plain@attr.test");
  const plain = await visitors(plainToken);
  assert.equal(plain.status, 403);

  const anonymous = await fetch(`${baseUrl}/admin/analytics/visitors`);
  assert.equal(anonymous.status, 401);
});

test("ingest stores first-touch attribution and falls back to the Referer header", async () => {
  const first = await ingest({
    sessionKey: "client-attr",
    eventType: "add_to_cart",
    path: "/products/seed",
    productId: "attr-product",
    attribution: { utm_source: "fb", utm_campaign: "winter", referrer: "https://News.Site.Test/a" },
  });
  assert.equal(first.status, 201);

  const second = await ingest(
    { sessionKey: "client-attr", eventType: "initiate_checkout", path: "/checkout" },
    { headers: { Referer: "https://partner.test/landing?email=secret@example.com" } },
  );
  assert.equal(second.status, 201);

  const third = await ingest({
    sessionKey: "client-attr",
    eventType: "add_to_cart",
    path: "/products/seed",
    productId: "attr-product",
    attribution: { utm_source: "ig", utm_campaign: "spring" },
  });
  assert.equal(third.status, 201);

  const { visitorSessionRepository } = await import("../src/data/store.js");
  const session = visitorSessionRepository.getByCompany("attr-co")
    .find((record) => record.sessionKey === "client-attr");
  assert.ok(session, "the ingest must create the session");
  assert.equal(session.attribution.utm_source, "fb", "entry attribution wins");
  assert.equal(session.attribution.utm_campaign, "winter");
  assert.equal(session.attribution.referrer, "news.site.test", "entry referrer wins");
  assert.equal(
    Object.hasOwn(session.attribution, "utm_campaign") && session.attribution.utm_campaign === "spring",
    false,
    "a later navigation must not replace the campaign",
  );

  const otherTenant = visitorSessionRepository.getByCompany("other-co")
    .some((record) => record.sessionKey === "client-attr");
  assert.equal(otherTenant, false, "sessions stay company scoped");
});

test("order API records the session attribution on the confirmed order", async () => {
  const created = await fetch(`${baseUrl}/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Company-Id": "attr-co",
      Origin: "https://attr.test",
    },
    body: JSON.stringify({
      customer: { name: "Attr Customer", phone: "0599000333", city: "Ramallah", address: "Main Street", notes: "" },
      items: [{
        productId: "attr-product",
        productName: "Attr Product",
        selectedSize: "Standard",
        size: "Standard",
        quantity: 1,
        price: 100,
        lineTotal: 100,
      }],
      paymentMethod: "Cash on delivery",
      analyticsSessionKey: "client-attr",
    }),
  });
  const order = await created.json();
  assert.equal(created.status, 201, JSON.stringify(order));
  assert.equal(order.attribution.utm_source, "fb", "the stored session is authoritative");
  assert.equal(order.attribution.utm_campaign, "winter");
  assert.equal(order.attribution.referrer, "news.site.test");
  assert.equal(order.analyticsSessionKey, "client-attr");

  const fallback = await fetch(`${baseUrl}/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Company-Id": "attr-co",
      Origin: "https://attr.test",
    },
    body: JSON.stringify({
      customer: { name: "Fallback Customer", phone: "0599000444", city: "Ramallah", address: "Main Street", notes: "" },
      items: [{
        productId: "attr-product",
        productName: "Attr Product",
        selectedSize: "Standard",
        size: "Standard",
        quantity: 1,
        price: 100,
        lineTotal: 100,
      }],
      paymentMethod: "Cash on delivery",
      attribution: { utm_source: "nl", utm_medium: "email", utm_campaign: "newsletter" },
    }),
  });
  const fallbackOrder = await fallback.json();
  assert.equal(fallback.status, 201, JSON.stringify(fallbackOrder));
  assert.equal(fallbackOrder.attribution.utm_source, "nl", "payload attribution is a fallback");
  assert.equal(fallbackOrder.analyticsSessionKey, null);

  const token = await login("reporter@attr.test");
  const { body } = await visitors(token);
  const fbRow = body.campaigns.rows.find((row) => row.campaign === "winter");
  assert.ok(fbRow, "the confirmed order must appear under its campaign");
  assert.equal(fbRow.orders, 1);
  assert.equal(fbRow.purchases, 1);
  assert.equal(fbRow.revenue, 100);
  assert.equal(fbRow.conversionRate, 1, "one attributed visit produced one order");
});

test("migration 039 adds the session attribution column and nothing else", () => {
  const migrationsDir = path.join(import.meta.dirname, "../supabase/migrations");
  const sql = fs.readFileSync(path.join(migrationsDir, "039_visitor_sessions_attribution.sql"), "utf8");
  assert.match(sql, /\bbegin;/);
  assert.match(sql, /\bcommit;/);
  assert.match(sql, /add column if not exists attribution jsonb not null default '\{\}'::jsonb/);
  assert.match(sql, /NOT executed by the application/);
  assert.match(sql, /Production application requires separate explicit approval/);
  assert.equal(
    fs.existsSync(path.join(migrationsDir, "040_visitor_sessions_attribution.sql")),
    false,
    "no follow-up migration may be added",
  );
});
