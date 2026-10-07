import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test, { after } from "node:test";
import { hashPassword } from "../src/auth/passwords.js";
import { aggregateVisitorAnalytics, upsertVisitorSession } from "../src/analytics/visitorAnalytics.js";

const FIXED_NOW = new Date("2026-09-01T12:00:00.000Z");

function session({ key, companyId = "demo", siteId = "store", firstSeenAt, lastSeenAt, pageViews = 1, visitorKey = "" }) {
  return {
    id: `session-${key}`,
    company_id: companyId,
    siteId,
    sessionKey: key,
    visitorKey,
    firstSeenAt,
    lastSeenAt,
    pageViews,
    productViews: 0,
    isReturning: false,
    lastPath: "/",
  };
}

function event({ key, companyId = "demo", siteId = "store", eventType = "pageview", path = "/", createdAt }) {
  return {
    id: `event-${key}`,
    company_id: companyId,
    siteId,
    sessionKey: `s-${key}`,
    eventType,
    path,
    productId: "",
    createdAt,
  };
}

const events = [
  event({ key: "1", path: "/", createdAt: "2026-08-30T10:00:00.000Z" }),
  event({ key: "2", path: "/", createdAt: "2026-08-30T11:00:00.000Z" }),
  event({ key: "3", path: "/products", createdAt: "2026-08-31T09:00:00.000Z" }),
  event({ key: "4", eventType: "product_view", path: "/products", createdAt: "2026-08-31T09:30:00.000Z" }),
  event({ key: "5", eventType: "pageview", path: "", createdAt: "2026-09-01T08:00:00.000Z" }),
  event({ key: "6", companyId: "other", path: "/other", createdAt: "2026-08-31T09:00:00.000Z" }),
  event({ key: "7", siteId: "other-store", path: "/other-site", createdAt: "2026-08-31T09:00:00.000Z" }),
];

const sessions = [
  session({ key: "s1", firstSeenAt: "2026-08-30T10:00:00.000Z", lastSeenAt: "2026-08-30T11:30:00.000Z", pageViews: 2, visitorKey: "v1" }),
  session({ key: "s2", firstSeenAt: "2026-08-31T09:00:00.000Z", lastSeenAt: "2026-08-31T09:10:00.000Z", pageViews: 1 }),
  session({ key: "s3", firstSeenAt: "2026-08-31T14:00:00.000Z", lastSeenAt: "2026-08-31T14:05:00.000Z", pageViews: 1 }),
  session({ key: "s4", firstSeenAt: "2026-01-01T10:00:00.000Z", lastSeenAt: "2026-01-01T10:30:00.000Z", pageViews: 3 }),
];

test("top pages aggregate only real in-window pageview events", () => {
  const summary = aggregateVisitorAnalytics(sessions, events, { companyId: "demo", siteId: "store", now: FIXED_NOW });
  assert.deepEqual(summary.behavior.topPages, [
    { path: "/", views: 2 },
    { path: "/products", views: 1 },
  ]);
  assert.equal(summary.behavior.topPages.some((row) => row.path === "/other" || row.path === "/other-site"), false);
});

test("sessions over time uses the authoritative seriesByDay rows", () => {
  const summary = aggregateVisitorAnalytics(sessions, events, { companyId: "demo", siteId: "store", now: FIXED_NOW });
  assert.equal(summary.seriesByDay.length, 7);
  const dailyTotal = summary.seriesByDay.reduce((sum, row) => sum + row.visitors, 0);
  assert.equal(dailyTotal, summary.behavior.sessions);
  assert.equal(summary.behavior.range.days, 7);
});

test("avgSessionDuration derives only from real session start/end timestamps", () => {
  const summary = aggregateVisitorAnalytics(sessions, events, { companyId: "demo", siteId: "store", now: FIXED_NOW });
  const s1Seconds = (new Date("2026-08-30T11:30:00.000Z") - new Date("2026-08-30T10:00:00.000Z")) / 1000;
  const s2Seconds = 600;
  const s3Seconds = 300;
  const expected = Math.round(((s1Seconds + s2Seconds + s3Seconds) / 3) * 10) / 10;
  assert.equal(summary.behavior.avgSessionDurationSeconds, expected);
});

test("pagesPerSession divides real window page views by real sessions", () => {
  const summary = aggregateVisitorAnalytics(sessions, events, { companyId: "demo", siteId: "store", now: FIXED_NOW });
  assert.equal(summary.behavior.sessions, 3);
  assert.equal(summary.behavior.pageViews, 4);
  assert.equal(summary.behavior.pagesPerSession, Math.round((4 / 3) * 100) / 100);
});

test("bounceRate counts sessions with exactly one page view", () => {
  const summary = aggregateVisitorAnalytics(sessions, events, { companyId: "demo", siteId: "store", now: FIXED_NOW });
  assert.equal(summary.behavior.bounceRate, Math.round((2 / 3) * 1000) / 1000);
});

