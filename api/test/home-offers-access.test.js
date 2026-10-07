import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { hashPassword } from "../src/auth/passwords.js";

const dataStoreDir = fs.mkdtempSync(path.join(os.tmpdir(), "igroup-home-offers-access-"));
const now = "2026-09-30T00:00:00.000Z";
const password = "Banners-access-2026!";
const passwordHash = await hashPassword(password);

const userRows = [
  ["icare-admin", "admin@icare.test", "company_admin", []],
  ["icare-banners-employee", "banners@icare.test", "employee", ["banners.manage"]],
  ["icare-media-employee", "media-only@icare.test", "employee", ["website_media.manage"]],
  ["icare-plain-employee", "plain@icare.test", "employee", []],
  ["icare-banners-manager", "banners-manager@icare.test", "manager", ["banners.manage"]],
  ["eb-admin", "admin@eb.test", "company_admin", []],
].map(([id, email, role, permissions]) => ({
  id, name: id, email, password: passwordHash, role, permissions, isActive: true, createdAt: now, updatedAt: now,
}));

const membershipRows = [
  ["icare", "icare-admin", "company_admin", []],
  ["icare", "icare-banners-employee", "employee", ["banners.manage"]],
  ["icare", "icare-media-employee", "employee", ["website_media.manage"]],
  ["icare", "icare-plain-employee", "employee", []],
  ["icare", "icare-banners-manager", "manager", ["banners.manage"]],
  ["eb-chemical", "eb-admin", "company_admin", []],
].map(([companyId, userId, role, permissions]) => ({
  id: `${companyId}:${userId}`, companyId, userId, role, status: "active", permissions, createdAt: now, updatedAt: now,
}));

fs.writeFileSync(path.join(dataStoreDir, "store.json"), `${JSON.stringify({
  version: 2,
  companies: [
    { id: "icare", slug: "icare", name: "iCare", status: "active" },
    { id: "eb-chemical", slug: "eb-chemical", name: "EB Chemical", status: "active" },
  ],
  users: userRows,
  memberships: membershipRows,
  offers: [],
  categoryCards: [
    {
      key: "home",
      company_id: "icare",
      image: "/homepage-categories/home-care.jpg",
      label: { en: "Home care", ar: "" },
      title: { en: "Daily cleaning made easier", ar: "" },
    },
  ],
}, null, 2)}\n`, "utf8");

process.env.DATA_STORE_DIR = dataStoreDir;
process.env.DATABASE_URL = "";
process.env.POSTGRES_URL = "";
process.env.SUPABASE_URL = "";
process.env.SUPABASE_SERVICE_ROLE_KEY = "";
process.env.JWT_SECRET = "focused-home-offers-access-secret";
process.env.NODE_ENV = "test";
process.env.UPLOADS_DIR = path.join(dataStoreDir, "uploads");
fs.mkdirSync(process.env.UPLOADS_DIR, { recursive: true });

const { app } = await import("../src/server.js");

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
  assert.equal(result.response.status, 200, JSON.stringify(result.body));
  return result.body.token;
}

const validBanner = () => ({
  title: { en: "Winter sale", ar: "" },
  description: { en: "Up to 50% off", ar: "" },
  ctaText: { en: "Shop now", ar: "" },
  ctaLink: "products",
  displayOrder: 1,
  isActive: true,
  transitionDurationMs: 5000,
});

test.after(() => {
  server.close();
  fs.rmSync(dataStoreDir, { recursive: true, force: true });
});

