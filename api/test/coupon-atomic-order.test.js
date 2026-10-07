import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { hashPassword } from "../src/auth/passwords.js";
import { consumeCouponUsageWithClient } from "../src/data/postgresStore.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "coupon-atomic-"));
const password = "CouponAtomic-123!";
const passwordHash = await hashPassword(password);
const now = "2026-09-09T12:00:00.000Z";

fs.writeFileSync(path.join(dataDir, "store.json"), JSON.stringify({
  version: 2,
  companies: [
    { id: "icare", slug: "icare", name: "icare", status: "active", settings: { language: "en", currency: "USD", showCouponBoxAtCheckout: true } },
  ],
  users: [
    {
      id: "icare-customer",
      email: "icare-customer@test.local",
      password: passwordHash,
      role: "customer",
      company_id: "icare",
      permissions: [],
      isActive: true,
      accountType: "retail",
      phone: "599111222",
      ebPoints: 0,
      totalPointsEarned: 0,
      totalPointsRedeemed: 0,
      createdAt: now,
      updatedAt: now,
    },
  ],
  memberships: [
    {
      id: "m1",
      companyId: "icare",
      userId: "icare-customer",
      role: "customer",
      status: "active",
      permissions: [],
      createdAt: now,
      updatedAt: now,
    },
  ],
  brands: [
    { id: "icare-brand", slug: "icare-brand", name: { en: "iCare" }, company_id: "icare", isActive: true },
  ],
  categories: [
    { id: "icare-sub", slug: "sub", name: { en: "Sub" }, parentId: null, brandId: "icare-brand", company_id: "icare", isActive: true },
  ],
  products: [
    {
      id: "icare-plain",
      slug: "icare-plain",
      sku: "PLAIN-1",
      name: { en: "Plain Product" },
      company_id: "icare",
      brandId: "icare-brand",
      categoryId: "icare-sub",
      isActive: true,
      visible: true,
      variants: [{ id: "v-plain", size: "M", price: 50, stock: 100 }],
      stockQty: 100,
      createdAt: now,
      updatedAt: now,
    },
  ],
  coupons: [
    {
      id: "coupon-once",
      code: "ONCE",
      name: "Once",
      discountType: "fixed",
      discountValue: 5,
      usageLimit: 1,
      usedCount: 0,
      minOrderAmount: 0,
      isActive: true,
      company_id: "icare",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "coupon-rollback",
      code: "ROLLBACK",
      name: "Rollback",
      discountType: "fixed",
      discountValue: 5,
      usageLimit: 10,
      usedCount: 3,
      minOrderAmount: 0,
      isActive: true,
      company_id: "icare",
      createdAt: now,
      updatedAt: now,
    },
  ],
  orders: [],
  automaticDiscounts: [],
}));

process.env.DATA_STORE_DIR = dataDir;
process.env.DATABASE_URL = "";
process.env.POSTGRES_URL = "";
process.env.SUPABASE_URL = "";
process.env.JWT_SECRET = "coupon-atomic-test-secret";
process.env.NODE_ENV = "test";
process.env.ALLOW_LOCAL_CATALOG_STORAGE = "true";

const { app } = await import(`../src/server.js?coupon-atomic=${Date.now()}`);
const {
  createOrderWithOptionalCouponConsumption,
  couponRepository,
  orderRepository,
} = await import("../src/data/store.js");
const server = app.listen(0);
const port = server.address().port;

