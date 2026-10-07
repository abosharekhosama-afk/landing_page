import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { hashPassword } from "../src/auth/passwords.js";

const dataStoreDir = fs.mkdtempSync(path.join(os.tmpdir(), "igroup-velvet-slice-b-"));
const now = "2026-09-23T00:00:00.000Z";
const password = "VelvetSliceB-2026!";
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
  favoriteProductIds: [],
  createdAt: now,
  updatedAt: now,
}));
const memberships = [
  ["velvet:velvet-admin", "velvet", "velvet-admin", "company_admin"],
  ["velvet:velvet-customer", "velvet", "velvet-customer", "customer"],
  ["other-company:other-customer", "other-company", "other-customer", "customer"],
].map(([id, companyId, userId, role]) => ({
  id,
  companyId,
  userId,
  role,
  status: "active",
  permissions: [],
  createdAt: now,
  updatedAt: now,
}));

fs.writeFileSync(
  path.join(dataStoreDir, "store.json"),
  `${JSON.stringify(
    {
      version: 2,
      companies: [
        { id: "velvet", slug: "velvet", name: "Velvet", status: "active", isDefault: false, domains: [{ domain: "velvet.test", is_active: true, is_verified: true }] },
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
      reviews: [],
    },
    null,
    2,
  )}\n`,
  "utf8",
);

process.env.DATA_STORE_DIR = dataStoreDir;
process.env.DATABASE_URL = "";
process.env.POSTGRES_URL = "";
process.env.SUPABASE_URL = "";
process.env.SUPABASE_SERVICE_ROLE_KEY = "";
process.env.JWT_SECRET = "velvet-slice-b-test-secret";
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

test.after(() => {
  server.close();
  fs.rmSync(dataStoreDir, { recursive: true, force: true });
});

