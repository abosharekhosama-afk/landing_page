import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { hashPassword } from "../src/auth/passwords.js";

const dataStoreDir = fs.mkdtempSync(path.join(os.tmpdir(), "igroup-site-editor-access-"));
const now = "2026-08-10T00:00:00.000Z";
const password = "Site-editor-access-2026!";
const passwordHash = await hashPassword(password);
const users = [
  ["icare-admin", "editor@icare.test", "company_admin", []],
  ["icare-editor-employee", "employee-editor@icare.test", "employee", ["site_editor.access", "site_editor.edit", "site_editor.save"]],
  ["icare-connection-employee", "employee-connection@icare.test", "employee", ["site_editor.connection.manage", "site_editor.manifest.sync"]],
  ["icare-plain-employee", "employee-plain@icare.test", "employee", []],
].map(([id, email, role, permissions]) => ({
  id, name: id, email, password: passwordHash, role, permissions, isActive: true, createdAt: now, updatedAt: now,
}));
const memberships = [
  ["icare", "icare-admin", "company_admin", []],
  ["icare", "icare-editor-employee", "employee", ["site_editor.access", "site_editor.edit", "site_editor.save"]],
  ["icare", "icare-connection-employee", "employee", ["site_editor.connection.manage", "site_editor.manifest.sync"]],
  ["icare", "icare-plain-employee", "employee", []],
].map(([companyId, userId, role, permissions]) => ({
  id: `${companyId}:${userId}`, companyId, userId, role, status: "active", permissions, createdAt: now, updatedAt: now,
}));

fs.writeFileSync(path.join(dataStoreDir, "store.json"), JSON.stringify({
  version: 2,
  companies: [
    { id: "icare", slug: "icare", name: "iCare", status: "active", storefrontUrl: "https://igroup.website/icare", storefrontPath: "/icare" },
  ],
  users,
  memberships,
}, null, 2));

process.env.DATA_STORE_DIR = dataStoreDir;
process.env.SITE_EDITOR_DRAFT_STORE_DIR = path.join(dataStoreDir, "editor-drafts");
process.env.DATABASE_URL = "";
process.env.POSTGRES_URL = "";
process.env.SUPABASE_URL = "";
process.env.SUPABASE_SERVICE_ROLE_KEY = "";
process.env.JWT_SECRET = "site-editor-access-test-secret";
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
  return { status: response.status, body: await response.json().catch(() => null) };
}

async function login(email) {
  const result = await request("/auth/login", { body: { email, password } });
  assert.equal(result.status, 200);
  return result.body.token;
}

test.after(() => {
  server.close();
  fs.rmSync(dataStoreDir, { recursive: true, force: true });
});

test("site editor access honors employee site_editor permissions", async (t) => {
  const adminToken = await login("editor@icare.test");
  const editorEmployeeToken = await login("employee-editor@icare.test");
  const connectionEmployeeToken = await login("employee-connection@icare.test");
  const plainEmployeeToken = await login("employee-plain@icare.test");

  await t.test("1 unauthenticated access is rejected", async () => {
    assert.equal((await request("/site-editor/context")).status, 401);
  });

  await t.test("2 company_admin can read editor context", async () => {
    assert.equal((await request("/site-editor/context", { token: adminToken })).status, 200);
  });

  await t.test("3 employee with site_editor.access can read editor context", async () => {
    assert.equal((await request("/site-editor/context", { token: editorEmployeeToken })).status, 200);
  });

  await t.test("4 employee with site_editor.access can list editor pages", async () => {
    assert.equal((await request("/site-editor/pages", { token: editorEmployeeToken })).status, 200);
  });

  await t.test("5 employee with site_editor.access cannot validate the storefront connection", async () => {
    const result = await request("/site-editor/connection/validate", {
      token: editorEmployeeToken,
      body: { siteManifestUrl: "https://example.test/site-manifest.json" },
    });
    assert.equal(result.status, 403);
  });

  await t.test("6 employee with site_editor.access cannot update the storefront connection", async () => {
    const result = await request("/site-editor/connection", {
      token: editorEmployeeToken,
      method: "PUT",
      body: { siteManifestUrl: "https://example.test/site-manifest.json" },
    });
    assert.equal(result.status, 403);
  });

  await t.test("7 employee with site_editor.access cannot sync the site manifest", async () => {
    const result = await request("/site-editor/manifest/sync", { token: editorEmployeeToken, body: {} });
    assert.equal(result.status, 403);
  });

  await t.test("8 employee with connection perms but no site_editor.access cannot read editor context", async () => {
    const result = await request("/site-editor/context", { token: connectionEmployeeToken });
    assert.equal(result.status, 403);
  });

  await t.test("9 employee with no permissions is denied", async () => {
    assert.equal((await request("/site-editor/context", { token: plainEmployeeToken })).status, 403);
  });
});
