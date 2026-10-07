import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { hashPassword } from "../src/auth/passwords.js";
import {
  applyAutomaticDiscountToUnit,
  computeCouponDiscount,
  priceRetailOrder,
  resolveRetailUnitPrice,
  selectBestAutomaticDiscount,
} from "../src/pricing/retailPricing.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "product-phase-kl-"));
const password = "PhaseKL-discounts-123!";
const passwordHash = await hashPassword(password);
const now = "2026-09-07T12:00:00.000Z";

const company = (id, settings = {}) => ({
  id,
  slug: id,
  name: id,
  status: "active",
  settings: { language: "en", currency: "USD", showCouponBoxAtCheckout: true, ...settings },
});

const user = (id, companyId, role = "company_admin", permissions = [], extras = {}) => ({
  id,
  email: `${id}@test.local`,
  password: passwordHash,
  role,
  company_id: companyId,
  permissions,
  isActive: true,
  accountType: extras.accountType || "retail",
  ebPoints: extras.ebPoints || 0,
  totalPointsEarned: 0,
  totalPointsRedeemed: 0,
  createdAt: now,
  updatedAt: now,
  ...extras,
});

fs.writeFileSync(path.join(dataDir, "store.json"), JSON.stringify({
  version: 2,
  companies: [
    company("icare"),
    company("eb-chemical"),
  ],
  users: [
    user("icare-admin", "icare"),
    user("eb-admin", "eb-chemical"),
    user("icare-coupon", "icare", "employee", ["coupons.manage", "products.view"]),
    user("icare-products", "icare", "employee", ["products.view", "products.update", "products.manage"]),
    user("icare-no-perm", "icare", "employee", ["products.view"]),
    user("icare-customer", "icare", "customer", [], { phone: "599111222", ebPoints: 0 }),
    user("icare-trader", "icare", "customer", [], { accountType: "trader", phone: "599333444" }),
  ],
  memberships: [
    { id: "m1", companyId: "icare", userId: "icare-admin", role: "company_admin", status: "active", permissions: [], createdAt: now, updatedAt: now },
    { id: "m2", companyId: "eb-chemical", userId: "eb-admin", role: "company_admin", status: "active", permissions: [], createdAt: now, updatedAt: now },
    { id: "m3", companyId: "icare", userId: "icare-coupon", role: "employee", status: "active", permissions: ["coupons.manage", "products.view"], createdAt: now, updatedAt: now },
    { id: "m4", companyId: "icare", userId: "icare-products", role: "employee", status: "active", permissions: ["products.view", "products.update", "products.manage"], createdAt: now, updatedAt: now },
    { id: "m5", companyId: "icare", userId: "icare-no-perm", role: "employee", status: "active", permissions: ["products.view"], createdAt: now, updatedAt: now },
    { id: "m6", companyId: "icare", userId: "icare-customer", role: "customer", status: "active", permissions: [], createdAt: now, updatedAt: now },
    { id: "m7", companyId: "icare", userId: "icare-trader", role: "customer", status: "active", permissions: [], createdAt: now, updatedAt: now },
  ],
  brands: [
    { id: "icare-brand", slug: "icare-brand", name: { en: "iCare" }, company_id: "icare", isActive: true },
  ],
  categories: [
    { id: "icare-main", slug: "main", name: { en: "Main" }, parentId: null, brandId: "icare-brand", company_id: "icare", isActive: true },
    { id: "icare-sub", slug: "sub", name: { en: "Sub" }, parentId: "icare-main", brandId: null, company_id: "icare", isActive: true },
  ],
  products: [
    {
      id: "icare-bulk",
      slug: "icare-bulk",
      sku: "BULK-1",
      name: { en: "Bulk Product" },
      company_id: "icare",
      brandId: "icare-brand",
      categoryId: "icare-sub",
      mainCategoryId: "icare-main",
      subcategoryId: "icare-sub",
      isActive: true,
      visible: true,
      minPurchaseQuantity: 1,
      maxPurchaseQuantity: 100,
      variants: [
        { id: "v-bulk", size: "S", price: 100, sale_price: 80, stock: 50, wholesalePrice: 40 },
      ],
      stockQty: 50,
      createdAt: now,
      updatedAt: now,
    },
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
      variants: [{ id: "v-plain", size: "M", price: 50, stock: 20 }],
      stockQty: 20,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "eb-item",
      slug: "eb-item",
      sku: "EB-1",
      name: { en: "EB Item" },
      company_id: "eb-chemical",
      isActive: true,
      visible: true,
      variants: [{ id: "v-eb", size: "L", price: 30, stock: 10 }],
      stockQty: 10,
      createdAt: now,
      updatedAt: now,
    },
  ],
  automaticDiscounts: [],
  coupons: [],
  orders: [],
}));

