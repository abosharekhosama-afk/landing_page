import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test, { after } from "node:test";
import { hashPassword } from "../src/auth/passwords.js";
import { aggregateVisitorAnalytics, FUNNEL_EVENT_TYPES, VISITOR_EVENT_TYPES } from "../src/analytics/visitorAnalytics.js";

const dayMs = 24 * 60 * 60 * 1000;
const FIXED_NOW = new Date("2026-09-01T12:00:00.000Z");

function funnelEvent({ key, eventType, companyId = "demo", siteId = "store", createdAt, sessionKey = `s-${key}` }) {
  return {
    id: `event-${key}`,
    company_id: companyId,
    siteId,
    sessionKey,
    eventType,
    path: "",
    productId: "",
    createdAt,
  };
}

const unitEvents = [
  funnelEvent({ key: "pv1", eventType: "product_view", createdAt: "2026-08-31T10:00:00.000Z" }),
  funnelEvent({ key: "pv2", eventType: "product_view", createdAt: "2026-08-31T11:00:00.000Z" }),
  funnelEvent({ key: "atc1", eventType: "add_to_cart", createdAt: "2026-08-31T11:05:00.000Z" }),
  funnelEvent({ key: "atc2", eventType: "add_to_cart", createdAt: "2026-08-31T12:00:00.000Z" }),
  funnelEvent({ key: "rfc1", eventType: "remove_from_cart", createdAt: "2026-08-31T12:10:00.000Z" }),
  funnelEvent({ key: "ic1", eventType: "initiate_checkout", createdAt: "2026-08-31T13:00:00.000Z" }),
  funnelEvent({ key: "buy1", eventType: "purchase", sessionKey: "order:ORD-1", createdAt: "2026-08-31T13:05:00.000Z" }),
  funnelEvent({ key: "old", eventType: "add_to_cart", createdAt: "2026-07-01T10:00:00.000Z" }),
  funnelEvent({ key: "other", eventType: "add_to_cart", companyId: "other", createdAt: "2026-08-31T10:00:00.000Z" }),
  funnelEvent({ key: "other-site", eventType: "purchase", siteId: "other-store", sessionKey: "order:ORD-2", createdAt: "2026-08-31T10:00:00.000Z" }),
];

test("funnel summary counts only in-window, tenant and site scoped events", () => {
  const summary = aggregateVisitorAnalytics([], unitEvents, { companyId: "demo", siteId: "store", now: FIXED_NOW });
  assert.equal(summary.funnel.productViews, 2);
  assert.equal(summary.funnel.addToCart, 2);
  assert.equal(summary.funnel.removeFromCart, 1);
  assert.equal(summary.funnel.checkoutStarted, 1);
  assert.equal(summary.funnel.purchases, 1);
  assert.equal(summary.funnel.range.days, 7);
});

test("funnel rates are derived from real counts and stay null without a denominator", () => {
  const summary = aggregateVisitorAnalytics([], unitEvents, { companyId: "demo", siteId: "store", now: FIXED_NOW });
  assert.equal(summary.funnel.addToCartRate, 1);
  assert.equal(summary.funnel.checkoutRate, 0.5);
  assert.equal(summary.funnel.purchaseConversionRate, 1);

  const empty = aggregateVisitorAnalytics([], [], { companyId: "demo", siteId: "store", now: FIXED_NOW });
  assert.equal(empty.funnel.productViews, 0);
  assert.equal(empty.funnel.addToCart, 0);
  assert.equal(empty.funnel.addToCartRate, null);
  assert.equal(empty.funnel.checkoutRate, null);
  assert.equal(empty.funnel.purchaseConversionRate, null);
});

// ---------------------------------------------------------------------------
// Route-level verification: ingestion contract, reports.view access, orders.
// ---------------------------------------------------------------------------

const dataStoreDir = fs.mkdtempSync(path.join(os.tmpdir(), "analytics-funnel-route-"));
const nowIso = new Date().toISOString();
const password = "Funnel-test-2026!";
const passwordHash = await hashPassword(password);
const oneDayAgo = new Date(Date.now() - dayMs).toISOString();
const thirtyOneDaysAgo = new Date(Date.now() - 31 * dayMs).toISOString();

