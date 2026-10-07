import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { hashPassword } from "../src/auth/passwords.js";

const dataStoreDir = fs.mkdtempSync(path.join(os.tmpdir(), "igroup-platform-admin-"));
const now = "2026-10-07T00:00:00.000Z";
const password = "PlatformAdmin-test-2026!";
const passwordHash = await hashPassword(password);

fs.writeFileSync(path.join(dataStoreDir, "store.json"), `${JSON.stringify({
  version: 2,
  companies: [
    { id: "icare", slug: "icare", name: "iCare", status: "active", settings: {} },
  ],
  users: [
    {
      id: "super-1",
      name: "Super",
      email: "super@platform.test",
      phone: "",
      password: passwordHash,
      role: "super_admin",
      permissions: [],
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "company-1",
      name: "Company",
      email: "admin@icare.test",
      phone: "",
      password: passwordHash,
      role: "company_admin",
      permissions: [],
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
  ],
  memberships: [
    {
      id: "icare:company-1",
      companyId: "icare",
      userId: "company-1",
      role: "company_admin",
      status: "active",
      permissions: [],
      createdAt: now,
      updatedAt: now,
    },
  ],
  companySites: [],
  deliveryZones: [],
  orders: [],
}, null, 2)}\n`, "utf8");

process.env.DATA_STORE_DIR = dataStoreDir;
process.env.DATABASE_URL = "";
process.env.POSTGRES_URL = "";
process.env.SUPABASE_URL = "";
process.env.SUPABASE_SERVICE_ROLE_KEY = "";
process.env.JWT_SECRET = "platform-admin-role-test-secret";
process.env.NODE_ENV = "test";
process.env.ALLOW_LOCAL_CATALOG_STORAGE = "true";
process.env.UPLOADS_DIR = path.join(dataStoreDir, "uploads");
fs.mkdirSync(process.env.UPLOADS_DIR, { recursive: true });

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
  return { response, body: await response.json().catch(() => null) };
}

async function login(email) {
  const result = await request("/auth/login", { body: { email, password } });
  assert.equal(result.response.status, 200, result.body?.message || "login failed");
  return result.body.token;
}

test.after(() => {
  server.close();
  fs.rmSync(dataStoreDir, { recursive: true, force: true });
});

test("delegated platform_admin access", async () => {
  const superToken = await login("super@platform.test");
  const companyToken = await login("admin@icare.test");

  const created = await request("/platform/users", {
    token: superToken,
    method: "POST",
    body: {
      name: "Platform Admin",
      email: "delegate@platform.test",
      password,
      role: "platform_admin",
    },
  });
  assert.equal(created.response.status, 201);
  assert.equal(created.body.role, "platform_admin");

  const promote = await request("/platform/users", {
    token: superToken,
    method: "POST",
    body: {
      name: "Second Super",
      email: "second-super@platform.test",
      password,
      role: "super_admin",
    },
  });
  assert.equal(promote.response.status, 400);

  const renamed = await request(`/platform/users/${created.body.id}`, {
    token: superToken,
    method: "PATCH",
    body: { name: "Delegated Admin" },
  });
  assert.equal(renamed.response.status, 200);
  assert.equal(renamed.body.role, "platform_admin");
  assert.equal(renamed.body.name, "Delegated Admin");

  const becomeSuper = await request(`/platform/users/${created.body.id}`, {
    token: superToken,
    method: "PATCH",
    body: { role: "super_admin" },
  });
  assert.equal(becomeSuper.response.status, 400);
  assert.equal(becomeSuper.body.role, undefined);

  const delegateToken = await login("delegate@platform.test");

  const companies = await request("/platform/companies", { token: delegateToken });
  assert.equal(companies.response.status, 200);
  assert.ok(companies.body.some((company) => company.id === "icare"));

  const domains = await request("/platform/domains", { token: delegateToken });
  assert.equal(domains.response.status, 200);
  assert.ok(Array.isArray(domains.body));

  const deniedCompany = await request("/platform/companies", { token: companyToken });
  assert.equal(deniedCompany.response.status, 403);

  const manageUsers = await request("/platform/users", {
    token: delegateToken,
    method: "POST",
    body: {
      name: "Nope",
      email: "nope@platform.test",
      password,
      role: "company_admin",
    },
  });
  assert.equal(manageUsers.response.status, 403);

  const manageSuper = await request("/platform/users/super-1", {
    token: delegateToken,
    method: "PATCH",
    body: { name: "Taken" },
  });
  assert.equal(manageSuper.response.status, 403);

  const scope = await request("/platform/companies/icare/scope", {
    token: delegateToken,
    method: "POST",
  });
  assert.equal(scope.response.status, 200);
  assert.equal(scope.body.user.role, "company_admin");
  assert.equal(scope.body.user.globalRole, "platform_admin");
  assert.equal(scope.body.user.isCompanyScope, true);
  assert.equal(scope.body.activeCompany.id, "icare");

  const me = await request("/auth/me", { token: scope.body.token });
  assert.equal(me.response.status, 200);
  assert.equal(me.body.globalRole, "platform_admin");
  assert.equal(me.body.role, "company_admin");
  assert.equal(me.body.isCompanyScope, true);
});
