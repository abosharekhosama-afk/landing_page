import assert from "node:assert/strict";

import fs from "node:fs";

import os from "node:os";

import path from "node:path";

import test from "node:test";

import { hashPassword } from "../src/auth/passwords.js";



const dataStoreDir = fs.mkdtempSync(path.join(os.tmpdir(), "igroup-reviews-"));

const now = "2026-08-06T00:00:00.000Z";

const password = "Reviews-test-2026!";

const passwordHash = await hashPassword(password);

const userRows = [

  ["icare-admin", "admin@icare.test", "company_admin", []],

  ["icare-viewer", "viewer@icare.test", "employee", ["reviews.view"]],

  ["icare-manager", "manager@icare.test", "employee", ["reviews.manage"]],

  ["other-admin", "admin@other.test", "company_admin", []],

].map(([id, email, role, permissions]) => ({

  id, name: id, email, phone: "", password: passwordHash, role, permissions, isActive: true, createdAt: now, updatedAt: now,

}));

const membershipRows = [

  ["icare", "icare-admin", "company_admin", []],

  ["icare", "icare-viewer", "employee", ["reviews.view"]],

  ["icare", "icare-manager", "employee", ["reviews.manage"]],

  ["other-company", "other-admin", "company_admin", []],

].map(([companyId, userId, role, permissions]) => ({

  id: `${companyId}:${userId}`, companyId, userId, role, status: "active", permissions, createdAt: now, updatedAt: now,

}));



fs.writeFileSync(path.join(dataStoreDir, "store.json"), `${JSON.stringify({

  version: 2,

  companies: [

      { id: "icare", slug: "icare", name: "iCare", status: "active", domains: [{ domain: "icare.test", is_active: true, is_verified: true }] },

      { id: "other-company", slug: "other-company", name: "Other", status: "active", domains: [{ domain: "other.test", is_active: true, is_verified: true }] },

    ],

  users: userRows,

  memberships: membershipRows,

  reviews: [],

  orders: [],

  products: [

    { id: "icare-product-1", companyId: "icare", name: { en: "Test Product", ar: "منتج تجريبي" }, isActive: true },

    { id: "icare-product-2", companyId: "icare", name: { en: "Second Product", ar: "منتج ثان" }, isActive: true },

    { id: "other-product-1", companyId: "other-company", name: { en: "Other Product", ar: "" }, isActive: true },

  ],

}, null, 2)}\n`, "utf8");



process.env.DATA_STORE_DIR = dataStoreDir;

process.env.DATABASE_URL = "";

process.env.POSTGRES_URL = "";

process.env.SUPABASE_URL = "";

process.env.SUPABASE_SERVICE_ROLE_KEY = "";

process.env.JWT_SECRET = "focused-reviews-test-secret";

process.env.NODE_ENV = "test";

process.env.ALLOW_LOCAL_CATALOG_STORAGE = "true";

process.env.UPLOADS_DIR = path.join(dataStoreDir, "uploads");

fs.mkdirSync(process.env.UPLOADS_DIR, { recursive: true });



const { app } = await import("../src/server.js");

const { inMemoryModuleStore } = await import("../src/moduleRegistry.js");

inMemoryModuleStore.set("icare", [{

  module_key: "operations.reviews",

  enabled: true,

  active: true,

  allowed_roles: ["super_admin", "company_admin", "admin", "manager", "employee", "staff"],

  required_permissions: ["reviews.view", "reviews.manage"],

  sort_order: 330,

}]);