const seedEvents = [
  { id: "f-pv1", company_id: "funnel-co", siteId: "funnel-store", sessionKey: "route-s1", eventType: "product_view", path: "/products/x", productId: "p1", createdAt: oneDayAgo },
  { id: "f-pv2", company_id: "funnel-co", siteId: "funnel-store", sessionKey: "route-s1", eventType: "product_view", path: "/products/y", productId: "p2", createdAt: oneDayAgo },
  { id: "f-atc", company_id: "funnel-co", siteId: "funnel-store", sessionKey: "route-s1", eventType: "add_to_cart", path: "/products/x", productId: "p1", createdAt: oneDayAgo },
  { id: "f-ic", company_id: "funnel-co", siteId: "funnel-store", sessionKey: "route-s1", eventType: "initiate_checkout", path: "/checkout", productId: "", createdAt: oneDayAgo },
  { id: "f-buy", company_id: "funnel-co", siteId: "funnel-store", sessionKey: "order:ORD-SEED", eventType: "purchase", path: "", productId: "", createdAt: oneDayAgo },
  { id: "f-old", company_id: "funnel-co", siteId: "funnel-store", sessionKey: "route-s1", eventType: "add_to_cart", path: "/products/z", productId: "p3", createdAt: thirtyOneDaysAgo },
  { id: "x-atc", company_id: "other-co", siteId: "other-store", sessionKey: "other-s1", eventType: "add_to_cart", path: "/products/x", productId: "op1", createdAt: oneDayAgo },
];

const seedSessions = [
  {
    id: "route-s1",
    company_id: "funnel-co",
    siteId: "funnel-store",
    sessionKey: "route-s1",
    visitorKey: "v-1",
    firstSeenAt: oneDayAgo,
    lastSeenAt: oneDayAgo,
    pageViews: 2,
    productViews: 2,
    isReturning: false,
    lastPath: "/products/x",
  },
];

