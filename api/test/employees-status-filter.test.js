import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { hashPassword } from "../src/auth/passwords.js";

const dataStoreDir = fs.mkdtempSync(path.join(os.tmpdir(), "eb-employees-status-"));
const now = "2026-09-20T00:00:00.000Z";
const password = "Test-password-123!";
const passwordHash = await hashPassword(password);

const companies = [
  { id: "eb-chemical", slug: "eb-chemical", name: "EB Chemical", status: "active", isDefault: true },
  { id: "icare", slug: "icare", name: "iCare", status: "active", isDefault: false },
];

const users = [
  ["eb-admin", "admin@eb.test", "company_admin", "eb-chemical"],
  ["eb-emp-active", "active@eb.test", "employee", "eb-chemical"],
  ["eb-emp-disabled", "disabled@eb.test", "employee", "eb-chemical"],
  ["eb-emp-disabled2", "disabled2@eb.test", "employee", "eb-chemical"],
  ["icare-admin", "admin@icare.test", "company_admin", "icare"],
  ["icare-emp", "emp@icare.test", "employee", "icare"],
].map(([id, email, role, companyId]) => ({
  id,
  name: id,
  email,
  password: passwordHash,
  role,
  permissions: [],
  isActive: true,
  company_id: companyId,
  createdAt: now,
  updatedAt: now,
}));

const memberships = [
  ["eb-chemical:eb-admin", "eb-chemical", "eb-admin", "company_admin", "active"],
  ["eb-chemical:eb-emp-active", "eb-chemical", "eb-emp-active", "employee", "active", [
    "dashboard.view", "products.view", "orders.view",
  ]],
  ["eb-chemical:eb-emp-disabled", "eb-chemical", "eb-emp-disabled", "employee", "inactive", [
    "dashboard.view", "products.view",
  ]],
  ["eb-chemical:eb-emp-disabled2", "eb-chemical", "eb-emp-disabled2", "employee", "inactive", [
    "dashboard.view",
  ]],
  ["icare:icare-admin", "icare", "icare-admin", "company_admin", "active"],
  ["icare:icare-emp", "icare", "icare-emp", "employee", "active", [
    "dashboard.view",
  ]],
].map(([id, companyId, userId, role, status, permissions]) => ({
  id,
  companyId,
  userId,
  role,
  status,
  permissions: permissions || [],
  createdAt: now,
  updatedAt: now,
}));

fs.writeFileSync(path.join(dataStoreDir, "store.json"), JSON.stringify({
  version: 2,
  companies,
  users,
  memberships,
}, null, 2));

process.env.DATA_STORE_DIR = dataStoreDir;
process.env.DATABASE_URL = "";
process.env.POSTGRES_URL = "";
process.env.SUPABASE_URL = "";
process.env.SUPABASE_SERVICE_ROLE_KEY = "";
process.env.JWT_SECRET = "focused-employees-status-test-secret";
process.env.NODE_ENV = "test";
const uploadTestDir = path.join(dataStoreDir, "uploads");
fs.mkdirSync(uploadTestDir, { recursive: true });
process.env.UPLOADS_DIR = uploadTestDir;

const { app } = await import("../src/server.js");
const { signToken } = await import("../src/middleware/auth.js");
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
  return request("/auth/login", {
    body: { email, password },
  });
}

let adminToken;

test("employee status filter and disable/enable flow", async (t) => {
  t.after(() => {
    server.close();
  });

  await t.test("admin login returns token", async () => {
    const result = await login("admin@eb.test");
    assert.equal(result.response.status, 200);
    adminToken = result.body.token;
    assert.ok(adminToken);
  });

  await t.test("GET /employees returns all employees including disabled", async () => {
    const result = await request("/employees", { token: adminToken });
    assert.equal(result.response.status, 200);
    const ids = result.body.map((e) => e.id).sort();
    assert.deepEqual(ids, ["eb-emp-active", "eb-emp-disabled", "eb-emp-disabled2"]);
  });

  await t.test("disabled employee has isActive: false in the list", async () => {
    const result = await request("/employees", { token: adminToken });
    assert.equal(result.response.status, 200);
    const disabled = result.body.find((e) => e.id === "eb-emp-disabled");
    assert.ok(disabled, "disabled employee is present");
    assert.equal(disabled.isActive, false);
    const active = result.body.find((e) => e.id === "eb-emp-active");
    assert.ok(active, "active employee is present");
    assert.equal(active.isActive, true);
  });

  await t.test("disabled employee retains permissions", async () => {
    const result = await request("/employees", { token: adminToken });
    const disabled = result.body.find((e) => e.id === "eb-emp-disabled");
    assert.ok(Array.isArray(disabled.permissions));
    assert.ok(disabled.permissions.includes("dashboard.view"));
    assert.ok(disabled.permissions.includes("products.view"));
  });

  await t.test("PUT /employees/:id/status enables a disabled employee", async () => {
    const result = await request("/employees/eb-emp-disabled/status", {
      token: adminToken,
      method: "PUT",
      body: { isActive: true },
    });
    assert.equal(result.response.status, 200);
    assert.equal(result.body.id, "eb-emp-disabled");
    assert.equal(result.body.isActive, true);
  });

  await t.test("reenabled employee appears as active in list", async () => {
    const result = await request("/employees", { token: adminToken });
    assert.equal(result.response.status, 200);
    const emp = result.body.find((e) => e.id === "eb-emp-disabled");
    assert.equal(emp.isActive, true);
  });

  await t.test("PUT /employees/:id/status disables an active employee", async () => {
    const result = await request("/employees/eb-emp-disabled/status", {
      token: adminToken,
      method: "PUT",
      body: { isActive: false },
    });
    assert.equal(result.response.status, 200);
    assert.equal(result.body.isActive, false);
  });

  await t.test("PUT /employees/:id/edit updates a disabled employee", async () => {
    const result = await request("/employees/eb-emp-disabled", {
      token: adminToken,
      method: "PUT",
      body: { name: "Updated Disabled Employee" },
    });
    assert.equal(result.response.status, 200);
    assert.equal(result.body.name, "Updated Disabled Employee");
    assert.equal(result.body.id, "eb-emp-disabled");
  });

  await t.test("PUT /employees/:id/permissions updates permissions for a disabled employee", async () => {
    const result = await request("/employees/eb-emp-disabled/permissions", {
      token: adminToken,
      method: "PUT",
      body: { permissions: ["dashboard.view", "orders.view"] },
    });
    assert.equal(result.response.status, 200);
    assert.deepEqual(result.body.permissions.sort(), ["dashboard.view", "orders.view"]);
  });

  await t.test("disabled employee can be deleted", async () => {
    const result = await request("/employees/eb-emp-disabled2", {
      token: adminToken,
      method: "DELETE",
    });
    assert.equal(result.response.status, 204);
    const listResult = await request("/employees", { token: adminToken });
    assert.equal(listResult.body.some((e) => e.id === "eb-emp-disabled2"), false);
  });

  await t.test("other company employees never leak into the list", async () => {
    const result = await request("/employees", { token: adminToken });
    assert.equal(result.body.every((e) => e.id !== "icare-emp"), true);
  });

  await t.test("iCare admin cannot see eb-chemical employees", async () => {
    const icareLogin = await login("admin@icare.test");
    assert.equal(icareLogin.response.status, 200);
    const result = await request("/employees", { token: icareLogin.body.token });
    assert.equal(result.response.status, 200);
    assert.equal(result.body.every((e) => e.id !== "eb-emp-active"), true);
    assert.equal(result.body.every((e) => e.id !== "eb-emp-disabled"), true);
  });
});
