import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { hashPassword } from "../src/auth/passwords.js";

const dataStoreDir = fs.mkdtempSync(path.join(os.tmpdir(), "igroup-invoices-"));
const now = "2026-08-06T00:00:00.000Z";
const password = "Invoice-test-2026!";
const passwordHash = await hashPassword(password);
const userRows = [
  ["icare-admin", "admin@icare.test", "company_admin", []],
  ["icare-viewer", "viewer@icare.test", "employee", ["invoices.view"]],
  ["icare-manager", "manager@icare.test", "employee", ["invoices.manage"]],
  ["other-admin", "admin@other.test", "company_admin", []],
].map(([id, email, role, permissions]) => ({
  id, name: id, email, phone: "", password: passwordHash, role, permissions, isActive: true, createdAt: now, updatedAt: now,
}));
const membershipRows = [
  ["icare", "icare-admin", "company_admin", []],
  ["icare", "icare-viewer", "employee", ["invoices.view"]],
  ["icare", "icare-manager", "employee", ["invoices.manage"]],
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
  invoices: [],
  orders: [],
}, null, 2)}\n`, "utf8");

process.env.DATA_STORE_DIR = dataStoreDir;
process.env.DATABASE_URL = "";
process.env.POSTGRES_URL = "";
process.env.SUPABASE_URL = "";
process.env.SUPABASE_SERVICE_ROLE_KEY = "";
process.env.JWT_SECRET = "focused-invoices-test-secret";
process.env.NODE_ENV = "test";
process.env.ALLOW_LOCAL_CATALOG_STORAGE = "true";
process.env.UPLOADS_DIR = path.join(dataStoreDir, "uploads");
fs.mkdirSync(process.env.UPLOADS_DIR, { recursive: true });

const { app } = await import("../src/server.js");
const { inMemoryModuleStore } = await import("../src/moduleRegistry.js");
inMemoryModuleStore.set("icare", [{
  module_key: "operations.invoices",
  enabled: true,
  active: true,
  allowed_roles: ["super_admin", "company_admin", "admin", "manager", "employee", "staff"],
  required_permissions: ["invoices.view", "invoices.manage"],
  sort_order: 310,
}]);
inMemoryModuleStore.set("other-company", [{
  module_key: "operations.invoices",
  enabled: true,
  active: true,
  allowed_roles: ["super_admin", "company_admin", "admin", "manager", "employee", "staff"],
  required_permissions: ["invoices.view", "invoices.manage"],
  sort_order: 310,
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

const sampleInvoice = {
  customer_name: "Jane Doe",
  customer_email: "jane@example.com",
  customer_phone: "0500000000",
  status: "issued",
  currency: "ILS",
  issue_date: "2026-08-18",
  due_date: "2026-09-01",
  notes: "Net 14",
  line_items: [{ description: "Floor cleaner", quantity: 2, unit_price: 25 }],
};

test.after(() => {
  server.close();
  fs.rmSync(dataStoreDir, { recursive: true, force: true });
});

test("invoices admin API", async (t) => {
  const adminToken = await login("admin@icare.test");
  const viewerToken = await login("viewer@icare.test");
  const managerToken = await login("manager@icare.test");
  const otherToken = await login("admin@other.test");

  await t.test("unauthenticated access is rejected", async () => {
    assert.equal((await request("/admin/invoices")).response.status, 401);
  });

  await t.test("viewer can list invoices but cannot create", async () => {
    const list = await request("/admin/invoices", { token: viewerToken });
    assert.equal(list.response.status, 200);
    assert.deepEqual(list.body, []);
    const create = await request("/admin/invoices", { token: viewerToken, body: sampleInvoice });
    assert.equal(create.response.status, 403);
  });

  let invoiceId;
  await t.test("manager can create an invoice with line items and totals", async () => {
    const result = await request("/admin/invoices", { token: managerToken, body: sampleInvoice });
    assert.equal(result.response.status, 201);
    assert.equal(result.body.customer_name, "Jane Doe");
    assert.equal(result.body.status, "issued");
    assert.equal(result.body.due_date, "2026-09-01");
    assert.equal(result.body.currency, "ILS");
    assert.equal(result.body.subtotal, 50);
    assert.equal(result.body.tax_total, 0);
    assert.equal(result.body.total, 50);
    assert.equal(result.body.line_items.length, 1);
    assert.match(result.body.invoice_number, /^INV-/);
    invoiceId = result.body.id;
  });

  await t.test("list and detail stay tenant-scoped", async () => {
    const list = await request("/admin/invoices", { token: adminToken });
    assert.equal(list.response.status, 200);
    assert.equal(list.body.length, 1);
    const detail = await request(`/admin/invoices/${invoiceId}`, { token: viewerToken });
    assert.equal(detail.response.status, 200);
    assert.equal(detail.body.id, invoiceId);
    const otherList = await request("/admin/invoices", { token: otherToken });
    assert.equal(otherList.response.status, 200);
    assert.equal(otherList.body.length, 0);
    const otherDetail = await request(`/admin/invoices/${invoiceId}`, { token: otherToken });
    assert.equal(otherDetail.response.status, 404);
  });

  await t.test("missing invoices return not found", async () => {
    const missing = await request("/admin/invoices/missing-invoice", { token: adminToken });
    assert.equal(missing.response.status, 404);
  });

  await t.test("PATCH can replace line items and mark paid or unpaid", async () => {
    const lines = await request(`/admin/invoices/${invoiceId}`, {
      token: managerToken,
      method: "PATCH",
      body: {
        notes: "Updated note",
        line_items: [
          { description: "Floor cleaner", quantity: 1, unit_price: 25 },
          { description: "Wax", quantity: 1, unit_price: 10 },
        ],
      },
    });
    assert.equal(lines.response.status, 200);
    assert.equal(lines.body.notes, "Updated note");
    assert.equal(lines.body.line_items.length, 2);
    assert.equal(lines.body.total, 35);

    const paid = await request(`/admin/invoices/${invoiceId}`, {
      token: managerToken,
      method: "PATCH",
      body: { status: "paid" },
    });
    assert.equal(paid.response.status, 200);
    assert.equal(paid.body.status, "paid");

    const unpaid = await request(`/admin/invoices/${invoiceId}`, {
      token: managerToken,
      method: "PATCH",
      body: { status: "issued" },
    });
    assert.equal(unpaid.response.status, 200);
    assert.equal(unpaid.body.status, "issued");
  });

  await t.test("viewer cannot update or void invoices", async () => {
    const patch = await request(`/admin/invoices/${invoiceId}`, {
      token: viewerToken,
      method: "PATCH",
      body: { status: "paid" },
    });
    assert.equal(patch.response.status, 403);
    const voided = await request(`/admin/invoices/${invoiceId}/void`, { token: viewerToken, method: "POST" });
    assert.equal(voided.response.status, 403);
  });

  await t.test("send and download endpoints are not implemented", async () => {
    const send = await request(`/admin/invoices/${invoiceId}/send`, { token: managerToken, method: "POST" });
    assert.equal(send.response.status, 404);
    const download = await request(`/admin/invoices/${invoiceId}/download`, { token: managerToken, method: "GET" });
    assert.equal(download.response.status, 404);
  });

  await t.test("void removes the invoice from active records", async () => {
    const voided = await request(`/admin/invoices/${invoiceId}/void`, { token: managerToken, method: "POST" });
    assert.equal(voided.response.status, 200);
    assert.equal(voided.body.status, "void");
    const list = await request("/admin/invoices", { token: adminToken });
    assert.equal(list.body.length, 0);
    const detail = await request(`/admin/invoices/${invoiceId}`, { token: adminToken });
    assert.equal(detail.response.status, 404);
  });
});
