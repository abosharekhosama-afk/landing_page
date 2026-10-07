import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { hashPassword } from "../src/auth/passwords.js";

const dataStoreDir = fs.mkdtempSync(path.join(os.tmpdir(), "igroup-website-texts-"));
const now = "2026-08-10T00:00:00.000Z";
const password = "Texts-test-2026!";
const passwordHash = await hashPassword(password);
const userRows = [
  ["platform-super", "super@test.local", "super_admin", []],
  ["icare-admin", "admin@icare.test", "company_admin", []],
  ["icare-texts-employee", "texts@icare.test", "employee", ["website_texts.manage"]],
  ["icare-media-employee", "media-only@icare.test", "employee", ["website_media.manage"]],
  ["icare-plain-employee", "plain@icare.test", "employee", []],
  ["icare-texts-manager", "texts-manager@icare.test", "manager", ["website_texts.manage"]],
].map(([id, email, role, permissions]) => ({
  id, name: id, email, password: passwordHash, role, permissions, isActive: true, createdAt: now, updatedAt: now,
}));
const membershipRows = [
  ["icare", "icare-admin", "company_admin", []],
  ["icare", "icare-texts-employee", "employee", ["website_texts.manage"]],
  ["icare", "icare-media-employee", "employee", ["website_media.manage"]],
  ["icare", "icare-plain-employee", "employee", []],
  ["icare", "icare-texts-manager", "manager", ["website_texts.manage"]],
].map(([companyId, userId, role, permissions]) => ({
  id: `${companyId}:${userId}`, companyId, userId, role, status: "active", permissions, createdAt: now, updatedAt: now,
}));

fs.writeFileSync(path.join(dataStoreDir, "store.json"), `${JSON.stringify({
  version: 2,
  companies: [
    { id: "icare", slug: "icare", name: "iCare", status: "active" },
  ],
  users: userRows,
  memberships: membershipRows,
  websiteTexts: [
    { id: "icare-text", key: "tenant.proof", valueEn: "iCare", valueAr: "", isActive: true, company_id: "icare", createdAt: now, updatedAt: now },
  ],
}, null, 2)}\n`, "utf8");

process.env.DATA_STORE_DIR = dataStoreDir;
process.env.DATABASE_URL = "";
process.env.POSTGRES_URL = "";
process.env.SUPABASE_URL = "";
process.env.SUPABASE_SERVICE_ROLE_KEY = "";
process.env.JWT_SECRET = "focused-website-texts-test-secret";
process.env.NODE_ENV = "test";
process.env.ALLOW_LOCAL_CATALOG_STORAGE = "true";
process.env.UPLOADS_DIR = path.join(dataStoreDir, "uploads");
fs.mkdirSync(process.env.UPLOADS_DIR, { recursive: true });

const { app } = await import("../src/server.js");
const { platformUserRepository, companyRepository } = await import("../src/data/store.js");
const { signCompanyScopeToken } = await import("../src/middleware/auth.js");

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

test("website texts admin API honors employee website_texts.manage", async (t) => {
  const adminToken = await login("admin@icare.test");
  const textsEmployeeToken = await login("texts@icare.test");
  const mediaOnlyToken = await login("media-only@icare.test");
  const plainEmployeeToken = await login("plain@icare.test");
  const textsManagerToken = await login("texts-manager@icare.test");
  const superUser = await platformUserRepository.getUserById("platform-super");
  const superToken = signCompanyScopeToken(superUser, companyRepository.getCompanyById("icare"));

  await t.test("1 unauthenticated access is rejected", async () => {
    assert.equal((await request("/admin/website-texts")).response.status, 401);
  });

  await t.test("2 company_admin can list website texts", async () => {
    const result = await request("/admin/website-texts", { token: adminToken });
    assert.equal(result.response.status, 200);
    assert.deepEqual(result.body.map((item) => item.id), ["icare-text"]);
  });

  await t.test("3 scoped Super Admin can list website texts", async () => {
    const result = await request("/admin/website-texts", { token: superToken });
    assert.equal(result.response.status, 200);
    assert.deepEqual(result.body.map((item) => item.id), ["icare-text"]);
  });

  await t.test("4 employee with website_texts.manage can list website texts", async () => {
    const result = await request("/admin/website-texts", { token: textsEmployeeToken });
    assert.equal(result.response.status, 200);
    assert.deepEqual(result.body.map((item) => item.id), ["icare-text"]);
  });

  await t.test("5 employee with website_texts.manage can update a website text", async () => {
    const result = await request("/admin/website-texts/icare-text", {
      token: textsEmployeeToken,
      method: "PATCH",
      body: { valueEn: "iCare Updated", key: "tenant.proof" },
    });
    assert.equal(result.response.status, 200);
    assert.equal(result.body.valueEn, "iCare Updated");
  });

  await t.test("6 manager with website_texts.manage can list website texts", async () => {
    const result = await request("/admin/website-texts", { token: textsManagerToken });
    assert.equal(result.response.status, 200);
    assert.deepEqual(result.body.map((item) => item.id), ["icare-text"]);
  });

  await t.test("7 employee with only website_media.manage is denied", async () => {
    const result = await request("/admin/website-texts", { token: mediaOnlyToken });
    assert.equal(result.response.status, 403);
    assert.equal(result.body.message, "Website texts permission required.");
  });

  await t.test("8 employee with only website_media.manage cannot update a website text", async () => {
    const result = await request("/admin/website-texts/icare-text", {
      token: mediaOnlyToken,
      method: "PATCH",
      body: { valueEn: "nope" },
    });
    assert.equal(result.response.status, 403);
  });

  await t.test("9 employee with no permissions is denied", async () => {
    const result = await request("/admin/website-texts", { token: plainEmployeeToken });
    assert.equal(result.response.status, 403);
    assert.equal(result.body.message, "Website texts permission required.");
  });
});