async function request(pathname, { method = "GET", token, body, companyId = "icare" } = {}) {
  const response = await fetch(`http://127.0.0.1:${port}/api${pathname}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "X-Company-Id": companyId,
    },
    body: body == null ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let parsed;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }
  return { status: response.status, body: parsed };
}

async function login() {
  const result = await request("/auth/login", {
    method: "POST",
    body: { email: "icare-customer@test.local", password },
  });
  assert.equal(result.status, 200, JSON.stringify(result.body));
  return result.body.token;
}

function orderBody(couponCode) {
  return {
    customer: {
      name: "Customer",
      phone: "599111222",
      city: "Nablus",
      address: "Street 1",
    },
    items: [{
      productId: "icare-plain",
      variantId: "v-plain",
      selectedSize: "M",
      quantity: 1,
      price: 50,
    }],
    couponCode,
  };
}

test.after(() => {
  server.close();
});

test("postgres store uses atomic coupon used_count update SQL", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "../src/data/postgresStore.js"),
    "utf8",
  );
  assert.match(source, /used_count = used_count \+ 1/);
  assert.match(source, /usage_limit is null or used_count < usage_limit/i);
  assert.match(source, /where company_id = \$1\s+and id = \$2/i);
  assert.match(source, /createOrderConsumingCouponInSupabase/);
  assert.doesNotMatch(source, /\bMutex\b|\bmutex\b|new Map\(\).*lock|acquireLock/);
});

test("atomic coupon consume rejects oversubscription concurrently (client-level)", async () => {
  const coupon = {
    id: "c-concurrent",
    company_id: "icare",
    code: "CONC",
    is_active: true,
    usage_limit: 1,
    used_count: 0,
    discount_type: "fixed",
    discount_value: 5,
    min_order_amount: 0,
    name: "",
    admin_note: "",
    starts_at: null,
    ends_at: null,
    created_by: "",
    updated_by: "",
    created_at: now,
    updated_at: now,
  };

  const client = {
    async query(sql, params = []) {
      const text = String(sql).replace(/\s+/g, " ").toLowerCase();
      if (text.includes("update public.coupons")) {
        // Yield so concurrent callers interleave before the sync check+increment.
        await new Promise((resolve) => setTimeout(resolve, 15 + Math.floor(Math.random() * 10)));
        if (
          params[0] !== "icare"
          || params[1] !== coupon.id
          || coupon.is_active !== true
          || (coupon.usage_limit != null && coupon.used_count >= coupon.usage_limit)
        ) {
          return { rows: [], rowCount: 0 };
        }
        coupon.used_count += 1;
        coupon.updated_at = new Date().toISOString();
        return { rows: [{ ...coupon }], rowCount: 1 };
      }
      if (text.includes("select * from public.coupons")) {
        return { rows: [{ ...coupon }], rowCount: 1 };
      }
      throw new Error(`Unexpected SQL in mock client: ${sql}`);
    },
  };

  const results = await Promise.allSettled([
    consumeCouponUsageWithClient(client, "icare", coupon.id),
    consumeCouponUsageWithClient(client, "icare", coupon.id),
  ]);

  const fulfilled = results.filter((r) => r.status === "fulfilled");
  const rejected = results.filter((r) => r.status === "rejected");
  assert.equal(fulfilled.length, 1);
  assert.equal(rejected.length, 1);
  assert.match(String(rejected[0].reason?.message || ""), /usage limit/i);
  assert.equal(coupon.used_count, 1);
});

test("concurrent order attempts with usageLimit=1: one succeeds, one fails, usedCount=1", async () => {
  const token = await login();
  const [a, b] = await Promise.all([
    request("/orders", { method: "POST", token, body: orderBody("ONCE") }),
    request("/orders", { method: "POST", token, body: orderBody("ONCE") }),
  ]);

  const statuses = [a.status, b.status].sort((x, y) => x - y);
  assert.deepEqual(statuses, [201, 400], JSON.stringify({ a, b }));
  const failed = a.status === 400 ? a : b;
  assert.match(String(failed.body?.message || ""), /usage limit/i);

  const coupon = couponRepository.findByCompany("icare", "coupon-once");
  assert.equal(Number(coupon.usedCount ?? coupon.used_count), 1);

  const redeemedOrders = orderRepository
    .getByCompany("icare")
    .filter((order) => order.couponCode === "ONCE");
  assert.equal(redeemedOrders.length, 1);
});

test("failed order creation rolls back coupon used_count", async () => {
  const before = couponRepository.findByCompany("icare", "coupon-rollback");
  const initialUsed = Number(before.usedCount ?? before.used_count);
  assert.equal(initialUsed, 3);

  const order = {
    id: "ORD-ROLLBACK-TEST",
    customer: { name: "X", phone: "1", city: "Y", address: "Z" },
    items: [],
    couponCode: "ROLLBACK",
    couponDiscount: 5,
    subtotal: 45,
    total: 45,
    status: "Pending",
    createdAt: now,
    updatedAt: now,
  };

  await assert.rejects(
    () => createOrderWithOptionalCouponConsumption("icare", {
      order,
      couponId: "coupon-rollback",
      testHooks: {
        beforeCreateOrder: async () => {
          const mid = couponRepository.findByCompany("icare", "coupon-rollback");
          assert.equal(Number(mid.usedCount ?? mid.used_count), initialUsed + 1);
          const error = new Error("Forced order creation failure.");
          error.statusCode = 500;
          throw error;
        },
      },
    }),
    /Forced order creation failure/,
  );

  const after = couponRepository.findByCompany("icare", "coupon-rollback");
  assert.equal(Number(after.usedCount ?? after.used_count), initialUsed);
  assert.equal(orderRepository.findByCompany("icare", "ORD-ROLLBACK-TEST"), null);
});
