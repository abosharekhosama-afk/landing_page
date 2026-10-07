import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { hashPassword } from "../src/auth/passwords.js";

const dataStoreDir = fs.mkdtempSync(path.join(os.tmpdir(), "igroup-customers-"));
const now = "2026-08-06T00:00:00.000Z";
const password = "Customer-test-2026!";
const passwordHash = await hashPassword(password);
const users = [
  ["icare-admin", "admin@icare.test", "company_admin"],
  ["other-admin", "admin@other.test", "company_admin"],
  ["icare-employee", "employee@icare.test", "employee"],
  ["icare-plain-employee", "plain-employee@icare.test", "employee"],
  ["customer-user", "customer@customer-company.test", "customer"],
].map(([id, email, role]) => ({
  id,
  name: id,
  email,
  phone: "",
  password: passwordHash,
  role,
  permissions: [],
  isActive: true,
  createdAt: now,
  updatedAt: now,
}));
const memberships = [
  ["icare:icare-admin", "icare", "icare-admin", "company_admin", []],
  ["other-company:other-admin", "other-company", "other-admin", "company_admin", []],
  [
    "icare:icare-employee",
    "icare",
    "icare-employee",
    "employee",
    ["customers.view", "customers.create", "customers.update", "customers.archive", "customers.manage"],
  ],
  ["icare:icare-plain-employee", "icare", "icare-plain-employee", "employee", []],
  ["customer-company:customer-user", "customer-company", "customer-user", "customer", []],
].map(([id, companyId, userId, role, permissions]) => ({
  id,
  companyId,
  userId,
  role,
  status: "active",
  permissions,
  createdAt: now,
  updatedAt: now,
}));

fs.writeFileSync(path.join(dataStoreDir, "store.json"), `${JSON.stringify({
  version: 2,
  companies: [
    { id: "icare", slug: "icare", name: "iCare", status: "active", isDefault: false },
    { id: "other-company", slug: "other-company", name: "Other Company", status: "active", isDefault: false },
    { id: "customer-company", slug: "customer-company", name: "Customer Company", status: "active", isDefault: false },
  ],
  users,
  memberships,
  orders: [],
}, null, 2)}\n`, "utf8");

process.env.DATA_STORE_DIR = dataStoreDir;
process.env.DATABASE_URL = "";
process.env.POSTGRES_URL = "";
process.env.SUPABASE_URL = "";
process.env.SUPABASE_SERVICE_ROLE_KEY = "";
process.env.JWT_SECRET = "focused-customer-test-secret";
process.env.NODE_ENV = "test";
process.env.ALLOW_LOCAL_CATALOG_STORAGE = "true";
process.env.UPLOADS_DIR = path.join(dataStoreDir, "uploads");
fs.mkdirSync(process.env.UPLOADS_DIR, { recursive: true });

const { app } = await import("../src/server.js");
const { orderRepository } = await import("../src/data/store.js");
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