inMemoryModuleStore.set("other-company", [{

  module_key: "operations.reviews",

  enabled: true,

  active: true,

  allowed_roles: ["super_admin", "company_admin", "admin", "manager", "employee", "staff"],

  required_permissions: ["reviews.view", "reviews.manage"],

  sort_order: 330,

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



test("reviews admin API", async (t) => {

  const adminToken = await login("admin@icare.test");

  const viewerToken = await login("viewer@icare.test");

  const managerToken = await login("manager@icare.test");

  const otherToken = await login("admin@other.test");



  await t.test("unauthenticated /all is rejected", async () => {

    assert.equal((await request("/reviews/all")).response.status, 401);

  });



  await t.test("viewer can list but cannot moderate", async () => {

    const list = await request("/reviews/all", { token: viewerToken });

    assert.equal(list.response.status, 200);

    assert.deepEqual(list.body, []);

  });



  let reviewId;

  await t.test("manager can create and list tenant reviews", async () => {

    const create = await request("/reviews", {

      token: managerToken,

      body: {

        type: "website",

        rating: 4,

        customerName: "Jane Doe",

        comment: { en: "Clean floors", ar: "أرضيات نظيفة" },

        status: "pending",

      },

    });

    assert.equal(create.response.status, 201);

    reviewId = create.body.id;

    const list = await request("/reviews/all", { token: adminToken });

    assert.equal(list.response.status, 200);

    assert.equal(list.body.length, 1);

    assert.equal(list.body[0].customerName, "Jane Doe");

  });



  await t.test("tenant isolation hides reviews from other companies", async () => {

    const otherList = await request("/reviews/all", { token: otherToken });

    assert.equal(otherList.response.status, 200);

    assert.equal(otherList.body.length, 0);

  });



  await t.test("manager can approve and reject via status endpoint", async () => {

    const approved = await request(`/reviews/${reviewId}/status`, {

      token: managerToken,

      method: "PUT",

      body: { status: "approved", isActive: true },

    });

    assert.equal(approved.response.status, 200);

    assert.equal(approved.body.status, "approved");

    const rejected = await request(`/reviews/${reviewId}/status`, {

      token: managerToken,

      method: "PUT",

      body: { status: "rejected" },

    });

    assert.equal(rejected.response.status, 200);

    assert.equal(rejected.body.status, "rejected");

    assert.equal(rejected.body.isActive, false);

  });



  await t.test("viewer cannot update or delete reviews", async () => {

    const patch = await request(`/reviews/${reviewId}/status`, {

      token: viewerToken,

      method: "PUT",

      body: { status: "approved" },

    });

    assert.equal(patch.response.status, 403);

    const removed = await request(`/reviews/${reviewId}`, { token: viewerToken, method: "DELETE" });

    assert.equal(removed.response.status, 403);

  });



  await t.test("manager can delete a review", async () => {

    const removed = await request(`/reviews/${reviewId}`, { token: managerToken, method: "DELETE" });

    assert.equal(removed.response.status, 204);

    const list = await request("/reviews/all", { token: adminToken });

    assert.equal(list.body.length, 0);

  });

});



test("reviews end-to-end: types, linkage, and visibility", async (t) => {

  const adminToken = await login("admin@icare.test");

  const managerToken = await login("manager@icare.test");

  const otherToken = await login("admin@other.test");



  function persistedReviews() {

    const stored = JSON.parse(fs.readFileSync(path.join(dataStoreDir, "store.json"), "utf8"));

    const companies = Array.isArray(stored.companies) ? stored.companies : [];

    const scoped = companies.find((company) => company.id === "icare");

    const list = scoped?.reviews ?? stored.reviews;

    return Array.isArray(list) ? list : [];

  }



  let productReviewId;

  await t.test("product type survives save with its product link", async () => {

    const create = await request("/reviews", {

      token: managerToken,

      body: {

        type: "product",

        productId: "icare-product-1",

        rating: 5,

        customerName: "Sara M.",

        comment: { en: "Loved it", ar: "عجبني" },

      },

    });

    assert.equal(create.response.status, 201);

    assert.equal(create.body.type, "product");

    assert.equal(create.body.productId, "icare-product-1");

    productReviewId = create.body.id;

    const stored = persistedReviews().find((review) => review.id === productReviewId);

    assert.equal(stored?.type, "product");

    assert.equal(stored?.productId, "icare-product-1");

  });



  let employeeReviewId;

  await t.test("employee type survives save with its employee link", async () => {

    const create = await request("/reviews", {

      token: managerToken,

      body: {

        type: "employee",

        employeeId: "icare-manager",

        employeeName: "Store Manager",

        rating: 4,

        customerName: "Omar K.",

        comment: { en: "Very helpful", ar: "متعاون جدا" },

      },

    });

    assert.equal(create.response.status, 201);

    assert.equal(create.body.type, "employee");

    assert.equal(create.body.employeeId, "icare-manager");

    employeeReviewId = create.body.id;

    const stored = persistedReviews().find((review) => review.id === employeeReviewId);

    assert.equal(stored?.type, "employee");

    assert.equal(stored?.employeeId, "icare-manager");

  });



  let orderReviewId;

  await t.test("order type does not become website or store", async () => {

    const create = await request("/reviews", {

      token: managerToken,

      body: {

        type: "order",

        orderId: "order-1",

        rating: 5,

        customerName: "Huda A.",

        comment: { en: "Fast delivery", ar: "توصيل سريع" },

      },

    });

    assert.equal(create.response.status, 201);

    assert.equal(create.body.type, "order");

    orderReviewId = create.body.id;

    const stored = persistedReviews().find((review) => review.id === orderReviewId);

    assert.equal(stored?.type, "order");

  });



  await t.test("product reviews require a same-tenant product", async () => {

    const missing = await request("/reviews", {

      token: managerToken,

      body: { type: "product", rating: 5, customerName: "No Product" },

    });

    assert.equal(missing.response.status, 400);

    const unknown = await request("/reviews", {

      token: managerToken,

      body: { type: "product", productId: "ghost-product", rating: 5, customerName: "Ghost" },

    });

    assert.equal(unknown.response.status, 404);

    const crossTenant = await request("/reviews", {

      token: managerToken,

      body: { type: "product", productId: "other-product-1", rating: 5, customerName: "Cross" },

    });

    assert.equal(crossTenant.response.status, 404);

  });



  await t.test("employee reviews require a same-tenant employee", async () => {

    const missing = await request("/reviews", {

      token: managerToken,

      body: { type: "employee", rating: 5, customerName: "No Employee" },

    });

    assert.equal(missing.response.status, 400);

    const unknown = await request("/reviews", {

      token: managerToken,

      body: { type: "employee", employeeId: "ghost-employee", rating: 5, customerName: "Ghost" },

    });

    assert.equal(unknown.response.status, 404);

    const nonEmployee = await request("/reviews", {

      token: managerToken,

      body: { type: "employee", employeeId: "icare-admin", rating: 5, customerName: "Admin As Employee" },

    });

    assert.equal(nonEmployee.response.status, 404);

    const crossTenant = await request("/reviews", {

      token: otherToken,

      body: { type: "employee", employeeId: "icare-manager", rating: 5, customerName: "Cross" },

    });

    assert.equal(crossTenant.response.status, 404);

  });



  await t.test("switching away from product clears the stale product link", async () => {

    const updated = await request(`/reviews/${productReviewId}`, {

      token: managerToken,

      method: "PUT",

      body: { type: "website" },

    });

    assert.equal(updated.response.status, 200);

    assert.equal(updated.body.type, "website");

    assert.equal(updated.body.productId, "");

  });



  await t.test("switching away from employee clears the stale employee link", async () => {

    const updated = await request(`/reviews/${employeeReviewId}`, {

      token: managerToken,

      method: "PUT",

      body: { type: "website" },

    });

    assert.equal(updated.response.status, 200);

    assert.equal(updated.body.type, "website");

    assert.equal(updated.body.employeeId, "");

    assert.equal(updated.body.employeeName, "");

  });



  await t.test("edit without a type keeps the stored order type", async () => {

    const updated = await request(`/reviews/${orderReviewId}`, {

      token: managerToken,

      method: "PUT",

      body: { rating: 4 },

    });

    assert.equal(updated.response.status, 200);

    assert.equal(updated.body.type, "order");

  });



  await t.test("storefront anonymous product reviews: no JWT, tenant-isolated", async (t) => {

    // Create reviews as icare and as other-company, each with their own product.

    const icareReview = await request("/reviews", {

      token: managerToken,

      body: {

        type: "product",

        productId: "icare-product-1",

        rating: 5,

        customerName: "Icare Customer",

        comment: { en: "icare product review", ar: "تقييم منتج icare" },

      },

    });

    assert.equal(icareReview.response.status, 201);

    assert.equal(icareReview.body.customerName, "Icare Customer");



    const otherReview = await request("/reviews", {

      token: otherToken,

      body: {

        type: "product",

        productId: "other-product-1",

        rating: 3,

        customerName: "Other Customer",

        comment: { en: "other company product review", ar: "تقييم منتج شركة أخرى" },

      },

    });

    assert.equal(otherReview.response.status, 201);

    assert.equal(otherReview.body.customerName, "Other Customer");



    await t.test("anonymous fetch works: no Authorization header required", async () => {

      const anonymous = await request("/reviews/product/icare-product-1", {});

      assert.equal(anonymous.response.status, 200);

      assert.ok(Array.isArray(anonymous.body));

    });



    await t.test("X-Company-Id: icare returns only icare reviews", async () => {

      const listed = await request("/reviews/product/icare-product-1", {

        headers: { "x-company-id": "icare" },

      });

      assert.equal(listed.response.status, 200);

      assert.ok(Array.isArray(listed.body));

      assert.ok(listed.body.some((r) => r.customerName === "Icare Customer"));

      assert.ok(!listed.body.some((r) => r.customerName === "Other Customer"));

    });



    await t.test("other-company tenant sees no icare product reviews", async () => {

      const listed = await request("/reviews/product/icare-product-1", {

        headers: { "x-company-id": "other-company" },

      });

      assert.equal(listed.response.status, 200);

      assert.ok(Array.isArray(listed.body));

      assert.ok(!listed.body.some((r) => r.customerName === "Icare Customer"));

    });



    await t.test("cross-tenant product review does not leak into other-company fetch", async () => {
      const listed = await request("/reviews/product/other-product-1", {
        headers: { "x-company-id": "icare" },
      });
      assert.equal(listed.response.status, 200);
      assert.ok(Array.isArray(listed.body));
      assert.ok(!listed.body.some((r) => r.customerName === "Other Customer"));
    });
  });
});