fs.writeFileSync(path.join(dataStoreDir, "store.json"), JSON.stringify({
  version: 2,
  companies: [
    {
      id: "funnel-co",
      slug: "funnel-co",
      name: "Funnel Co",
      status: "active",
      settings: {
        websiteConnection: {
          siteId: "funnel-store",
          storefrontBaseUrl: "https://funnel.test",
          defaultLocale: "en",
          supportedLocales: ["en"],
        },
      },
    },
    { id: "other-co", slug: "other-co", name: "Other Co", status: "active" },
  ],
  domains: [
    { id: "funnel-domain", company_id: "funnel-co", domain: "funnel.test", is_primary: true, is_active: true, is_verified: true, created_at: nowIso, updated_at: nowIso },
    { id: "other-domain", company_id: "other-co", domain: "other.test", is_primary: true, is_active: true, is_verified: true, created_at: nowIso, updated_at: nowIso },
  ],
  users: [
    { id: "funnel-admin", name: "Funnel Admin", email: "admin@funnel.test", phone: "", password: passwordHash, role: "company_admin", permissions: [], isActive: true, createdAt: nowIso, updatedAt: nowIso },
    { id: "funnel-reporter", name: "Funnel Reporter", email: "reporter@funnel.test", phone: "", password: passwordHash, role: "employee", permissions: [], isActive: true, createdAt: nowIso, updatedAt: nowIso },
    { id: "funnel-plain", name: "Funnel Plain", email: "plain@funnel.test", phone: "", password: passwordHash, role: "employee", permissions: [], isActive: true, createdAt: nowIso, updatedAt: nowIso },
    { id: "other-admin", name: "Other Admin", email: "admin@other.test", phone: "", password: passwordHash, role: "company_admin", permissions: [], isActive: true, createdAt: nowIso, updatedAt: nowIso },
  ],
  memberships: [
    { id: "funnel-co:funnel-admin", companyId: "funnel-co", userId: "funnel-admin", role: "company_admin", status: "active", permissions: [], createdAt: nowIso, updatedAt: nowIso },
    { id: "funnel-co:funnel-reporter", companyId: "funnel-co", userId: "funnel-reporter", role: "employee", status: "active", permissions: ["reports.view"], createdAt: nowIso, updatedAt: nowIso },
    { id: "funnel-co:funnel-plain", companyId: "funnel-co", userId: "funnel-plain", role: "employee", status: "active", permissions: [], createdAt: nowIso, updatedAt: nowIso },
    { id: "other-co:other-admin", companyId: "other-co", userId: "other-admin", role: "company_admin", status: "active", permissions: [], createdAt: nowIso, updatedAt: nowIso },
  ],
  products: [
    {
      id: "funnel-product",
      slug: "funnel-product",
      sku: "FUNNEL-1",
      name: { en: "Funnel Product" },
      company_id: "funnel-co",
      isActive: true,
      visible: true,
      price: 50,
      stockQty: 100,
      sizes: [{ size: "Standard", price: 50 }],
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  ],
  orders: [],
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
process.env.JWT_SECRET = "analytics-funnel-test-secret";
process.env.NODE_ENV = "test";
process.env.ALLOW_LOCAL_CATALOG_STORAGE = "true";
process.env.UPLOADS_DIR = path.join(dataStoreDir, "uploads");
fs.mkdirSync(process.env.UPLOADS_DIR, { recursive: true });

const { app } = await import("../src/server.js");
const { recordPurchaseEvent } = await import("../src/analytics/purchaseFunnel.js");
const { inMemoryModuleStore } = await import("../src/moduleRegistry.js");
for (const companyId of ["funnel-co", "other-co"]) {
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

async function visitors(token) {
  const response = await fetch(`${baseUrl}/admin/analytics/visitors`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return { status: response.status, body: await response.json().catch(() => null) };
}

async function ingest(body, overrides = {}) {
  const response = await fetch(`${baseUrl}/storefront/analytics/visitor`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Company-Id": "funnel-co",
      "X-Site-Id": "funnel-store",
      Origin: "https://funnel.test",
      ...overrides.headers,
    },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json().catch(() => null) };
}

test("employee with reports.view reads the funnel block from real events", async () => {
  const token = await login("reporter@funnel.test");
  const { status, body } = await visitors(token);
  assert.equal(status, 200);
  assert.ok(body.funnel, "funnel block must be present");
  assert.equal(body.funnel.productViews, 2);
  assert.equal(body.funnel.addToCart, 1);
  assert.equal(body.funnel.removeFromCart, 0);
  assert.equal(body.funnel.checkoutStarted, 1);
  assert.equal(body.funnel.purchases, 1);
  assert.equal(body.funnel.addToCartRate, 0.5);
  assert.equal(body.funnel.checkoutRate, 1);
  assert.equal(body.funnel.purchaseConversionRate, 1);
});

test("analytics stays behind reports.view and requires authentication", async () => {
  const plainToken = await login("plain@funnel.test");
  const plain = await visitors(plainToken);
  assert.equal(plain.status, 403);

  const anonymous = await fetch(`${baseUrl}/admin/analytics/visitors`);
  assert.equal(anonymous.status, 401);
});

test("public ingestion records cart and checkout funnel events", async () => {
  const add = await ingest({ sessionKey: "client-session", eventType: "add_to_cart", path: "/products/x", productId: "funnel-product" });
  assert.equal(add.status, 201);

  const remove = await ingest({ sessionKey: "client-session", eventType: "remove_from_cart", path: "/cart", productId: "funnel-product" });
  assert.equal(remove.status, 201);

  const checkout = await ingest({ sessionKey: "client-session", eventType: "initiate_checkout", path: "/checkout" });
  assert.equal(checkout.status, 201);

  const { visitorEventRepository, visitorSessionRepository } = await import("../src/data/store.js");
  const events = visitorEventRepository.getByCompany("funnel-co");
  for (const type of ["add_to_cart", "remove_from_cart", "initiate_checkout"]) {
    assert.ok(events.some((event) => event.eventType === type && event.sessionKey === "client-session"), type);
  }
  // Funnel events must not fabricate extra visitor sessions.
  assert.equal(visitorSessionRepository.getByCompany("funnel-co").some((session) => session.sessionKey === "order:ORD-SEED"), false);
});

test("public ingestion cannot write purchase events or admin paths", async () => {
  const purchase = await ingest({ sessionKey: "client-session", eventType: "purchase", path: "/checkout" });
  assert.equal(purchase.status, 400);

  const adminPath = await ingest({ sessionKey: "client-session", eventType: "add_to_cart", path: "/admin/dashboard" });
  assert.equal(adminPath.status, 400);
});

test("successful storefront order records one purchase event with the real order id", async () => {
  const { visitorEventRepository } = await import("../src/data/store.js");
  const purchasesBefore = visitorEventRepository.getByCompany("funnel-co")
    .filter((event) => event.eventType === "purchase").length;

  const response = await fetch(`${baseUrl}/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Company-Id": "funnel-co",
      Origin: "https://funnel.test",
    },
    body: JSON.stringify({
      customer: { name: "Funnel Customer", phone: "0599000111", city: "Ramallah", address: "Main Street", notes: "" },
      items: [{
        productId: "funnel-product",
        productName: "Funnel Product",
        selectedSize: "Standard",
        size: "Standard",
        quantity: 1,
        price: 50,
        lineTotal: 50,
      }],
      paymentMethod: "Cash on delivery",
    }),
  });
  const order = await response.json();
  assert.equal(response.status, 201, JSON.stringify(order));
  assert.ok(order.orderId, "backend must return the authoritative order id");

  const purchases = visitorEventRepository.getByCompany("funnel-co")
    .filter((event) => event.eventType === "purchase");
  assert.equal(purchases.length, purchasesBefore + 1, "exactly one purchase event per created order");
  const recorded = purchases.find((event) => event.sessionKey === `order:${order.orderId}`);
  assert.ok(recorded, "purchase event must carry the real order id");
  assert.equal(recorded.company_id, "funnel-co");

  const duplicate = await recordPurchaseEvent("funnel-co", order.orderId);
  assert.deepEqual(duplicate, { recorded: false, reason: "duplicate" });
  assert.equal(
    visitorEventRepository.getByCompany("funnel-co").filter((event) => event.eventType === "purchase").length,
    purchasesBefore + 1,
    "duplicate purchase writes must be rejected",
  );

  const otherTenant = await recordPurchaseEvent("other-co", order.orderId);
  assert.equal(otherTenant.recorded, true, "purchase recording stays company scoped");
  const otherEvents = visitorEventRepository.getByCompany("other-co");
  assert.equal(otherEvents.some((event) => event.eventType === "purchase" && event.sessionKey === `order:${order.orderId}`), true);
  assert.equal(
    visitorEventRepository.getByCompany("funnel-co").filter((event) => event.eventType === "purchase").length,
    purchasesBefore + 1,
    "other tenants never receive this company's purchase events",
  );
});

test("migration 038 widens the event_type check to the full API allowlist", () => {
  const expectedTypes = [
    "pageview",
    "product_view",
    "heartbeat",
    "add_to_cart",
    "remove_from_cart",
    "initiate_checkout",
    "purchase",
  ];
  assert.deepEqual([...VISITOR_EVENT_TYPES].sort(), [...expectedTypes].sort());
  for (const type of ["add_to_cart", "remove_from_cart", "initiate_checkout", "purchase"]) {
    assert.ok(FUNNEL_EVENT_TYPES.includes(type), type);
  }

  const sql = fs.readFileSync(
    path.join(import.meta.dirname, "../supabase/migrations/038_visitor_events_funnel_types.sql"),
    "utf8",
  );
  assert.match(sql, /\bbegin;/);
  assert.match(sql, /\bcommit;/);
  for (const type of expectedTypes) {
    assert.ok(sql.includes(`'${type}'`), `migration must allow ${type}`);
  }
});
