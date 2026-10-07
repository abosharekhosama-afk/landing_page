import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { hashPassword } from "../src/auth/passwords.js";

const dataStoreDir = fs.mkdtempSync(path.join(os.tmpdir(), "igroup-activity-log-"));
const now = "2026-08-20T12:00:00.000Z";
const password = "Activity-test-2026!";
const passwordHash = await hashPassword(password);
const userRows = [
  ["icare-admin", "admin@icare.test", "company_admin", []],
  ["icare-viewer", "viewer@icare.test", "employee", ["activity_log.view"]],
  ["icare-staff", "staff@icare.test", "employee", ["products.view"]],
  ["other-admin", "admin@other.test", "company_admin", []],
].map(([id, email, role, permissions]) => ({
  id, name: id, email, phone: "", password: passwordHash, role, permissions, isActive: true, createdAt: now, updatedAt: now,
}));
const membershipRows = [
  ["icare", "icare-admin", "company_admin", []],
  ["icare", "icare-viewer", "employee", ["activity_log.view"]],
  ["icare", "icare-staff", "employee", ["products.view"]],
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
  activityLogs: [
    {
      id: "log-product",
      company_id: "icare",
      actor_user_id: "icare-admin",
      actor_email: "admin@icare.test",
      actor_name: "Admin",
      actor_role: "company_admin",
      action: "product.updated",
      entity_type: "product",
      entity_id: "p1",
      entity_label: "Soap",
      summary: "Updated product",
      before_data: { name: "Old" },
      after_data: { name: "Soap", password: "secret", token: "abc" },
      metadata: { source: "cpanel" },
      ip_address: "127.0.0.1",
      user_agent: "test",
      created_at: "2026-08-18T10:00:00.000Z",
    },
    {
      id: "log-order",
      company_id: "icare",
      actor_user_id: "icare-admin",
      actor_email: "admin@icare.test",
      actor_name: "Admin",
      actor_role: "company_admin",
      action: "order.created",
      entity_type: "order",
      entity_id: "o1",
      entity_label: "Order 1",
      summary: "Created order",
      created_at: "2026-01-01T10:00:00.000Z",
    },
    {
      id: "log-other",
      company_id: "other-company",
      actor_email: "admin@other.test",
      actor_name: "Other",
      action: "product.updated",
      entity_type: "product",
      summary: "Other tenant",
      created_at: "2026-08-18T11:00:00.000Z",
    },
  ],
  orders: [],
}, null, 2)}\n`, "utf8");

process.env.DATA_STORE_DIR = dataStoreDir;
process.env.DATABASE_URL = "";
process.env.POSTGRES_URL = "";
process.env.SUPABASE_URL = "";
process.env.SUPABASE_SERVICE_ROLE_KEY = "";
process.env.JWT_SECRET = "focused-activity-log-test-secret";
process.env.NODE_ENV = "test";
process.env.ALLOW_LOCAL_CATALOG_STORAGE = "true";
process.env.UPLOADS_DIR = path.join(dataStoreDir, "uploads");
fs.mkdirSync(process.env.UPLOADS_DIR, { recursive: true });

const { app } = await import("../src/server.js");
const { inMemoryModuleStore } = await import("../src/moduleRegistry.js");
inMemoryModuleStore.set("icare", [{
  module_key: "settings.activity_log",
  enabled: true,
  active: true,
  allowed_roles: ["super_admin", "company_admin", "admin", "manager", "employee", "staff"],
  required_permissions: ["activity_log.view"],
  sort_order: 530,
}]);

const server = app.listen(0, "127.0.0.1");
await new Promise((resolve) => server.once("listening", resolve));
const baseUrl = `http://127.0.0.1:${server.address().port}/api`;

async function request(pathname, { token } = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
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

test("activity log admin API", async (t) => {
  const adminToken = await login("admin@icare.test");
  const viewerToken = await login("viewer@icare.test");
  const staffToken = await login("staff@icare.test");
  const otherToken = await login("admin@other.test");

  await t.test("unauthenticated access is rejected", async () => {
    assert.equal((await request("/admin/activity-log")).response.status, 401);
  });

  await t.test("employee without activity_log.view is forbidden", async () => {
    assert.equal((await request("/admin/activity-log", { token: staffToken })).response.status, 403);
  });

  await t.test("viewer can list tenant logs with pagination", async () => {
    const result = await request("/admin/activity-log?limit=1&page=1", { token: viewerToken });
    assert.equal(result.response.status, 200);
    assert.equal(result.body.logs.length, 1);
    assert.equal(result.body.total, 2);
    assert.equal(result.body.totalPages, 2);
    assert.equal(result.body.logs.some((log) => log.id === "log-other"), false);
  });

  await t.test("action and date filters are applied", async () => {
    const byAction = await request("/admin/activity-log?action=order.created", { token: adminToken });
    assert.equal(byAction.body.total, 1);
    assert.equal(byAction.body.logs[0].id, "log-order");
    const byDate = await request("/admin/activity-log?date_from=2026-08-01T00:00:00.000Z&date_to=2026-08-30T23:59:59.000Z", { token: adminToken });
    assert.equal(byDate.body.total, 1);
    assert.equal(byDate.body.logs[0].id, "log-product");
  });

  await t.test("detail sanitizes secrets and stays tenant scoped", async () => {
    const result = await request("/admin/activity-log/log-product", { token: viewerToken });
    assert.equal(result.response.status, 200);
    assert.equal(result.body.action, "product.updated");
    assert.equal(result.body.after_data.name, "Soap");
    assert.equal(result.body.after_data.password, undefined);
    assert.equal(result.body.after_data.token, undefined);
    assert.equal((await request("/admin/activity-log/log-other", { token: viewerToken })).response.status, 404);
  });

  await t.test("other company cannot see icare logs", async () => {
    const result = await request("/admin/activity-log", { token: otherToken });
    assert.equal(result.response.status, 200);
    assert.equal(result.body.logs.some((log) => log.company_id === "icare" || log.id === "log-product"), false);
  });
});
