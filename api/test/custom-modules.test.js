import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { hashPassword } from "../src/auth/passwords.js";

const dataStoreDir = fs.mkdtempSync(path.join(os.tmpdir(), "igroup-custom-modules-"));
const now = "2026-08-30T12:00:00.000Z";
const password = "Custom-modules-test-2026!";
const passwordHash = await hashPassword(password);
const userRows = [
  ["eb-admin", "admin@eb.test", "company_admin", []],
  ["eb-viewer", "viewer@eb.test", "employee", ["custom_modules.units.view"]],
  ["eb-manager", "manager@eb.test", "employee", ["custom_modules.units.manage"]],
].map(([id, email, role, permissions]) => ({
  id, name: id, email, phone: "", password: passwordHash, role, permissions, isActive: true, createdAt: now, updatedAt: now,
}));
const membershipRows = [
  ["eb-chemical", "eb-admin", "company_admin", []],
  ["eb-chemical", "eb-viewer", "employee", ["custom_modules.units.view"]],
  ["eb-chemical", "eb-manager", "employee", ["custom_modules.units.manage"]],
].map(([companyId, userId, role, permissions]) => ({
  id: `${companyId}:${userId}`, companyId, userId, role, status: "active", permissions, createdAt: now, updatedAt: now,
}));

fs.writeFileSync(path.join(dataStoreDir, "store.json"), `${JSON.stringify({
  version: 2,
  companies: [{ id: "eb-chemical", slug: "eb-chemical", name: "EB Chemical", status: "active", isDefault: true }],
  users: userRows,
  memberships: membershipRows,
  customAdminModules: [],
  customAdminModuleEntries: [],
}, null, 2)}\n`, "utf8");

process.env.DATA_STORE_DIR = dataStoreDir;
process.env.DATABASE_URL = "";
process.env.POSTGRES_URL = "";
process.env.JWT_SECRET = "custom-modules-test-secret";
process.env.NODE_ENV = "test";
process.env.ALLOW_LOCAL_CATALOG_STORAGE = "true";

const { app } = await import("../src/server.js");
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
  const text = await response.text();
  let parsed = null;
  try { parsed = text ? JSON.parse(text) : null; } catch { parsed = text || null; }
  return { response, body: parsed };
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

test("custom modules admin API", async (t) => {
  const adminToken = await login("admin@eb.test");
  const viewerToken = await login("viewer@eb.test");
  const managerToken = await login("manager@eb.test");

  let moduleId;
  await t.test("company admin creates a custom module with fields", async () => {
    const created = await request("/admin/custom-modules", {
      token: adminToken,
      body: {
        key: "units",
        label: "Units",
        description: "Track units",
        icon: "folder",
        enabled: true,
        fieldsSchema: [
          { key: "unit_name", label: "Unit name", type: "text", required: true, showInList: true, order: 0 },
          { key: "capacity", label: "Capacity", type: "number", required: false, showInList: true, order: 10 },
        ],
      },
    });
    assert.equal(created.response.status, 201);
    moduleId = created.body.id;
    assert.equal(created.body.key, "units");
    assert.equal(created.body.fieldsSchema.length, 2);
  });

  await t.test("viewer cannot create modules but can list when permitted", async () => {
    assert.equal((await request("/admin/custom-modules", {
      token: viewerToken,
      body: { key: "denied", label: "Denied", fieldsSchema: [{ key: "a", label: "A", type: "text" }] },
    })).response.status, 403);
    const list = await request("/admin/custom-modules", { token: viewerToken });
    assert.equal(list.response.status, 200);
    assert.equal(list.body.some((item) => item.id === moduleId), true);
  });

  let entryId;
  await t.test("manager can create and list entries", async () => {
    const created = await request(`/admin/custom-modules/${moduleId}/entries`, {
      token: managerToken,
      body: { data: { unit_name: "Batch A", capacity: 12 } },
    });
    assert.equal(created.response.status, 201);
    entryId = created.body.id;
    assert.equal(created.body.data.unit_name, "Batch A");
    const list = await request(`/admin/custom-modules/${moduleId}/entries`, { token: viewerToken });
    assert.equal(list.response.status, 200);
    assert.equal(list.body.length, 1);
  });

  await t.test("viewer can read but cannot mutate entries", async () => {
    assert.equal((await request(`/admin/custom-modules/${moduleId}/entries/${entryId}`, { token: viewerToken })).response.status, 200);
    assert.equal((await request(`/admin/custom-modules/${moduleId}/entries/${entryId}`, {
      token: viewerToken,
      method: "PATCH",
      body: { data: { unit_name: "Changed", capacity: 1 } },
    })).response.status, 403);
  });

  await t.test("manager updates entry and reload persists", async () => {
    const updated = await request(`/admin/custom-modules/${moduleId}/entries/${entryId}`, {
      token: managerToken,
      method: "PATCH",
      body: { data: { unit_name: "Batch B", capacity: 20 } },
    });
    assert.equal(updated.response.status, 200);
    assert.equal(updated.body.data.unit_name, "Batch B");
    const read = await request(`/admin/custom-modules/${moduleId}/entries`, { token: adminToken });
    assert.equal(read.body[0].data.capacity, 20);
  });

  await t.test("invalid entry data is rejected", async () => {
    assert.equal((await request(`/admin/custom-modules/${moduleId}/entries`, {
      token: managerToken,
      body: { data: { capacity: 5 } },
    })).response.status, 400);
  });

  await t.test("admin disables module via delete", async () => {
    const disabled = await request(`/admin/custom-modules/${moduleId}`, { token: adminToken, method: "DELETE" });
    assert.equal(disabled.response.status, 200);
    assert.equal(disabled.body.enabled, false);
  });
});