test("home banner writes honor the existing banners.manage permission", async (t) => {
  const adminToken = await login("admin@icare.test");
  const bannersToken = await login("banners@icare.test");
  const mediaOnlyToken = await login("media-only@icare.test");
  const plainToken = await login("plain@icare.test");
  const managerToken = await login("banners-manager@icare.test");

  await t.test("unauthenticated create is rejected", async () => {
    const result = await request("/home-offers", { body: validBanner() });
    assert.equal(result.response.status, 401);
  });

  await t.test("company_admin keeps create access", async () => {
    const result = await request("/home-offers", { token: adminToken, body: validBanner() });
    assert.equal(result.response.status, 201, JSON.stringify(result.body));
  });

  await t.test("employee with banners.manage can create, list, update and delete a banner", async () => {
    const created = await request("/home-offers", {
      token: bannersToken,
      body: { ...validBanner(), title: { en: "Media banner", ar: "" } },
    });
    assert.equal(created.response.status, 201, JSON.stringify(created.body));

    const list = await request("/home-offers/all", { token: bannersToken });
    assert.equal(list.response.status, 200);
    assert.ok(list.body.some((item) => item.id === created.body.id));

    const updated = await request(`/home-offers/${created.body.id}`, {
      token: bannersToken,
      method: "PUT",
      body: { ctaLink: "https://example.com/sale" },
    });
    assert.equal(updated.response.status, 200, JSON.stringify(updated.body));
    assert.equal(updated.body.ctaLink, "https://example.com/sale");

    const removed = await request(`/home-offers/${created.body.id}`, {
      token: bannersToken,
      method: "DELETE",
    });
    assert.equal(removed.response.status, 204);
  });

  await t.test("employee with banners.manage can update a homepage category card", async () => {
    const result = await request("/home-offers/category-cards/home", {
      token: bannersToken,
      method: "PUT",
      body: { image: "/homepage-categories/home-updated.jpg" },
    });
    assert.equal(result.response.status, 200, JSON.stringify(result.body));
    assert.equal(result.body.image, "/homepage-categories/home-updated.jpg");
  });

  await t.test("employee with only website_media.manage is denied every banner write", async () => {
    const create = await request("/home-offers", { token: mediaOnlyToken, body: validBanner() });
    assert.equal(create.response.status, 403);
    assert.equal(create.body.message, "Banner management permission required.");

    const list = await request("/home-offers/all", { token: mediaOnlyToken });
    assert.equal(list.response.status, 200);

    const card = await request("/home-offers/category-cards/home", {
      token: mediaOnlyToken,
      method: "PUT",
      body: { image: "/homepage-categories/nope.jpg" },
    });
    assert.equal(card.response.status, 403);
  });

  await t.test("employee with no permissions is denied every banner write", async () => {
    const create = await request("/home-offers", { token: plainToken, body: validBanner() });
    assert.equal(create.response.status, 403);

    const existing = await request("/home-offers/all", { token: plainToken });
    assert.equal(existing.response.status, 200);
    const firstId = existing.body[0]?.id;
    assert.ok(firstId);

    const update = await request(`/home-offers/${firstId}`, {
      token: plainToken,
      method: "PUT",
      body: { displayOrder: 9 },
    });
    assert.equal(update.response.status, 403);

    const remove = await request(`/home-offers/${firstId}`, { token: plainToken, method: "DELETE" });
    assert.equal(remove.response.status, 403);
  });

  await t.test("manager role keeps the previous admin-only gate", async () => {
    const result = await request("/home-offers", {
      token: managerToken,
      body: { ...validBanner(), title: { en: "Manager banner", ar: "" } },
    });
    assert.equal(result.response.status, 403);
  });

  await t.test("writes stay tenant-scoped to the employee company", async () => {
    const ebToken = await login("admin@eb.test");
    const ebCreate = await request("/home-offers", {
      token: ebToken,
      body: { ...validBanner(), title: { en: "EB banner", ar: "" } },
    });
    assert.equal(ebCreate.response.status, 201, JSON.stringify(ebCreate.body));

    const icareList = await request("/home-offers/all", { token: adminToken });
    assert.equal(icareList.response.status, 200);
    assert.equal(icareList.body.some((item) => item.id === ebCreate.body.id), false);
  });
});