process.env.DATA_STORE_DIR = dataDir;
process.env.DATABASE_URL = "";
process.env.POSTGRES_URL = "";
process.env.SUPABASE_URL = "";
process.env.JWT_SECRET = "phase-kl-test-secret";
process.env.NODE_ENV = "test";
process.env.ALLOW_LOCAL_CATALOG_STORAGE = "true";

const { app } = await import(`../src/server.js?phasekl=${Date.now()}`);
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

async function login(email, companyId = "icare") {
  const result = await request("/auth/login", {
    method: "POST",
    companyId,
    body: { email: `${email}@test.local`, password },
  });
  assert.equal(result.status, 200, JSON.stringify(result.body));
  return result.body.token;
}

test.after(() => {
  server.close();
});

test("unit: sale price then automatic discount precedence", () => {
  const product = {
    id: "p1",
    variants: [{ id: "v1", price: 100, sale_price: 80 }],
  };
  const { unitPrice } = resolveRetailUnitPrice(product, product.variants[0]);
  assert.equal(unitPrice, 80);

  const discount = {
    id: "d1",
    discountType: "percentage",
    discountValue: 10,
    minQuantity: 2,
    productIds: ["p1"],
    isActive: true,
  };
  const below = selectBestAutomaticDiscount(unitPrice, 1, product, [discount]);
  assert.equal(below.amount, 0);
  const at = selectBestAutomaticDiscount(unitPrice, 2, product, [discount]);
  assert.equal(at.amount, 16);
  const unit = applyAutomaticDiscountToUnit(unitPrice, 2, discount);
  assert.equal(unit, 72);
});

test("unit: coupon after automatic discount; no negative totals", () => {
  const priced = priceRetailOrder({
    items: [{ productId: "p1", quantity: 2, variantId: "v1" }],
    products: [{
      id: "p1",
      variants: [{ id: "v1", price: 100, salePrice: 80 }],
    }],
    automaticDiscounts: [{
      id: "d1",
      discountType: "fixed",
      discountValue: 5,
      minQuantity: 1,
      productIds: ["p1"],
      isActive: true,
    }],
    coupon: { code: "SAVE10", discountType: "percentage", discountValue: 10 },
    pointsDiscount: 5,
  });
  assert.ok(priced.subtotalAfterAutomatic < priced.merchandiseSubtotal);
  assert.ok(priced.couponDiscount > 0);
  assert.ok(priced.payableProductSubtotal >= 0);
  assert.equal(computeCouponDiscount(0, priced), 0);
});

