import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { hashPassword } from "../src/auth/passwords.js";

const dataStoreDir = fs.mkdtempSync(path.join(os.tmpdir(), "igroup-delivery-zones-"));
const now = "2026-08-06T00:00:00.000Z";
const password = "Delivery-test-2026!";
const passwordHash = await hashPassword(password);
const userRows = [
  ["icare-admin", "admin@icare.test", "company_admin", []],
  ["icare-viewer", "viewer@icare.test", "employee", ["delivery.view"]],
  ["icare-manager", "manager@icare.test", "employee", ["delivery.manage"]],
  ["other-admin", "admin@other.test", "company_admin", []],
].map(([id, email, role, permissions]) => ({
  id, name: id, email, phone: "", password: passwordHash, role, permissions, isActive: true, createdAt: now, updatedAt: now,
}));
const membershipRows = [
  ["icare", "icare-admin", "company_admin", []],
  ["icare", "icare-viewer", "employee", ["delivery.view"]],
  ["icare", "icare-manager", "employee", ["delivery.manage"]],
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
  deliveryZones: [],
  orders: [],
}, null, 2)}\n`, "utf8");

process.env.DATA_STORE_DIR = dataStoreDir;
process.env.DATABASE_URL = "";
process.env.POSTGRES_URL = "";
process.env.SUPABASE_URL = "";
process.env.SUPABASE_SERVICE_ROLE_KEY = "";
process.env.JWT_SECRET = "focused-delivery-zones-test-secret";
process.env.NODE_ENV = "test";
process.env.ALLOW_LOCAL_CATALOG_STORAGE = "true";
process.env.UPLOADS_DIR = path.join(dataStoreDir, "uploads");
fs.mkdirSync(process.env.UPLOADS_DIR, { recursive: true });

const { app } = await import("../src/server.js");
const { inMemoryModuleStore } = await import("../src/moduleRegistry.js");
inMemoryModuleStore.set("icare", [{
  module_key: "operations.delivery",
  enabled: true,
  active: true,
  allowed_roles: ["super_admin", "company_admin", "admin", "manager", "employee", "staff"],
  required_permissions: ["delivery.view", "delivery.manage"],
  sort_order: 320,
}]);

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

test("delivery zones admin API", async (t) => {
  const adminToken = await login("admin@icare.test");
  const viewerToken = await login("viewer@icare.test");
  const managerToken = await login("manager@icare.test");
  const otherToken = await login("admin@other.test");

  await t.test("unauthenticated access is rejected", async () => {
    assert.equal((await request("/admin/delivery-zones")).response.status, 401);
  });

  await t.test("viewer can list zones but cannot create", async () => {
    assert.equal((await request("/admin/delivery-zones", { token: viewerToken })).response.status, 200);
    const create = await request("/admin/delivery-zones", {
      token: viewerToken,
      body: { city_key: "ramallah", city_name: "Ramallah", delivery_price: 10 },
    });
    assert.equal(create.response.status, 403);
  });

  let zoneId;
  await t.test("manager can create a delivery zone", async () => {
    const result = await request("/admin/delivery-zones", {
      token: managerToken,
      body: {
        city_key: "ramallah",
        city_name: "Ramallah",
        region: "West Bank",
        delivery_price: 15,
        currency: "ILS",
        enabled: true,
        display_order: 1,
      },
    });
    assert.equal(result.response.status, 201);
    zoneId = result.body.id;
    assert.equal(result.body.city_name, "Ramallah");
  });

  await t.test("duplicate city_key is rejected", async () => {
    const result = await request("/admin/delivery-zones", {
      token: adminToken,
      body: { city_key: "ramallah", city_name: "Ramallah 2", delivery_price: 12 },
    });
    assert.equal(result.response.status, 409);
  });

  await t.test("admin can patch and soft-delete a zone", async () => {
    const patch = await request(`/admin/delivery-zones/${zoneId}`, {
      token: adminToken,
      method: "PATCH",
      body: { delivery_price: 18, enabled: false },
    });
    assert.equal(patch.response.status, 200);
    assert.equal(patch.body.delivery_price, 18);
    assert.equal(patch.body.enabled, false);

    const del = await request(`/admin/delivery-zones/${zoneId}`, {
      token: adminToken,
      method: "DELETE",
    });
    assert.equal(del.response.status, 200);
    assert.ok(del.body.deleted_at);
  });

  await t.test("deleted zones are excluded from admin list", async () => {
    const list = await request("/admin/delivery-zones", { token: adminToken });
    assert.equal(list.response.status, 200);
    assert.equal(list.body.some((zone) => zone.id === zoneId), false);
  });

  await t.test("public endpoint returns only enabled zones for company", async () => {
    await request("/admin/delivery-zones", {
      token: adminToken,
      body: { city_key: "nablus", city_name: "Nablus", delivery_price: 20, enabled: true },
    });
    await request("/admin/delivery-zones", {
      token: adminToken,
      body: { city_key: "hebron", city_name: "Hebron", delivery_price: 25, enabled: false },
    });
    const publicList = await request("/delivery-zones", { token: adminToken });
    assert.equal(publicList.response.status, 200);
    assert.equal(publicList.body.some((zone) => zone.city_key === "nablus"), true);
    assert.equal(publicList.body.some((zone) => zone.city_key === "hebron"), false);
  });

  await t.test("other company cannot see icare zones", async () => {
    const list = await request("/admin/delivery-zones", { token: otherToken });
    assert.equal(list.response.status, 200);
    assert.equal(list.body.length, 0);
  });
});