test("missing sessions leave engagement metrics unavailable, not zero", () => {
  const summary = aggregateVisitorAnalytics([], [], { companyId: "demo", siteId: "store", now: FIXED_NOW });
  assert.equal(summary.behavior.sessions, 0);
  assert.equal(summary.behavior.avgSessionDurationSeconds, null);
  assert.equal(summary.behavior.pagesPerSession, null);
  assert.equal(summary.behavior.bounceRate, null);
  assert.deepEqual(summary.behavior.topPages, []);
});

test("explicit zero engagement values remain zero", () => {
  const zeroSessions = [
    session({ key: "z1", firstSeenAt: "2026-08-30T10:00:00.000Z", lastSeenAt: "2026-08-30T10:00:00.000Z", pageViews: 2 }),
    session({ key: "z2", firstSeenAt: "2026-08-30T11:00:00.000Z", lastSeenAt: "2026-08-30T11:00:00.000Z", pageViews: 3 }),
  ];
  const summary = aggregateVisitorAnalytics(zeroSessions, [], { companyId: "demo", siteId: "store", now: FIXED_NOW });
  assert.equal(summary.behavior.sessions, 2);
  assert.equal(summary.behavior.pagesPerSession, 2.5);
  assert.equal(summary.behavior.bounceRate, 0);
  assert.equal(summary.behavior.avgSessionDurationSeconds, 0);

  const noPageSessions = [
    session({ key: "p1", firstSeenAt: "2026-08-30T10:00:00.000Z", lastSeenAt: "2026-08-30T10:01:00.000Z", pageViews: 0 }),
    session({ key: "p2", firstSeenAt: "2026-08-30T11:00:00.000Z", lastSeenAt: "2026-08-30T11:01:00.000Z", pageViews: 0 }),
  ];
  const noPages = aggregateVisitorAnalytics(noPageSessions, [], { companyId: "demo", siteId: "store", now: FIXED_NOW });
  assert.equal(noPages.behavior.pagesPerSession, 0);
  assert.equal(noPages.behavior.bounceRate, null);
});

test("sessions with 0 pageviews are excluded from the bounce-rate denominator", () => {
  const mixedSessions = [
    session({ key: "m1", firstSeenAt: "2026-08-30T10:00:00.000Z", lastSeenAt: "2026-08-30T10:01:00.000Z", pageViews: 0 }),
    session({ key: "m2", firstSeenAt: "2026-08-30T11:00:00.000Z", lastSeenAt: "2026-08-30T11:01:00.000Z", pageViews: 1 }),
    session({ key: "m3", firstSeenAt: "2026-08-30T12:00:00.000Z", lastSeenAt: "2026-08-30T12:01:00.000Z", pageViews: 2 }),
  ];
  const summary = aggregateVisitorAnalytics(mixedSessions, [], { companyId: "demo", siteId: "store", now: FIXED_NOW });
  assert.equal(summary.behavior.sessions, 3);
  assert.equal(summary.behavior.bounceRate, Math.round((1 / 2) * 1000) / 1000);
});

test("aggregation is deterministic and never emits NaN analytics values", () => {
  const first = aggregateVisitorAnalytics(sessions, events, { companyId: "demo", siteId: "store", now: FIXED_NOW });
  const second = aggregateVisitorAnalytics(sessions, events, { companyId: "demo", siteId: "store", now: FIXED_NOW });
  assert.deepEqual(first, second);
  for (const value of [
    first.behavior.avgSessionDurationSeconds,
    first.behavior.pagesPerSession,
    first.behavior.bounceRate,
  ]) {
    if (value != null) assert.ok(Number.isFinite(value), "behavior metric must be finite");
  }
  for (const row of first.behavior.topPages) {
    assert.ok(Number.isInteger(row.views) && row.views >= 0);
  }
});

test("upsertVisitorSession accumulates page views from the same session", () => {
  let next = upsertVisitorSession([], {
    companyId: "demo",
    siteId: "store",
    sessionKey: "live-1",
    visitorKey: "v1",
    path: "/",
    eventType: "pageview",
    now: new Date("2026-08-30T10:00:00.000Z"),
  });
  next = upsertVisitorSession(next, {
    companyId: "demo",
    siteId: "store",
    sessionKey: "live-1",
    path: "/products",
    eventType: "pageview",
    now: new Date("2026-08-30T10:05:00.000Z"),
  });
  next = upsertVisitorSession(next, {
    companyId: "demo",
    siteId: "store",
    sessionKey: "live-1",
    path: "/products",
    eventType: "heartbeat",
    now: new Date("2026-08-30T10:06:00.000Z"),
  });
  assert.equal(next[0].pageViews, 2);
  assert.equal(next[0].productViews, 0);
  const summary = aggregateVisitorAnalytics(next, [], { companyId: "demo", siteId: "store", now: FIXED_NOW });
  assert.equal(summary.behavior.avgSessionDurationSeconds, 360);
});

// ---------------------------------------------------------------------------
// Route-level verification with real auth, tenant isolation, and real values.
// ---------------------------------------------------------------------------

const dataStoreDir = fs.mkdtempSync(path.join(os.tmpdir(), "analytics-visitor-behavior-route-"));
const nowIso = new Date().toISOString();
const dayMs = 24 * 60 * 60 * 1000;
const twoDaysAgo = new Date(Date.now() - 2 * dayMs).toISOString();
const yesterday = new Date(Date.now() - 1 * dayMs).toISOString();
const password = "Visitor-behavior-test-2026!";
const passwordHash = await hashPassword(password);