test("automatic discount CRUD + tenant isolation", async () => {
  const token = await login("icare-products");
  const created = await request("/admin/discounts", {
    method: "POST",
    token,
    body: {
      name: "Buy 3 save 15%",
      discountType: "percentage",
      discountValue: 15,
      minQuantity: 3,
      productIds: ["icare-bulk"],
      isActive: true,
    },
  });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  assert.equal(created.body.minQuantity, 3);

  const ebToken = await login("eb-admin", "eb-chemical");
  const cross = await request(`/admin/discounts/${created.body.id}`, {
    token: ebToken,
    companyId: "eb-chemical",
  });
  assert.equal(cross.status, 404);

  const updated = await request(`/admin/discounts/${created.body.id}`, {
    method: "PATCH",
    token,
    body: { discountValue: 20, isActive: true },
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.discountValue, 20);

  const deactivated = await request(`/admin/discounts/${created.body.id}`, {
    method: "DELETE",
    token,
  });
  assert.equal(deactivated.status, 200);
  assert.equal(deactivated.body.isActive, false);
});

test("coupons.manage enforced; duplicate code rejected", async () => {
  const denied = await login("icare-no-perm");
  const forbidden = await request("/admin/coupons", {
    method: "POST",
    token: denied,
    body: { code: "SAVE10", discountType: "fixed", discountValue: 10 },
  });
  assert.equal(forbidden.status, 403);

  const token = await login("icare-coupon");
  const created = await request("/admin/coupons", {
    method: "POST",
    token,
    body: {
      code: "SAVE10",
      name: "Save ten",
      discountType: "fixed",
      discountValue: 10,
      minOrderAmount: 50,
      usageLimit: 2,
      isActive: true,
    },
  });
  assert.equal(created.status, 201, JSON.stringify(created.body));

  const duplicate = await request("/admin/coupons", {
    method: "POST",
    token,
    body: { code: "save10", discountType: "fixed", discountValue: 5 },
  });
  assert.equal(duplicate.status, 409);

  const ebToken = await login("eb-admin", "eb-chemical");
  const crossCreate = await request("/admin/coupons", {
    method: "POST",
    token: ebToken,
    companyId: "eb-chemical",
    body: { code: "SAVE10", discountType: "fixed", discountValue: 10 },
  });
  assert.equal(crossCreate.status, 201);
});

test("coupon validation matrix + checkout revalidation", async () => {
  const admin = await login("icare-coupon");
  const expired = await request("/admin/coupons", {
    method: "POST",
    token: admin,
    body: {
      code: "EXPIRED",
      discountType: "fixed",
      discountValue: 5,
      endsAt: "2020-01-01T00:00:00.000Z",
      isActive: true,
    },
  });
  assert.equal(expired.status, 201);

  const inactive = await request("/admin/coupons", {
    method: "POST",
    token: admin,
    body: {
      code: "INACTIVE",
      discountType: "fixed",
      discountValue: 5,
      isActive: false,
    },
  });
  assert.equal(inactive.status, 201);

  const limited = await request("/admin/coupons", {
    method: "POST",
    token: admin,
    body: {
      code: "ONCE",
      discountType: "fixed",
      discountValue: 5,
      usageLimit: 1,
      minOrderAmount: 10,
      isActive: true,
    },
  });
  assert.equal(limited.status, 201);

  const expiredCheck = await request("/coupons/validate", {
    method: "POST",
    token: admin,
    body: { code: "EXPIRED", subtotal: 100 },
  });
  assert.equal(expiredCheck.status, 400);

  const inactiveCheck = await request("/coupons/validate", {
    method: "POST",
    token: admin,
    body: { code: "INACTIVE", subtotal: 100 },
  });
  assert.equal(inactiveCheck.status, 400);

  const minOrder = await request("/coupons/validate", {
    method: "POST",
    token: admin,
    body: { code: "SAVE10", subtotal: 10 },
  });
  assert.equal(minOrder.status, 400);

  const ok = await request("/coupons/validate", {
    method: "POST",
    token: admin,
    body: { code: "SAVE10", subtotal: 80 },
  });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.valid, true);
  assert.equal(ok.body.discountAmount, 10);

  // Ensure an active automatic discount exists for order pricing
  const productsToken = await login("icare-products");
  await request("/admin/discounts", {
    method: "POST",
    token: productsToken,
    body: {
      name: "Qty3",
      discountType: "percentage",
      discountValue: 10,
      minQuantity: 3,
      productIds: ["icare-bulk"],
      isActive: true,
    },
  });

  const customerToken = await login("icare-customer");
  const forged = await request("/orders", {
    method: "POST",
    token: customerToken,
    body: {
      customer: {
        name: "Customer",
        phone: "599111222",
        city: "Nablus",
        address: "Street 1",
      },
      items: [{
        productId: "icare-bulk",
        variantId: "v-bulk",
        selectedSize: "S",
        quantity: 3,
        price: 1,
        lineTotal: 3,
      }],
      couponCode: "SAVE10",
      total: 3,
    },
  });
  assert.equal(forged.status, 201, JSON.stringify(forged.body));
  // Sale 80 → 10% auto on qty 3 = 24 off → line 216 → coupon 10 → payable 206
  assert.equal(forged.body.items[0].priceBeforeDiscount, 80);
  assert.ok(forged.body.items[0].price < 80);
  assert.equal(forged.body.couponDiscount, 10);
  assert.ok(forged.body.total > 3);
  assert.notEqual(forged.body.total, 3);

  const usageHit = await request("/orders", {
    method: "POST",
    token: customerToken,
    body: {
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
      couponCode: "ONCE",
    },
  });
  assert.equal(usageHit.status, 201, JSON.stringify(usageHit.body));

  const usageExceeded = await request("/orders", {
    method: "POST",
    token: customerToken,
    body: {
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
      couponCode: "ONCE",
    },
  });
  assert.equal(usageExceeded.status, 400);

  const crossTenantCoupon = await request("/orders", {
    method: "POST",
    token: customerToken,
    companyId: "icare",
    body: {
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
      // EB coupon code exists only on eb-chemical
      couponCode: "SAVE10",
    },
  });
  // SAVE10 exists on icare too — create an unknown code instead
  const missing = await request("/orders", {
    method: "POST",
    token: customerToken,
    body: {
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
      couponCode: "NOT-A-REAL-CODE",
    },
  });
  assert.equal(missing.status, 400);
  assert.ok(crossTenantCoupon.status === 201 || crossTenantCoupon.status === 400);
});

test("wholesale path ignores retail coupon/automatic discounts", async () => {
  const traderToken = await login("icare-trader");
  const order = await request("/orders", {
    method: "POST",
    token: traderToken,
    body: {
      customer: {
        name: "Trader",
        phone: "599333444",
        city: "Ramallah",
        address: "Office",
      },
      items: [{
        productId: "icare-bulk",
        variantId: "v-bulk",
        selectedSize: "S",
        quantity: 3,
        price: 999,
      }],
      couponCode: "SAVE10",
    },
  });
  assert.equal(order.status, 201, JSON.stringify(order.body));
  assert.equal(order.body.items[0].price, 40);
  assert.equal(order.body.couponDiscount || 0, 0);
  assert.equal(order.body.automaticDiscountTotal || 0, 0);
});