test("velvet customer Slice B (reviews, reviewCount, orders, insights)", async (t) => {
  const adminToken = await login("admin@velvet.test");
  const otherToken = await login("customer@other.test");
  const customerToken = async () => (await login("customer@velvet.test"));

  let orderId;
  let productReviewId;

  await t.test("order create returns orderId / orderNumber / status", async () => {
    const order = await request("/orders", {
      token: await customerToken(),
      body: {
        customer: {
          name: "Velvet Customer",
          phone: "599123456",
          city: "Ramallah",
          address: "Main St 1",
        },
        items: [{ productId: "velvet-product", quantity: 1, price: 25 }],
      },
    });
    assert.equal(order.response.status, 201);
    assert.ok(order.body.orderId, "orderId must be present");
    assert.ok(order.body.orderNumber, "orderNumber must be present");
    assert.ok(order.body.status, "status must be present");
    assert.equal(order.body.orderId, order.body.id);
    assert.equal(order.body.orderNumber, order.body.id);
    assert.ok(Array.isArray(order.body.items), "full order body kept for compat");
    assert.ok(order.body.total !== undefined, "total kept for compat");
    assert.ok(order.body.createdAt, "createdAt kept for compat");
    orderId = order.body.orderId;
  });

  await t.test("GET /orders/my-orders returns items/qty/prices/total/createdAt", async () => {
    const mine = await request("/orders/my-orders", { token: await customerToken() });
    assert.equal(mine.response.status, 200);
    const created = mine.body.find((entry) => entry.id === orderId);
    assert.ok(created, "created order visible in my-orders");
    assert.ok(Array.isArray(created.items) && created.items.length > 0);
    assert.ok(created.items[0].quantity > 0);
    assert.ok(created.items[0].price > 0);
    assert.ok(created.total !== undefined);
    assert.ok(created.createdAt);
  });

  await t.test("customer product review starts pending and un-featured", async () => {
    const review = await request("/reviews", {
      token: await customerToken(),
      body: {
        type: "product",
        productId: "velvet-product",
        rating: 5,
        orderId,
        comment: "Great product",
      },
    });
    assert.equal(review.response.status, 201);
    assert.equal(review.body.status, "pending");
    assert.equal(review.body.featured, false);
    assert.equal(review.body.customerUserId, "velvet-customer");
    assert.equal(review.body.customerId, "velvet-customer");
    productReviewId = review.body.id;
  });

  await t.test("featured=true requires approved status", async () => {
    const attempt = await request(`/reviews/${productReviewId}/status`, {
      method: "PUT",
      token: adminToken,
      body: { status: "pending", featured: true },
    });
    assert.equal(attempt.response.status, 400);
  });

  await t.test("approve + feature a product review", async () => {
    const approve = await request(`/reviews/${productReviewId}/status`, {
      method: "PUT",
      token: adminToken,
      body: { status: "approved", featured: true },
    });
    assert.equal(approve.response.status, 200);
    assert.equal(approve.body.status, "approved");
    assert.equal(approve.body.featured, true);
  });

  await t.test("product summary aggregates approved reviews only", async () => {
    const summary = await request("/reviews/product/velvet-product/summary", {
      headers: { "x-company-id": "velvet" },
    });
    assert.equal(summary.response.status, 200);
    assert.equal(summary.body.reviewCount, 1);
    assert.equal(summary.body.averageRating, 5);
    assert.deepEqual(summary.body.ratingDistribution, { 1: 0, 2: 0, 3: 0, 4: 0, 5: 1 });

    // Product with no approved reviews → zeros
    const empty = await request("/reviews/product/other-product/summary", {
      headers: { "x-company-id": "velvet" },
    });
    assert.equal(empty.body.reviewCount, 0);
    assert.equal(empty.body.averageRating, 0);
  });

  await t.test("?featured=true returns only approved+featured", async () => {
    const featured = await request("/reviews?type=product&featured=true", {
      headers: { "x-company-id": "velvet" },
    });
    assert.equal(featured.response.status, 200);
    assert.equal(featured.body.length, 1);
    assert.equal(featured.body[0].id, productReviewId);

    const all = await request("/reviews?type=product", {
      headers: { "x-company-id": "velvet" },
    });
    assert.equal(all.response.status, 200);
    assert.equal(all.body.length, 1);
  });

  await t.test("customer resubmit replaces prior product review (one active per customer)", async () => {
    const resubmit = await request("/reviews", {
      token: await customerToken(),
      body: {
        type: "product",
        productId: "velvet-product",
        rating: 3,
        orderId,
        comment: "Updated opinion",
      },
    });
    assert.equal(resubmit.response.status, 201);
    assert.notEqual(resubmit.body.id, productReviewId);
    productReviewId = resubmit.body.id;

    const visible = await request("/reviews/product/velvet-product", {
      headers: { "x-company-id": "velvet" },
    });
    assert.equal(visible.response.status, 200);
    assert.deepEqual(visible.body, [], "pending replacement not publicly visible");

    const approve = await request(`/reviews/${productReviewId}/status`, {
      method: "PUT",
      token: adminToken,
      body: { status: "approved", featured: true },
    });
    assert.equal(approve.body.featured, true);

    const summary = await request("/reviews/product/velvet-product/summary", {
      headers: { "x-company-id": "velvet" },
    });
    assert.equal(summary.body.reviewCount, 1, "still exactly one review after replacement");
    assert.equal(summary.body.averageRating, 3);
    assert.deepEqual(summary.body.ratingDistribution, { 1: 0, 2: 0, 3: 1, 4: 0, 5: 0 });
  });

  await t.test("reject clears featured", async () => {
    const reject = await request(`/reviews/${productReviewId}/status`, {
      method: "PUT",
      token: adminToken,
      body: { status: "rejected" },
    });
    assert.equal(reject.response.status, 200);
    assert.equal(reject.body.status, "rejected");
    assert.equal(reject.body.featured, false, "reject forces featured off");

    const summary = await request("/reviews/product/velvet-product/summary", {
      headers: { "x-company-id": "velvet" },
    });
    assert.equal(summary.body.reviewCount, 0, "rejected review excluded from aggregates");

    // Re-approve (without featured) so downstream aggregates see one product review.
    const reaprove = await request(`/reviews/${productReviewId}/status`, {
      method: "PUT",
      token: adminToken,
      body: { status: "approved" },
    });
    assert.equal(reaprove.body.status, "approved");
    assert.equal(reaprove.body.featured, false, "re-approve does not resurrect featured");
  });

  await t.test("store summary from approved website/store/site reviews", async () => {
    const website = await request("/reviews", {
      token: await customerToken(),
      body: { type: "website", rating: 4, comment: "Nice store" },
    });
    assert.equal(website.response.status, 201);
    const approve = await request(`/reviews/${website.body.id}/status`, {
      method: "PUT",
      token: adminToken,
      body: { status: "approved" },
    });
    assert.equal(approve.response.status, 200);

    const summary = await request("/reviews/store/summary", {
      headers: { "x-company-id": "velvet" },
    });
    assert.equal(summary.response.status, 200);
    assert.equal(summary.body.reviewCount, 1);
    assert.equal(summary.body.averageRating, 4);
    assert.ok(summary.body.ratingDistribution);
  });

  await t.test("admin customer contact exposes reviewCount", async () => {
    const customers = await request("/admin/customers", { token: adminToken });
    assert.equal(customers.response.status, 200);
    const velvet = customers.body.find((contact) => contact.id === "velvet-customer");
    assert.ok(velvet, "velvet customer present");
    assert.equal(velvet.reviewCount, 2, "product + website reviews counted");
    assert.equal(velvet.orderCount, 1, "orderCount preserved");
    assert.ok(velvet.createdAt, "createdAt preserved");

    const detail = await request("/admin/customers/velvet-customer", { token: adminToken });
    assert.equal(detail.response.status, 200);
    assert.equal(detail.body.reviewCount, 2);
    assert.equal(detail.body.orderCount, 1);
  });

  await t.test("dashboard insights include ratings fields from real data", async () => {
    const insights = await request("/admin/dashboard/insights", { token: adminToken });
    assert.equal(insights.response.status, 200);
    const ratings = insights.body.ratings;
    assert.ok(ratings, "ratings block present");
    assert.equal(ratings.storeAverageRating, 4);
    assert.equal(ratings.approvedStoreReviewCount, 1);
    assert.equal(ratings.productReviewCount, 1);
    assert.ok(Array.isArray(ratings.mostRatedProducts));
    assert.equal(ratings.mostRatedProducts.length, 1);
    assert.equal(ratings.mostRatedProducts[0].productId, "velvet-product");
    assert.equal(ratings.mostRatedProducts[0].name, "Velvet Product");
    assert.equal(ratings.mostRatedProducts[0].reviewCount, 1);
    assert.equal(ratings.mostRatedProducts[0].averageRating, 3);
    assert.ok(Array.isArray(ratings.mostFavoritedProducts));
  });

  await t.test("cross-tenant isolation for reviews", async () => {
    const otherList = await request("/reviews/product/velvet-product", { token: otherToken });
    assert.equal(otherList.response.status, 200);
    assert.deepEqual(otherList.body, [], "other tenant sees no velvet product reviews");

    const otherSummary = await request("/reviews/product/velvet-product/summary", {
      token: otherToken,
    });
    assert.equal(otherSummary.body.reviewCount, 0);

    const otherStore = await request("/reviews/store/summary", { token: otherToken });
    assert.equal(otherStore.body.reviewCount, 0);

    // other-company customer cannot approve velvet reviews
    const hack = await request(`/reviews/${productReviewId}/status`, {
      method: "PUT",
      token: otherToken,
      body: { status: "rejected" },
    });
    assert.equal(hack.response.status, 403);

    const otherCustomers = await request("/admin/customers", { token: otherToken });
    assert.equal(otherCustomers.response.status, 403, "customer cannot read admin contacts");
  });
});
