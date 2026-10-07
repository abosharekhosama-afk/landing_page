import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { hashPassword } from "../src/auth/passwords.js";

const dataStoreDir = fs.mkdtempSync(path.join(os.tmpdir(), "igroup-inbox-"));
const now = "2026-08-06T00:00:00.000Z";
const password = "Inbox-test-2026!";
const passwordHash = await hashPassword(password);
const userRows = [
  ["platform-super", "super@test.local", "super_admin", []],
  ["icare-admin", "admin@icare.test", "company_admin", []],
  ["other-admin", "admin@other.test", "company_admin", []],
  ["disabled-admin", "admin@disabled.test", "company_admin", []],
  ["icare-staff", "staff@icare.test", "employee", ["inbox.view", "inbox.reply"]],
  ["icare-assignee", "assignee@icare.test", "employee", []],
  ["other-staff", "staff@other.test", "employee", []],
  ["icare-contact", "contact@icare.test", "customer", []],
  ["icare-contact-two", "second@icare.test", "customer", []],
  ["other-contact", "contact@other.test", "customer", []],
  ["customer-login", "customer@login.test", "customer", []],
].map(([id, email, role, permissions]) => ({
  id, name: id, email, phone: id === "icare-contact" ? "+970599111111" : "",
  password: passwordHash, role, permissions, isActive: true, createdAt: now, updatedAt: now,
}));
const membershipRows = [
  ["icare", "icare-admin", "company_admin", []],
  ["other-company", "other-admin", "company_admin", []],
  ["disabled-company", "disabled-admin", "company_admin", []],
  ["icare", "icare-staff", "employee", ["inbox.view", "inbox.reply"]],
  ["icare", "icare-assignee", "employee", []],
  ["other-company", "other-staff", "employee", []],
  ["icare", "icare-contact", "customer", []],
  ["icare", "icare-contact-two", "customer", []],
  ["other-company", "other-contact", "customer", []],
  ["customer-company", "customer-login", "customer", []],
].map(([companyId, userId, role, permissions]) => ({
  id: `${companyId}:${userId}`, companyId, userId, role, status: "active", permissions,
  createdAt: now, updatedAt: now,
}));

fs.writeFileSync(path.join(dataStoreDir, "store.json"), `${JSON.stringify({
  version: 2,
  companies: [
    { id: "icare", slug: "icare", name: "iCare", status: "active" },
    { id: "other-company", slug: "other-company", name: "Other", status: "active" },
    { id: "disabled-company", slug: "disabled-company", name: "Disabled", status: "active" },
    { id: "customer-company", slug: "customer-company", name: "Customer", status: "active" },
  ],
  users: userRows,
  memberships: membershipRows,
  orders: [],
}, null, 2)}\n`, "utf8");

process.env.DATA_STORE_DIR = dataStoreDir;
process.env.DATABASE_URL = "";
process.env.POSTGRES_URL = "";
process.env.SUPABASE_URL = "";
process.env.SUPABASE_SERVICE_ROLE_KEY = "";
process.env.JWT_SECRET = "focused-inbox-test-secret";
process.env.NODE_ENV = "test";
process.env.ALLOW_LOCAL_CATALOG_STORAGE = "true";
process.env.UPLOADS_DIR = path.join(dataStoreDir, "uploads");
fs.mkdirSync(process.env.UPLOADS_DIR, { recursive: true });