const seedEvents = [
  { id: "route-e1", company_id: "icare", siteId: "icare-store", sessionKey: "route-s1", eventType: "pageview", path: "/", createdAt: twoDaysAgo },
  { id: "route-e2", company_id: "icare", siteId: "icare-store", sessionKey: "route-s1", eventType: "pageview", path: "/products", createdAt: yesterday },
  { id: "route-e3", company_id: "other-company", siteId: "other-store", sessionKey: "other-s1", eventType: "pageview", path: "/other", createdAt: yesterday },
];

const seedSessions = [
  {
    id: "route-s1",
    company_id: "icare",
    siteId: "icare-store",
    sessionKey: "route-s1",
    visitorKey: "v-1",
    firstSeenAt: twoDaysAgo,
    lastSeenAt: yesterday,
    pageViews: 2,
    productViews: 0,
    isReturning: false,
    lastPath: "/products",
  },
  {
    id: "other-s1",
    company_id: "other-company",
    siteId: "other-store",
    sessionKey: "other-s1",
    visitorKey: "v-other",
    firstSeenAt: yesterday,
    lastSeenAt: yesterday,
    pageViews: 1,
    productViews: 0,
    isReturning: false,
    lastPath: "/other",
  },
];

fs.writeFileSync(path.join(dataStoreDir, "store.json"), JSON.stringify({
  version: 2,
  companies: [
    { id: "icare", slug: "icare", name: "iCare", status: "active", settings: { websiteConnection: { siteId: "icare-store" } } },
    { id: "other-company", slug: "other-company", name: "Other", status: "active" },
  ],
  users: [
    {
      id: "icare-admin",
      name: "Admin",
      email: "admin@icare.test",
      phone: "",
      password: passwordHash,
      role: "company_admin",
      permissions: [],
      isActive: true,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: "other-admin",
      name: "Other Admin",
      email: "admin@other.test",
      phone: "",
      password: passwordHash,
      role: "company_admin",
      permissions: [],
      isActive: true,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  ],
  memberships: [
    { id: "icare:icare-admin", companyId: "icare", userId: "icare-admin", role: "company_admin", status: "active", permissions: [], createdAt: nowIso, updatedAt: nowIso },
    { id: "other-company:other-admin", companyId: "other-company", userId: "other-admin", role: "company_admin", status: "active", permissions: [], createdAt: nowIso, updatedAt: nowIso },
  ],
  orders: [],
  products: [],
  visitorSessions: seedSessions,
  visitorEvents: seedEvents,
}, null, 2));

process.env.DATA_STORE_DIR = dataStoreDir;
process.env.DATABASE_URL = "";
process.env.POSTGRES_URL = "";
process.env.SUPABASE_URL = "";
process.env.SUPABASE_SERVICE_ROLE_KEY = "";
process.env.JWT_SECRET = "visitor-behavior-route-test-secret";
process.env.NODE_ENV = "test";
process.env.ALLOW_LOCAL_CATALOG_STORAGE = "true";
process.env.UPLOADS_DIR = path.join(dataStoreDir, "uploads");
fs.mkdirSync(process.env.UPLOADS_DIR, { recursive: true });

const { app } = await import("../src/server.js");
const { inMemoryModuleStore } = await import("../src/moduleRegistry.js");
for (const companyId of ["icare", "other-company"]) {
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
  assert.equal(result.status, 200);
  return (await result.json()).token;
}

test("visitors analytics API returns honest behavior data from real seeded records", async () => {
  const token = await login("admin@icare.test");
  const response = await fetch(`${baseUrl}/admin/analytics/visitors`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.ok(body.behavior, "behavior block must be present");
  assert.equal(body.behavior.sessions, 1);
  assert.equal(body.behavior.pageViews, 2);
  assert.equal(body.behavior.pagesPerSession, 2);
  assert.equal(body.behavior.avgSessionDurationSeconds, 86400);
  assert.equal(body.behavior.bounceRate, 0);
  assert.deepEqual(body.behavior.topPages, [
    { path: "/", views: 1 },
    { path: "/products", views: 1 },
  ]);
});

test("visitors analytics API isolates companies and leaves empty tenants unavailable", async () => {
  const token = await login("admin@other.test");
  const response = await fetch(`${baseUrl}/admin/analytics/visitors`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.behavior.sessions, 1);
  assert.equal(body.behavior.pageViews, 1);
  assert.equal(body.behavior.pagesPerSession, 1);
  assert.equal(body.behavior.avgSessionDurationSeconds, 0);
  assert.equal(body.behavior.topPages[0].path, "/other");
  assert.deepEqual(body.behavior.topPages.some((row) => row.path === "/" || row.path === "/products"), false);
});

test("visitors analytics API rejects unauthenticated callers", async () => {
  const response = await fetch(`${baseUrl}/admin/analytics/visitors`, {});
  assert.equal(response.status, 401);
});