test("tenant CRM customer API", async (t) => {
  const icareToken = await login("admin@icare.test");
  const otherToken = await login("admin@other.test");
  const employeeToken = await login("employee@icare.test");
  const plainEmployeeToken = await login("plain-employee@icare.test");
  const customerToken = await login("customer@customer-company.test");

  await t.test("existing list contract remains an array and an empty iCare list is valid", async () => {
    const result = await request("/admin/customers", { token: icareToken });
    assert.equal(result.response.status, 200);
    assert.ok(Array.isArray(result.body));
    assert.deepEqual(result.body, []);
  });

  let contact;
  await t.test("authorized tenant admin creates a safely scoped contact", async () => {
    const result = await request("/admin/customers", {
      token: icareToken,
      headers: { "X-Company-Id": "other-company" },
      body: {
        companyId: "other-company",
        firstName: "  Lina ",
        lastName: " Care ",
        email: " LINA@EXAMPLE.COM ",
        phone: " +970 599 000 000 ",
        type: "lead",
        source: "manual",
        notes: "Requested a callback.",
        labels: ["Priority", "Priority"],
      },
    });
    assert.equal(result.response.status, 201);
    contact = result.body;
    assert.equal(contact.email, "lina@example.com");
    assert.equal(contact.name, "Lina Care");
    assert.equal(contact.type, "lead");
    assert.deepEqual(contact.labels, ["Priority"]);
    assert.equal(contact.isArchived, false);
    assert.equal("companyId" in contact, false);
    const otherList = await request("/admin/customers", { token: otherToken });
    assert.deepEqual(otherList.body, []);
  });

  await t.test("contact can be read by stable ID without sensitive fields", async () => {
    const result = await request(`/admin/customers/${contact.id}`, { token: icareToken });
    assert.equal(result.response.status, 200);
    assert.equal(result.body.id, contact.id);
    for (const field of ["password", "permissions", "globalPermissions", "membershipId", "companyId"]) {
      assert.equal(field in result.body, false);
    }
  });

  await t.test("partial update preserves other fields and existing order relationships", async () => {
    orderRepository.createForCompany("icare", {
      id: "contact-order",
      customerUserId: contact.id,
      customer: { email: contact.email },
      items: [],
      total: 0,
      status: "Pending",
      createdAt: now,
      updatedAt: now,
    });
    const result = await request(`/admin/customers/${contact.id}`, {
      token: icareToken,
      method: "PATCH",
      body: { phone: "+970 598 111 111" },
    });
    assert.equal(result.response.status, 200);
    assert.equal(result.body.phone, "+970 598 111 111");
    assert.equal(result.body.email, contact.email);
    assert.equal(result.body.notes, "Requested a callback.");
    assert.equal(result.body.orderCount, 1);
  });

  await t.test("search and type filters use supported contact fields", async () => {
    for (const query of ["q=lina", "q=598%20111", "q=lina%40example.com", "type=lead"]) {
      const result = await request(`/admin/customers?${query}`, { token: icareToken });
      assert.equal(result.response.status, 200);
      assert.equal(result.body.length, 1);
      assert.equal(result.body[0].id, contact.id);
    }
    const customers = await request("/admin/customers?type=customer", { token: icareToken });
    assert.deepEqual(customers.body, []);
  });

  await t.test("invalid email, unsafe text, labels, and unknown fields are rejected", async () => {
    const cases = [
      { email: "invalid", displayName: "Invalid" },
      { email: "unsafe@example.com", displayName: "<script>alert(1)</script>" },
      { email: "labels@example.com", displayName: "Labels", labels: "not-an-array" },
      { email: "unknown@example.com", displayName: "Unknown", unsupported: true },
    ];
    for (const body of cases) {
      const result = await request("/admin/customers", { token: icareToken, body });
      assert.equal(result.response.status, 400);
      assert.equal(result.body.message, "Validation failed.");
      assert.ok(result.body.errors);
    }
  });

  await t.test("cross-tenant reads and mutations are indistinguishable from missing contacts", async () => {
    const attempts = [
      ["GET", `/admin/customers/${contact.id}`],
      ["PATCH", `/admin/customers/${contact.id}`],
      ["POST", `/admin/customers/${contact.id}/archive`],
      ["POST", `/admin/customers/${contact.id}/restore`],
    ];
    for (const [method, pathname] of attempts) {
      const result = await request(pathname, {
        token: otherToken,
        method,
        ...(method === "PATCH" ? { body: { phone: "blocked" } } : {}),
      });
      assert.equal(result.response.status, 404);
      assert.equal(result.body.message, "Contact not found.");
    }
  });

  await t.test("employees with customers.view can list contacts", async () => {
    const result = await request("/admin/customers", { token: employeeToken });
    assert.equal(result.response.status, 200);
    assert.ok(Array.isArray(result.body));
    assert.notEqual(result.body.message, "Tenant admin access required.");
  });

  await t.test("employees with customers.view cannot export the store snapshot", async () => {
    const result = await request("/admin/export-store", { token: employeeToken });
    assert.equal(result.response.status, 403);
    assert.notEqual(result.response.status, 200);
  });

  await t.test("employees without customer permissions and customers remain unauthorized", async () => {
    for (const token of [plainEmployeeToken, customerToken]) {
      const result = await request("/admin/customers", { token });
      assert.equal(result.response.status, 403);
      assert.notEqual(result.body.message, "Tenant admin access required.");
    }
  });

  await t.test("archive filtering and restore preserve the contact", async () => {
    const archived = await request(`/admin/customers/${contact.id}/archive`, {
      token: icareToken,
      method: "POST",
    });
    assert.equal(archived.response.status, 200);
    assert.equal(archived.body.isArchived, true);
    const activeList = await request("/admin/customers", { token: icareToken });
    assert.deepEqual(activeList.body, []);
    const archivedList = await request("/admin/customers?archived=true", { token: icareToken });
    assert.equal(archivedList.body[0].id, contact.id);

    const restored = await request(`/admin/customers/${contact.id}/restore`, {
      token: icareToken,
      method: "POST",
    });
    assert.equal(restored.response.status, 200);
    assert.equal(restored.body.isArchived, false);
    assert.equal(restored.body.orderCount, 1);
  });

  await t.test("pagination returns items with filtered total", async () => {
    const result = await request("/admin/customers?page=1&limit=10", { token: icareToken });
    assert.equal(result.response.status, 200);
    assert.ok(Array.isArray(result.body.items));
    assert.equal(result.body.items.length, 1);
    assert.equal(result.body.total, 1);
    assert.equal(result.body.page, 1);
    assert.equal(result.body.limit, 10);
    assert.equal(result.body.summary.total, 1);
  });
});
