import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { hashPassword } from "../src/auth/passwords.js";

const dataStoreDir = fs.mkdtempSync(path.join(os.tmpdir(), "igroup-fav-addr-"));
const now = "2026-09-23T00:00:00.000Z";
const password = "Favorites-test-2026!";
const passwordHash = await hashPassword(password);
const users = [
  ["velvet-admin", "admin@velvet.test", "company_admin"],
  ["velvet-customer", "customer@velvet.test", "customer"],
  ["other-customer", "customer@other.test", "customer"],
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
  ["velvet:velvet-admin", "velvet", "velvet-admin", "company_admin", []],
  ["velvet:velvet-customer", "velvet", "velvet-customer", "customer", []],
  ["other-company:other-customer", "other-company", "other-customer", "customer", []],
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
    { id: "velvet", slug: "velvet", name: "Velvet", status: "active", isDefault: false },
    { id: "other-company", slug: "other-company", name: "Other Company", status: "active", isDefault: false },
  ],
  users,
  memberships,
  products: [
    {
      id: "velvet-product",
      slug: "velvet-product",
      name: { en: "Velvet Product" },
      company_id: "velvet",
      isActive: true,
      visible: true,
      price: 25,
      currency: "USD",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "other-product",
      slug: "other-product",
      name: { en: "Other Product" },
      company_id: "other-company",
      isActive: true,
      visible: true,
      price: 10,
      currency: "USD",
      createdAt: now,
      updatedAt: now,
    },
  ],
  orders: [],
}, null, 2)}\n`, "utf8");

process.env.DATA_STORE_DIR = dataStoreDir;
process.env.DATABASE_URL = "";
process.env.POSTGRES_URL = "";
process.env.SUPABASE_URL = "";
process.env.SUPABASE_SERVICE_ROLE_KEY = "";
process.env.JWT_SECRET = "focused-favorites-addresses-test-secret";
process.env.NODE_ENV = "test";
process.env.ALLOW_LOCAL_CATALOG_STORAGE = "true";
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
  assert.equal(result.response.status, 200);
  return result.body.token;
}

function tokenPayload(token) {
  return JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
}

test.after(() => {
  server.close();
  fs.rmSync(dataStoreDir, { recursive: true, force: true });
});

test("favorites + addresses API", async (t) => {
  const adminToken = await login("admin@velvet.test");
  const otherToken = await login("customer@other.test");
  // Login once. favorites/addresses writes use touchMembership:false, so the
  // membership.updatedAt (and therefore the JWT membershipVersion) stays
  // stable and the SAME token keeps working without re-login.
  const customerToken = await login("customer@velvet.test");
  const customerVersion = tokenPayload(customerToken).membershipVersion;
  assert.equal(customerVersion, now);

  await t.test("non-customer (admin) gets 403 on favorites", async () => {
    const result = await request("/favorites", { token: adminToken });
    assert.equal(result.response.status, 403);
  });

  await t.test("non-customer (admin) gets 403 on addresses", async () => {
    const result = await request("/addresses", { token: adminToken });
    assert.equal(result.response.status, 403);
  });

  await t.test("same JWT survives favorite write and read (200, not 401)", async () => {
    const add = await request("/favorites/velvet-product", { token: customerToken, method: "POST" });
    assert.equal(add.response.status, 200);
    assert.deepEqual(add.body.productIds, ["velvet-product"]);
    assert.equal(add.body.product.id, "velvet-product");

    const list = await request("/favorites", { token: customerToken });
    assert.equal(list.response.status, 200);
    assert.deepEqual(list.body.productIds, ["velvet-product"]);
    assert.equal(list.body.products.length, 1);
    assert.equal(list.body.products[0].id, "velvet-product");
  });

  await t.test("same JWT survives address write and read (200, not 401)", async () => {
    const created = await request("/addresses", {
      token: customerToken,
      body: { label: "Home", fullName: "Velvet Customer", phone: "599123456", city: "Ramallah", address: "Main St 1", isDefault: true },
    });
    assert.equal(created.response.status, 201);
    assert.equal(created.body.isDefault, true);

    const list = await request("/addresses", { token: customerToken });
    assert.equal(list.response.status, 200);
    assert.equal(list.body.length, 1);
    assert.equal(list.body[0].label, "Home");
  });

  await t.test("same JWT still valid for /auth/me and reflects persisted fields", async () => {
    const me = await request("/auth/me", { token: customerToken });
    assert.equal(me.response.status, 200);
    assert.deepEqual(me.body.user.favoriteProductIds, ["velvet-product"]);
    assert.equal(me.body.user.addresses.length, 1);
    assert.equal(me.body.user.addresses[0].label, "Home");
    // membershipVersion unchanged -> token was never invalidated
    assert.equal(tokenPayload(customerToken).membershipVersion, customerVersion);
  });

  await t.test("same JWT survives PATCH /auth/me profile update (200, not 401)", async () => {
    const patched = await request("/auth/me", {
      token: customerToken,
      method: "PATCH",
      body: { name: "Updated Name", city: "Nablus" },
    });
    assert.equal(patched.response.status, 200);
    assert.equal(patched.body.name, "Updated Name");
    assert.equal(patched.body.city, "Nablus");

    const me = await request("/auth/me", { token: customerToken });
    assert.equal(me.response.status, 200);
    assert.equal(me.body.user.name, "Updated Name");
    assert.equal(me.body.user.city, "Nablus");
    // PATCH /auth/me is a profile edit: membershipVersion must stay stable
    assert.equal(tokenPayload(customerToken).membershipVersion, customerVersion);
  });

  await t.test("duplicate favorite is idempotent / no dupes", async () => {
    const again = await request("/favorites/velvet-product", { token: customerToken, method: "POST" });
    assert.equal(again.response.status, 200);
    assert.deepEqual(again.body.productIds, ["velvet-product"]);

    const list = await request("/favorites", { token: customerToken });
    assert.deepEqual(list.body.productIds, ["velvet-product"]);
  });

  await t.test("product not in company -> 404", async () => {
    const result = await request("/favorites/other-product", { token: customerToken, method: "POST" });
    assert.equal(result.response.status, 404);
  });

  await t.test("other company token cannot see favorites", async () => {
    const list = await request("/favorites", { token: otherToken });
    assert.equal(list.response.status, 200);
    assert.deepEqual(list.body.productIds, []);
  });

  await t.test("remove favorite with same token", async () => {
    const remove = await request("/favorites/velvet-product", { token: customerToken, method: "DELETE" });
    assert.equal(remove.response.status, 200);
    assert.deepEqual(remove.body.productIds, []);
  });

  await t.test("address CRUD + only one default", async () => {
    // Home already exists from the persistence test; add Work as the new default.
    const second = await request("/addresses", {
      token: customerToken,
      body: { label: "Work", fullName: "Velvet Customer", phone: "599654321", city: "Nablus", address: "Work St 2", isDefault: true },
    });
    assert.equal(second.response.status, 201);
    assert.equal(second.body.isDefault, true);
    const secondId = second.body.id;

    const list = await request("/addresses", { token: customerToken });
    assert.equal(list.response.status, 200);
    assert.equal(list.body.length, 2);
    const defaults = list.body.filter((entry) => entry.isDefault);
    assert.equal(defaults.length, 1);
    assert.equal(defaults[0].id, secondId);

    const firstId = list.body.find((entry) => entry.label === "Home").id;
    const update = await request(`/addresses/${firstId}`, {
      token: customerToken,
      method: "PUT",
      body: { city: "Jericho", isDefault: true },
    });
    assert.equal(update.response.status, 200);
    assert.equal(update.body.city, "Jericho");
    assert.equal(update.body.isDefault, true);

    const afterUpdate = await request("/addresses", { token: customerToken });
    const defaultsAfter = afterUpdate.body.filter((entry) => entry.isDefault);
    assert.equal(defaultsAfter.length, 1);
    assert.equal(defaultsAfter[0].id, firstId);

    const remove = await request(`/addresses/${secondId}`, { token: customerToken, method: "DELETE" });
    assert.equal(remove.response.status, 204);

    const afterRemove = await request("/addresses", { token: customerToken });
    assert.equal(afterRemove.body.length, 1);
    assert.equal(afterRemove.body[0].id, firstId);
  });

  await t.test("cross-tenant address deny", async () => {
    const velvetList = await request("/addresses", { token: customerToken });
    const velvetAddressId = velvetList.body[0].id;

    const otherList = await request("/addresses", { token: otherToken });
    assert.equal(otherList.response.status, 200);
    assert.deepEqual(otherList.body, []);

    const update = await request(`/addresses/${velvetAddressId}`, {
      token: otherToken,
      method: "PUT",
      body: { city: "Hacked" },
    });
    assert.equal(update.response.status, 404);

    const remove = await request(`/addresses/${velvetAddressId}`, { token: otherToken, method: "DELETE" });
    assert.equal(remove.response.status, 404);
  });
});