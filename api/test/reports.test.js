import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { hashPassword } from "../src/auth/passwords.js";

const dataStoreDir = fs.mkdtempSync(path.join(os.tmpdir(), "igroup-reports-"));
const now = "2026-08-20T12:00:00.000Z";
const password = "Reports-test-2026!";
const passwordHash = await hashPassword(password);
const userRows = [
  ["icare-admin", "admin@icare.test", "company_admin", []],
  ["icare-viewer", "viewer@icare.test", "employee", ["reports.view"]],
  ["icare-staff", "staff@icare.test", "employee", ["products.view"]],
  ["icare-customer", "customer@icare.test", "customer", []],
  ["other-admin", "admin@other.test", "company_admin", []],
].map(([id, email, role, permissions]) => ({
  id, name: id, email, phone: "", password: passwordHash, role, permissions, isActive: true, createdAt: now, updatedAt: now,
}));
const membershipRows = [
  ["icare", "icare-admin", "company_admin", []],
  ["icare", "icare-viewer", "employee", ["reports.view"]],
  ["icare", "icare-staff", "employee", ["products.view"]],
  ["icare", "icare-customer", "customer", []],
  ["other-company", "other-admin", "company_admin", []],
].map(([companyId, userId, role, permissions]) => ({
  id: `${companyId}:${userId}`, companyId, userId, role, status: "active", permissions, createdAt: now, updatedAt: now,
}));

fs.writeFileSync(path.join(dataStoreDir, "store.json"), `${JSON.stringify({
  version: 2,
  companies: [
    { id: "icare", slug: "icare", name: "iCare", status: "active" },
    { id: "other-company", slug: "other-company", name: "Other", status: "active" },
  ],
  users: userRows,
  memberships: membershipRows,
  orders: [
    {
      id: "order-in-range",
      company_id: "icare",
      total: 40,
      status: "completed",
      createdAt: "2026-08-18T10:00:00.000Z",
      customer: { name: "A", city: "Ramallah" },
      delivery_city_name: "Ramallah",
    },
    {
      id: "order-old",
      company_id: "icare",
      total: 99,
      status: "pending",
      createdAt: "2026-01-01T10:00:00.000Z",
      customer: { name: "B", city: "Nablus" },
    },
    {
      id: "order-awaiting-delivery",
      company_id: "icare",
      total: 25,
      status: "Awaiting Delivery",
      createdAt: "2026-09-15T10:00:00.000Z",
      customer: { name: "C", city: "Hebron" },
    },
  ],
  invoices: [],
  products: [{ id: "p1", company_id: "icare", name: "Soap", slug: "soap", visible: true, updatedAt: now }],
}, null, 2)}\n`, "utf8");

process.env.DATA_STORE_DIR = dataStoreDir;
process.env.DATABASE_URL = "";
process.env.POSTGRES_URL = "";
process.env.SUPABASE_URL = "";
process.env.SUPABASE_SERVICE_ROLE_KEY = "";
process.env.JWT_SECRET = "focused-reports-test-secret";
process.env.NODE_ENV = "test";
process.env.ALLOW_LOCAL_CATALOG_STORAGE = "true";
process.env.UPLOADS_DIR = path.join(dataStoreDir, "uploads");
fs.mkdirSync(process.env.UPLOADS_DIR, { recursive: true });

const { app } = await import("../src/server.js");
const { inMemoryModuleStore } = await import("../src/moduleRegistry.js");
inMemoryModuleStore.set("icare", [{
  module_key: "settings.reports",
  enabled: true,
  active: true,
  allowed_roles: ["super_admin", "company_admin", "admin", "manager", "employee", "staff"],
  required_permissions: ["reports.view"],
  sort_order: 520,
}]);

const server = app.listen(0, "127.0.0.1");
await new Promise((resolve) => server.once("listening", resolve));
const baseUrl = `http://127.0.0.1:${server.address().port}/api`;

async function request(pathname, { token, headers = {} } = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });
  return { response, body: await response.json().catch(() => null) };
}

async function login(email) {
  const result = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const body = await result.json();
  assert.equal(result.status, 200);
  return body.token;
}

test.after(() => {
  server.close();
  fs.rmSync(dataStoreDir, { recursive: true, force: true });
});

test("reports summary API", async (t) => {
  const adminToken = await login("admin@icare.test");
  const viewerToken = await login("viewer@icare.test");
  const staffToken = await login("staff@icare.test");
  const otherToken = await login("admin@other.test");

  await t.test("unauthenticated access is rejected", async () => {
    assert.equal((await request("/admin/reports/summary")).response.status, 401);
  });

  await t.test("employee without reports.view is forbidden", async () => {
    assert.equal((await request("/admin/reports/summary", { token: staffToken })).response.status, 403);
  });

  await t.test("viewer receives tenant-scoped summary fields", async () => {
    const result = await request("/admin/reports/summary?date_from=2026-08-01T00:00:00.000Z&date_to=2026-08-30T23:59:59.000Z", { token: viewerToken });
    assert.equal(result.response.status, 200);
    assert.equal(result.body.summary.orders_count, 1);
    assert.equal(result.body.summary.revenue_total, 40);
    assert.equal(result.body.summary.customers_count, 1);
    assert.equal(result.body.orders.latest[0].id, "order-in-range");
    assert.equal(result.body.delivery.top_cities.some((row) => row.city === "Ramallah"), true);
    assert.equal(result.body.summary.sessions, undefined);
  });

  await t.test("date filter excludes older orders from period totals", async () => {
    const result = await request("/admin/reports/summary?date_from=2026-08-01T00:00:00.000Z&date_to=2026-08-30T23:59:59.000Z", { token: adminToken });
    assert.equal(result.body.summary.pending_orders, 0);
    assert.equal(result.body.summary.completed_orders, 1);
  });

  await t.test("orders awaiting delivery count as open orders, never completed", async () => {
    const result = await request("/admin/reports/summary?date_from=2026-09-01T00:00:00.000Z&date_to=2026-09-30T23:59:59.000Z", { token: adminToken });
    assert.equal(result.body.summary.orders_count, 1);
    assert.equal(result.body.summary.pending_orders, 1);
    assert.equal(result.body.summary.completed_orders, 0);
    assert.equal(result.body.summary.revenue_total, 25);
    assert.equal(result.body.orders.by_status.some((row) => row.status === "Awaiting Delivery" && row.count === 1), true);
  });

  await t.test("other company does not see icare orders", async () => {
    const result = await request("/admin/reports/summary", { token: otherToken });
    assert.equal(result.response.status, 200);
    assert.equal(result.body.summary.orders_count, 0);
  });
});