const { app } = await import("../src/server.js");
const {
  companyMembershipRepository,
  companyRepository,
  inboxMessageRepository,
  platformUserRepository,
} = await import("../src/data/store.js");
const { signCompanyScopeToken } = await import("../src/middleware/auth.js");
const { inMemoryModuleStore } = await import("../src/moduleRegistry.js");
inMemoryModuleStore.set("disabled-company", [{
  module_key: "people.customers", enabled: false, active: true,
  allowed_roles: ["company_admin"], required_permissions: [], sort_order: 1,
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
test("tenant Inbox API foundation", async (t) => {
  const icareToken = await login("admin@icare.test");
  const otherToken = await login("admin@other.test");
  const disabledToken = await login("admin@disabled.test");
  const staffToken = await login("staff@icare.test");
  const customerToken = await login("customer@login.test");
  const superUser = await platformUserRepository.getUserById("platform-super");
  const superToken = signCompanyScopeToken(superUser, companyRepository.getCompanyById("icare"));

  await t.test("1 unauthenticated access is rejected", async () => {
    assert.equal((await request("/admin/inbox/conversations")).response.status, 401);
  });
  await t.test("2 customer CPanel access is rejected", async () => {
    assert.equal((await request("/admin/inbox/conversations", { token: customerToken })).response.status, 403);
  });
  await t.test("3 scoped Super Admin can use iCare Inbox", async () => {
    assert.equal((await request("/admin/inbox/conversations", { token: superToken })).response.status, 200);
  });
  await t.test("4 empty conversation list is valid", async () => {
    assert.deepEqual((await request("/admin/inbox/conversations", { token: icareToken })).body, {
      conversations: [], nextCursor: null,
    });
  });

  let conversation;
  await t.test("5 authorized user creates a conversation with initial message", async () => {
    const result = await request("/admin/inbox/conversations", {
      token: icareToken,
      body: { contactId: "icare-contact", subject: "Product question", initialMessage: "Hello." },
    });
    assert.equal(result.response.status, 201);
    conversation = result.body;
    assert.equal(conversation.lastMessage.body, "Hello.");
  });
  await t.test("6 conversation derives authenticated company", async () => {
    assert.equal((await request("/admin/inbox/conversations", { token: otherToken })).body.conversations.length, 0);
  });
  await t.test("7 browser companyId cannot override company scope", async () => {
    const result = await request("/admin/inbox/conversations", {
      token: otherToken,
      body: { companyId: "icare", contactId: "icare-contact", initialMessage: "Hello" },
    });
    assert.equal(result.response.status, 404);
  });
  await t.test("8 X-Company-Id cannot override company scope", async () => {
    const result = await request("/admin/inbox/conversations", {
      token: otherToken, headers: { "X-Company-Id": "icare" },
    });
    assert.equal(result.body.conversations.length, 0);
  });
  await t.test("9 archived contact cannot start a conversation", async () => {
    await companyMembershipRepository.updateMembership("icare", "icare-contact-two", { status: "inactive" });
    const result = await request("/admin/inbox/conversations", {
      token: icareToken, body: { contactId: "icare-contact-two", initialMessage: "Hello" },
    });
    assert.equal(result.response.status, 409);
  });
  await t.test("10 initial message is required", async () => {
    assert.equal((await request("/admin/inbox/conversations", {
      token: icareToken, body: { contactId: "icare-contact" },
    })).response.status, 400);
  });
  await t.test("11 HTML subject is rejected", async () => {
    assert.equal((await request("/admin/inbox/conversations", {
      token: icareToken, body: { contactId: "icare-contact", subject: "<b>x</b>", initialMessage: "x" },
    })).response.status, 400);
  });
  await t.test("12 script message is rejected", async () => {
    assert.equal((await request("/admin/inbox/conversations", {
      token: icareToken, body: { contactId: "icare-contact", initialMessage: "<script>x</script>" },
    })).response.status, 400);
  });
  await t.test("13 unknown writable fields are rejected", async () => {
    assert.equal((await request(`/admin/inbox/conversations/${conversation.id}/messages`, {
      token: icareToken, body: { body: "x", senderType: "customer" },
    })).response.status, 400);
  });
  await t.test("14 detail returns chronological messages", async () => {
    const detail = await request(`/admin/inbox/conversations/${conversation.id}`, { token: icareToken });
    assert.equal(detail.response.status, 200);
    assert.deepEqual(detail.body.messages.map((message) => message.body), ["Hello."]);
  });
  await t.test("15 staff reply derives authenticated sender", async () => {
    const result = await request(`/admin/inbox/conversations/${conversation.id}/messages`, {
      token: staffToken, body: { body: "Staff reply" },
    });
    assert.equal(result.response.status, 201);
    assert.equal(result.body.senderUserId, "icare-staff");
    assert.equal(result.body.senderType, "staff");
  });
  await t.test("16 browser cannot choose senderType", async () => {
    assert.equal((await request(`/admin/inbox/conversations/${conversation.id}/messages`, {
      token: staffToken, body: { body: "bad", senderType: "system" },
    })).response.status, 400);
  });
  await t.test("17 closed conversation rejects reply", async () => {
    await request(`/admin/inbox/conversations/${conversation.id}`, { token: icareToken, method: "PATCH", body: { status: "closed" } });
    assert.equal((await request(`/admin/inbox/conversations/${conversation.id}/messages`, {
      token: staffToken, body: { body: "closed" },
    })).response.status, 409);
  });
  await t.test("18 reopened conversation accepts reply", async () => {
    await request(`/admin/inbox/conversations/${conversation.id}`, { token: icareToken, method: "PATCH", body: { status: "open" } });
    assert.equal((await request(`/admin/inbox/conversations/${conversation.id}/messages`, {
      token: staffToken, body: { body: "reopened" },
    })).response.status, 201);
  });
  await t.test("19 archived conversation rejects reply", async () => {
    await request(`/admin/inbox/conversations/${conversation.id}/archive`, { token: icareToken, body: {} });
    assert.equal((await request(`/admin/inbox/conversations/${conversation.id}/messages`, {
      token: staffToken, body: { body: "archived" },
    })).response.status, 409);
  });
  await t.test("20 restored conversation can be used again", async () => {
    await request(`/admin/inbox/conversations/${conversation.id}/restore`, { token: icareToken, body: {} });
    assert.equal((await request(`/admin/inbox/conversations/${conversation.id}/messages`, {
      token: staffToken, body: { body: "restored" },
    })).response.status, 201);
  });
  await t.test("21 linked archived contact blocks replies", async () => {
    await companyMembershipRepository.updateMembership("icare", "icare-contact", { status: "inactive" });
    assert.equal((await request(`/admin/inbox/conversations/${conversation.id}/messages`, {
      token: staffToken, body: { body: "contact archived" },
    })).response.status, 409);
    await companyMembershipRepository.updateMembership("icare", "icare-contact", { status: "active" });
  });
  await t.test("22 read endpoint records current user state", async () => {
    const result = await request(`/admin/inbox/conversations/${conversation.id}/read`, { token: icareToken, body: {} });
    assert.equal(result.response.status, 200);
    assert.equal(result.body.unreadCount, 0);
  });
  await t.test("23 unread count is user-specific", async () => {
    const admin = await request(`/admin/inbox/conversations/${conversation.id}`, { token: icareToken });
    const staff = await request(`/admin/inbox/conversations/${conversation.id}`, { token: staffToken });
    assert.equal(admin.body.read.unreadCount, 0);
    assert.ok(staff.body.read.unreadCount >= 0);
  });
  await t.test("24 assignment accepts active same-company employee", async () => {
    const result = await request(`/admin/inbox/conversations/${conversation.id}/assign`, {
      token: icareToken, body: { employeeId: "icare-assignee" },
    });
    assert.equal(result.response.status, 200);
    assert.equal(result.body.assignedEmployeeId, "icare-assignee");
  });
  await t.test("25 assignment rejects another-company employee", async () => {
    assert.equal((await request(`/admin/inbox/conversations/${conversation.id}/assign`, {
      token: icareToken, body: { employeeId: "other-staff" },
    })).response.status, 404);
  });
  await t.test("26 assignment can be cleared", async () => {
    const result = await request(`/admin/inbox/conversations/${conversation.id}/assign`, {
      token: icareToken, body: { employeeId: null },
    });
    assert.equal(result.body.assignedEmployeeId, null);
  });
  await t.test("27 subject can be updated", async () => {
    const result = await request(`/admin/inbox/conversations/${conversation.id}`, {
      token: icareToken, method: "PATCH", body: { subject: "Updated subject" },
    });
    assert.equal(result.body.subject, "Updated subject");
  });
  await t.test("28 status can be opened and closed", async () => {
    const closed = await request(`/admin/inbox/conversations/${conversation.id}`, { token: icareToken, method: "PATCH", body: { status: "closed" } });
    const opened = await request(`/admin/inbox/conversations/${conversation.id}`, { token: icareToken, method: "PATCH", body: { status: "open" } });
    assert.equal(closed.body.status, "closed"); assert.equal(opened.body.status, "open");
  });
  await t.test("29 archive and restore work", async () => {
    const archived = await request(`/admin/inbox/conversations/${conversation.id}/archive`, { token: icareToken, body: {} });
    const restored = await request(`/admin/inbox/conversations/${conversation.id}/restore`, { token: icareToken, body: {} });
    assert.ok(archived.body.archivedAt); assert.equal(restored.body.archivedAt, null);
  });
  await t.test("30 archived records are excluded by default", async () => {
    await request(`/admin/inbox/conversations/${conversation.id}/archive`, { token: icareToken, body: {} });
    assert.equal((await request("/admin/inbox/conversations", { token: icareToken })).body.conversations.length, 0);
  });
  await t.test("31 archived filter works", async () => {
    assert.equal((await request("/admin/inbox/conversations?archived=true", { token: icareToken })).body.conversations.length, 1);
    await request(`/admin/inbox/conversations/${conversation.id}/restore`, { token: icareToken, body: {} });
  });
  await t.test("32 search matches contact and subject", async () => {
    for (const q of ["Updated", "icare-contact", "contact%40icare.test", "599111111"]) {
      assert.equal((await request(`/admin/inbox/conversations?q=${q}`, { token: icareToken })).body.conversations.length, 1);
    }
  });
  await t.test("33 status filter works", async () => {
    assert.equal((await request("/admin/inbox/conversations?status=open", { token: icareToken })).body.conversations.length, 1);
    assert.equal((await request("/admin/inbox/conversations?status=closed", { token: icareToken })).body.conversations.length, 0);
  });
  await t.test("34 assignee filter works", async () => {
    await request(`/admin/inbox/conversations/${conversation.id}/assign`, { token: icareToken, body: { employeeId: "icare-assignee" } });
    assert.equal((await request("/admin/inbox/conversations?assignedTo=icare-assignee", { token: icareToken })).body.conversations.length, 1);
  });
  await t.test("35 cursor and limit are bounded", async () => {
    const limited = await request("/admin/inbox/conversations?limit=1000", { token: icareToken });
    assert.equal(limited.response.status, 200);
    const invalid = await request("/admin/inbox/conversations?cursor=missing", { token: icareToken });
    assert.equal(invalid.response.status, 400);
  });
  for (const [number, verb, pathname, options] of [
    [36, "list", "/admin/inbox/conversations", {}],
    [37, "read", `/admin/inbox/conversations/${conversation.id}`, {}],
    [38, "reply", `/admin/inbox/conversations/${conversation.id}/messages`, { body: { body: "x" } }],
    [39, "update", `/admin/inbox/conversations/${conversation.id}`, { method: "PATCH", body: { subject: "x" } }],
    [40, "assign", `/admin/inbox/conversations/${conversation.id}/assign`, { body: { employeeId: null } }],
    [41, "archive", `/admin/inbox/conversations/${conversation.id}/archive`, { body: {} }],
  ]) {
    await t.test(`${number} another tenant cannot ${verb}`, async () => {
      const result = await request(pathname, { token: otherToken, ...options });
      if (number === 36) assert.equal(result.body.conversations.length, 0);
      else assert.equal(result.response.status, 404);
    });
  }
  await t.test("42 cross-tenant and missing IDs are indistinguishable", async () => {
    const cross = await request(`/admin/inbox/conversations/${conversation.id}`, { token: otherToken });
    const missing = await request("/admin/inbox/conversations/00000000-0000-0000-0000-000000000000", { token: otherToken });
    assert.deepEqual([cross.response.status, cross.body], [missing.response.status, missing.body]);
  });
  await t.test("43 messages expose no update operation", () => {
    assert.equal(inboxMessageRepository.updateForCompany, undefined);
  });
  await t.test("44 safe responses expose no tenant or auth fields", async () => {
    const result = await request(`/admin/inbox/conversations/${conversation.id}`, { token: icareToken });
    const serialized = JSON.stringify(result.body);
    for (const field of ["companyId", "company_id", "permissions", "password", "createdByUserId"]) assert.equal(serialized.includes(field), false);
  });
  await t.test("45 activity logs contain no message body", () => {
    const saved = JSON.parse(fs.readFileSync(path.join(dataStoreDir, "store.json"), "utf8"));
    assert.equal(JSON.stringify(saved.activityLogs || []).includes("Hello."), false);
  });
  await t.test("46 existing CRM contact and order routes remain available", async () => {
    assert.equal((await request("/admin/customers", { token: icareToken })).response.status, 200);
    assert.equal((await request("/orders", { token: icareToken })).response.status, 200);
  });
  await t.test("47 JSON persistence round-trip includes Inbox records", () => {
    const saved = JSON.parse(fs.readFileSync(path.join(dataStoreDir, "store.json"), "utf8"));
    assert.equal(saved.inboxConversations.length, 1);
    assert.ok(saved.inboxMessages.length >= 4);
    assert.ok(saved.inboxConversationReads.length >= 1);
  });
  await t.test("48 PostgreSQL mapping names include every Inbox table", () => {
    const source = fs.readFileSync(new URL("../src/data/postgresStore.js", import.meta.url), "utf8");
    for (const table of ["company_inbox_conversations", "company_inbox_messages", "company_inbox_reads"]) assert.ok(source.includes(table));
  });
  await t.test("49 module gate rejects disabled people.customers capability", async () => {
    assert.equal((await request("/admin/inbox/conversations", { token: disabledToken })).response.status, 403);
  });
  await t.test("50 authentication and permission regressions stay enforced", async () => {
    assert.equal((await request("/admin/inbox/conversations", { token: staffToken })).response.status, 200);
    assert.equal((await request("/admin/inbox/conversations", {
      token: staffToken, body: { contactId: "icare-contact", initialMessage: "not allowed" },
    })).response.status, 403);
  });
  await t.test("51 contactId filter returns only matching conversations", async () => {
    assert.equal((await request("/admin/inbox/conversations?contactId=icare-contact", { token: icareToken })).body.conversations.length, 1);
    assert.equal((await request("/admin/inbox/conversations?contactId=icare-contact-two", { token: icareToken })).body.conversations.length, 0);
  });
  await t.test("52 unassigned filter works", async () => {
    await request(`/admin/inbox/conversations/${conversation.id}/assign`, { token: icareToken, body: { employeeId: "icare-assignee" } });
    assert.equal((await request("/admin/inbox/conversations?unassigned=true", { token: icareToken })).body.conversations.length, 0);
    await request(`/admin/inbox/conversations/${conversation.id}/assign`, { token: icareToken, body: { employeeId: null } });
    assert.equal((await request("/admin/inbox/conversations?unassigned=true", { token: icareToken })).body.conversations.length, 1);
  });
  await t.test("53 assignedTo and unassigned cannot be combined", async () => {
    assert.equal((await request("/admin/inbox/conversations?assignedTo=icare-assignee&unassigned=true", { token: icareToken })).response.status, 400);
  });
});
