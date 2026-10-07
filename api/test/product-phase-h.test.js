import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { hashPassword } from "../src/auth/passwords.js";
import { serializePublicProduct } from "../src/storefront/publicContent.js";
import {
  purchaseQuantityViolation,
  stripCostPriceFromProduct,
  validateProductSettingsPatch,
  validatePurchaseQuantityPair,
} from "../src/products/productSettings.js";
import { computeProductMetrics } from "../src/analytics/dashboardInsights.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "product-phase-h-"));
const password = "PhaseH-settings-123!";
const passwordHash = await hashPassword(password);
const now = "2026-09-07T12:00:00.000Z";

const company = (id, settings = {}) => ({
  id,
  slug: id,
  name: id,
  status: "active",
  settings: { language: "en", currency: "USD", ...settings },
});

const user = (id, companyId, role = "company_admin", permissions = []) => ({
  id,
  email: `${id}@test.local`,
  password: passwordHash,
  role,
  company_id: companyId,
  permissions,
  isActive: true,
  createdAt: now,
  updatedAt: now,
});

const productBase = {
  brandId: "icare-brand",
  categoryId: "icare-sub",
  mainCategoryId: "icare-main",
  subcategoryId: "icare-sub",
  isActive: true,
  visible: true,
  createdAt: now,
  updatedAt: now,
};

fs.writeFileSync(path.join(dataDir, "store.json"), JSON.stringify({
  version: 2,
  companies: [
    company("icare", {
      lowStockThreshold: 5,
      costPriceEnabled: false,
      productConditionEnabled: false,
      showCouponBoxAtCheckout: false,
    }),
    company("eb-chemical", {
      lowStockThreshold: 2,
      costPriceEnabled: true,
      showCouponBoxAtCheckout: true,
    }),
  ],
  users: [
    user("icare-admin", "icare"),
    user("eb-admin", "eb-chemical"),
    user("icare-update", "icare", "employee", ["products.view", "products.update"]),
    user("icare-cost", "icare", "employee", ["products.view", "products.update", "products.cost_price.manage"]),
    user("icare-settings", "icare", "employee", ["company_settings.view", "company_settings.update"]),
  ],
  memberships: [
    { id: "m1", companyId: "icare", userId: "icare-admin", role: "company_admin", status: "active", permissions: [], createdAt: now, updatedAt: now },
    { id: "m2", companyId: "eb-chemical", userId: "eb-admin", role: "company_admin", status: "active", permissions: [], createdAt: now, updatedAt: now },
    { id: "m3", companyId: "icare", userId: "icare-update", role: "employee", status: "active", permissions: ["products.view", "products.update"], createdAt: now, updatedAt: now },
    { id: "m4", companyId: "icare", userId: "icare-cost", role: "employee", status: "active", permissions: ["products.view", "products.update", "products.cost_price.manage"], createdAt: now, updatedAt: now },
    { id: "m5", companyId: "icare", userId: "icare-settings", role: "employee", status: "active", permissions: ["company_settings.view", "company_settings.update"], createdAt: now, updatedAt: now },
  ],
  brands: [
    { id: "icare-brand", slug: "icare-brand", name: { en: "iCare" }, company_id: "icare", isActive: true },
    { id: "eb-brand", slug: "eb-brand", name: { en: "EB" }, company_id: "eb-chemical", isActive: true },
  ],
  categories: [
    { id: "icare-main", slug: "main", name: { en: "Main" }, parentId: null, brandId: "icare-brand", company_id: "icare", isActive: true },
    { id: "icare-sub", slug: "sub", name: { en: "Sub" }, parentId: "icare-main", brandId: null, company_id: "icare", isActive: true },
  ],
  products: [
    {
      ...productBase,
      id: "icare-qty",
      slug: "icare-qty",
      sku: "QTY-1",
      name: { en: "Qty Product" },
      company_id: "icare",
      barcode: "BC-100",
      minPurchaseQuantity: 2,
      maxPurchaseQuantity: 5,
      variants: [{ id: "v1", size: "S", price: 12, stock: 20, costPrice: 3, wholesalePrice: 8 }],
      stockQty: 20,
    },
    {
      ...productBase,
      id: "icare-plain",
      slug: "icare-plain",
      sku: "PLAIN-1",
      name: { en: "Plain Product" },
      company_id: "icare",
      variants: [{ id: "v2", size: "M", price: 15, stock: 4 }],
      stockQty: 4,
    },
    {
      id: "eb-item",
      slug: "eb-item",
      sku: "EB-1",
      name: { en: "EB Item" },
      company_id: "eb-chemical",
      brandId: "eb-brand",
      isActive: true,
      visible: true,
      variants: [{ id: "ev1", size: "L", price: 9, stock: 1, costPrice: 1 }],
      createdAt: now,
      updatedAt: now,
    },
  ],
  orders: [],
}, null, 2));

process.env.DATA_STORE_DIR = dataDir;
process.env.DATABASE_URL = "";
process.env.POSTGRES_URL = "";
process.env.SUPABASE_URL = "";
process.env.SUPABASE_SERVICE_ROLE_KEY = "";
process.env.JWT_SECRET = "phase-h-product-test-secret";
process.env.NODE_ENV = "test";
process.env.ALLOW_LOCAL_CATALOG_STORAGE = "true";
process.env.UPLOADS_DIR = path.join(dataDir, "uploads");
fs.mkdirSync(process.env.UPLOADS_DIR, { recursive: true });

const { app } = await import(`../src/server.js?phaseh=${Date.now()}`);
const { allPermissions } = await import("../src/data/store.js");
const server = app.listen(0, "127.0.0.1");
await new Promise((resolve) => server.once("listening", resolve));
test.after(() => {
  server.close();
});
const base = `http://127.0.0.1:${server.address().port}/api`;

async function request(url, { token, body, method } = {}) {
  const response = await fetch(`${base}${url}`, {
    method: method || (body ? "POST" : "GET"),
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let parsed = null;
  try { parsed = text ? JSON.parse(text) : null; } catch { parsed = text; }
  return { status: response.status, body: parsed };
}

async function login(email) {
  const result = await request("/auth/login", { body: { email, password } });
  assert.equal(result.status, 200, `login failed for ${email}: ${JSON.stringify(result.body)}`);
  return result.body.token;
}

test("permission registry includes cost_price.manage and excludes products.restore", () => {
  assert.ok(allPermissions.includes("products.cost_price.manage"));
  assert.equal(allPermissions.includes("products.restore"), false);
});

test("settings helpers validate product settings patch and purchase limits", () => {
  const changes = {};
  validateProductSettingsPatch({
    lowStockThreshold: 7,
    costPriceEnabled: true,
    productConditionEnabled: false,
    showCouponBoxAtCheckout: true,
  }, changes);
  assert.deepEqual(changes, {
    lowStockThreshold: 7,
    costPriceEnabled: true,
    productConditionEnabled: false,
    showCouponBoxAtCheckout: true,
  });
  assert.throws(() => validateProductSettingsPatch({ costPriceEnabled: "yes" }, {}));
  assert.throws(() => validateProductSettingsPatch({ lowStockThreshold: -1 }, {}));
  assert.throws(() => validatePurchaseQuantityPair(5, 2));
  assert.deepEqual(validatePurchaseQuantityPair(2, 5), {
    minPurchaseQuantity: 2,
    maxPurchaseQuantity: 5,
  });
  assert.equal(purchaseQuantityViolation({ minPurchaseQuantity: 2 }, 1), "Quantity must be at least 2.");
  assert.equal(purchaseQuantityViolation({ maxPurchaseQuantity: 3 }, 4), "Quantity must be at most 3.");
  assert.equal(purchaseQuantityViolation({ minPurchaseQuantity: 2, maxPurchaseQuantity: 2 }, 2), null);
  assert.equal(purchaseQuantityViolation({}, 0), "Quantity must be a positive integer.");
});

test("public serializer never emits cost price and includes purchase limits", () => {
  const serialized = serializePublicProduct({
    id: "p1",
    slug: "p1",
    name: { en: "P" },
    price: 10,
    minPurchaseQuantity: 2,
    maxPurchaseQuantity: 6,
    variants: [{
      id: "v1",
      size: "S",
      price: 10,
      stock: 3,
      costPrice: 2,
      cost_price: 2,
      wholesalePrice: 4,
    }],
  });
  const blob = JSON.stringify(serialized);
  assert.equal(blob.includes("costPrice"), false);
  assert.equal(blob.includes("cost_price"), false);
  assert.equal(serialized.minPurchaseQuantity, 2);
  assert.equal(serialized.maxPurchaseQuantity, 6);
  assert.equal(serialized.variants[0].wholesalePrice, undefined);
  assert.deepEqual(stripCostPriceFromProduct({
    variants: [{ id: "v1", costPrice: 9, price: 1 }],
  }).variants[0].costPrice, undefined);
});

test("company settings round-trip, validation, and tenant isolation", async () => {
  const token = await login("icare-admin@test.local");
  const read = await request("/company/settings", { token });
  assert.equal(read.status, 200);
  assert.equal(read.body.lowStockThreshold, 5);
  assert.equal(read.body.costPriceEnabled, false);
  assert.equal(read.body.showCouponBoxAtCheckout, false);

  const updated = await request("/company/settings", {
    token,
    method: "PATCH",
    body: {
      lowStockThreshold: 8,
      costPriceEnabled: true,
      productConditionEnabled: true,
      showCouponBoxAtCheckout: true,
    },
  });
  assert.equal(updated.status, 200, JSON.stringify(updated.body));
  assert.equal(updated.body.lowStockThreshold, 8);
  assert.equal(updated.body.costPriceEnabled, true);
  assert.equal(updated.body.productConditionEnabled, true);
  assert.equal(updated.body.showCouponBoxAtCheckout, true);

  const invalid = await request("/company/settings", {
    token,
    method: "PATCH",
    body: { lowStockThreshold: "nope" },
  });
  assert.equal(invalid.status, 400);

  const boolInvalid = await request("/company/settings", {
    token,
    method: "PATCH",
    body: { costPriceEnabled: "true" },
  });
  assert.equal(boolInvalid.status, 400);

  const ebToken = await login("eb-admin@test.local");
  const ebRead = await request("/company/settings", { token: ebToken });
  assert.equal(ebRead.status, 200);
  assert.equal(ebRead.body.lowStockThreshold, 2);
  assert.notEqual(ebRead.body.lowStockThreshold, updated.body.lowStockThreshold);

  const storefront = await request("/company/resolve-storefront?host=localhost&path=/");
  // resolve-storefront uses host/path; ensure admin-only keys are not globally leaked via publicSettingKeys misuse
  if (storefront.status === 200 && storefront.body?.settings) {
    assert.equal(Object.hasOwn(storefront.body.settings, "costPriceEnabled"), false);
    assert.equal(Object.hasOwn(storefront.body.settings, "lowStockThreshold"), false);
  }
});

test("coupon setting does not activate coupon functionality", async () => {
  const token = await login("icare-admin@test.local");
  const updated = await request("/company/settings", {
    token,
    method: "PATCH",
    body: { showCouponBoxAtCheckout: true },
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.showCouponBoxAtCheckout, true);
  // Visibility setting only; coupon list route remains unavailable without a GET handler.
  const couponProbe = await request("/coupons", { token });
  assert.ok([404, 405].includes(couponProbe.status));
});

test("low stock threshold is company-level and used by metrics", () => {
  const products = [
    { id: "a", name: { en: "A" }, isActive: true, variants: [{ stock: 3 }], stockQty: 3 },
    { id: "b", name: { en: "B" }, isActive: true, variants: [{ stock: 9 }], stockQty: 9 },
  ];
  const low = computeProductMetrics(products, { lowStockThreshold: 5 });
  assert.equal(low.lowStock, 1);
  const high = computeProductMetrics(products, { lowStockThreshold: 10 });
  assert.equal(high.lowStock, 2);
});

test("barcode optional persistence and tenant isolation", async () => {
  const token = await login("icare-admin@test.local");
  const created = await request("/products", {
    token,
    body: {
      id: `barcode-${Date.now()}`,
      slug: `barcode-${Date.now()}`,
      sku: `BC-${Date.now()}`,
      name: { en: "Barcode Item", ar: "باركود" },
      brandId: "icare-brand",
      categoryId: "icare-sub",
      mainCategoryId: "icare-main",
      subcategoryId: "icare-sub",
      barcode: "  ABC-999  ",
      variants: [{ color_name: "Default", size: "S", price: 5, stock: 2 }],
      isActive: true,
      visible: true,
    },
  });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  assert.equal(created.body.barcode, "ABC-999");

  const list = await request("/products", { token });
  assert.equal(list.status, 200);
  const found = list.body.find((item) => item.id === created.body.id);
  assert.ok(found);
  assert.equal(found.barcode, "ABC-999");

  const ebToken = await login("eb-admin@test.local");
  const cross = await request(`/products/${created.body.id}/details`, { token: ebToken });
  assert.equal(cross.status, 404);
});

test("cost price gated by setting + permission; never public", async () => {
  const admin = await login("icare-admin@test.local");
  // Ensure setting enabled for this test path
  const enabled = await request("/company/settings", {
    token: admin,
    method: "PATCH",
    body: { costPriceEnabled: true },
  });
  assert.equal(enabled.status, 200, JSON.stringify(enabled.body));

  const updateOnly = await login("icare-update@test.local");
  const denied = await request("/products/icare-plain", {
    token: updateOnly,
    method: "PUT",
    body: {
      id: "icare-plain",
      slug: "icare-plain",
      sku: "PLAIN-1",
      name: { en: "Plain Product" },
      brandId: "icare-brand",
      categoryId: "icare-sub",
      mainCategoryId: "icare-main",
      subcategoryId: "icare-sub",
      variants: [{ id: "v2", color_name: "Default", size: "M", price: 15, stock: 4, costPrice: 4.5 }],
      isActive: true,
      visible: true,
    },
  });
  assert.equal(denied.status, 403, JSON.stringify(denied.body));

  const costUser = await login("icare-cost@test.local");
  const allowed = await request("/products/icare-plain", {
    token: costUser,
    method: "PUT",
    body: {
      id: "icare-plain",
      slug: "icare-plain",
      sku: "PLAIN-1",
      name: { en: "Plain Product" },
      brandId: "icare-brand",
      categoryId: "icare-sub",
      mainCategoryId: "icare-main",
      subcategoryId: "icare-sub",
      variants: [{ id: "v2", color_name: "Default", size: "M", price: 15, stock: 4, costPrice: 4.5 }],
      isActive: true,
      visible: true,
    },
  });
  assert.equal(allowed.status, 200, JSON.stringify(allowed.body));
  assert.equal(allowed.body.variants[0].costPrice, 4.5);

  // Setting disabled blocks even with permission
  await request("/company/settings", {
    token: admin,
    method: "PATCH",
    body: { costPriceEnabled: false },
  });
  const disabled = await request("/products/icare-plain", {
    token: costUser,
    method: "PUT",
    body: {
      id: "icare-plain",
      slug: "icare-plain",
      sku: "PLAIN-1",
      name: { en: "Plain Product" },
      brandId: "icare-brand",
      categoryId: "icare-sub",
      mainCategoryId: "icare-main",
      subcategoryId: "icare-sub",
      variants: [{ id: "v2", color_name: "Default", size: "M", price: 15, stock: 4, costPrice: 9 }],
      isActive: true,
      visible: true,
    },
  });
  assert.equal(disabled.status, 403, JSON.stringify(disabled.body));

  // Public list must not leak cost price
  const publicList = await request("/products");
  assert.equal(publicList.status, 200);
  for (const product of publicList.body) {
    const blob = JSON.stringify(product);
    assert.equal(blob.includes("costPrice"), false);
    assert.equal(blob.includes("cost_price"), false);
  }

  // Admin without cost permission does not receive cost price
  const updateRead = await request("/products", { token: updateOnly });
  assert.equal(updateRead.status, 200);
  const plain = updateRead.body.find((item) => item.id === "icare-plain");
  assert.ok(plain);
  assert.equal(plain.variants?.[0]?.costPrice, undefined);

  // Malformed cost price
  await request("/company/settings", {
    token: admin,
    method: "PATCH",
    body: { costPriceEnabled: true },
  });
  const malformed = await request("/products/icare-plain", {
    token: costUser,
    method: "PUT",
    body: {
      id: "icare-plain",
      slug: "icare-plain",
      sku: "PLAIN-1",
      name: { en: "Plain Product" },
      brandId: "icare-brand",
      categoryId: "icare-sub",
      mainCategoryId: "icare-main",
      subcategoryId: "icare-sub",
      variants: [{ id: "v2", color_name: "Default", size: "M", price: 15, stock: 4, costPrice: -1 }],
      isActive: true,
      visible: true,
    },
  });
  assert.equal(malformed.status, 400, JSON.stringify(malformed.body));

  // Cross-tenant
  const ebToken = await login("eb-admin@test.local");
  const cross = await request("/products/icare-plain", {
    token: ebToken,
    method: "PUT",
    body: {
      id: "icare-plain",
      slug: "icare-plain",
      name: { en: "Hijack" },
      variants: [{ id: "v2", color_name: "Default", size: "M", price: 1, stock: 1, costPrice: 1 }],
    },
  });
  assert.equal(cross.status, 404);
});

test("order API enforces product min/max purchase quantity", async () => {
  const token = await login("icare-admin@test.local");
  const customer = {
    name: "Buyer",
    phone: "0599000000",
    city: "Ramallah",
    address: "Street 1",
  };

  async function place(quantity) {
    return request("/orders", {
      token,
      body: {
        customer,
        items: [{
          productId: "icare-qty",
          slug: "icare-qty",
          productName: "Qty Product",
          variantId: "v1",
          selectedSize: "S",
          quantity,
          price: 12,
        }],
      },
    });
  }

  assert.equal((await place(1)).status, 400); // below min 2
  assert.equal((await place(6)).status, 400); // above max 5
  assert.equal((await place(0)).status, 400);
  assert.equal((await place(-2)).status, 400);
  const okMin = await place(2);
  assert.equal(okMin.status, 201, JSON.stringify(okMin.body));
  const okMax = await place(5);
  assert.equal(okMax.status, 201, JSON.stringify(okMax.body));

  // No limits product accepts any positive qty
  const plain = await request("/orders", {
    token,
    body: {
      customer,
      items: [{
        productId: "icare-plain",
        slug: "icare-plain",
        productName: "Plain Product",
        variantId: "v2",
        selectedSize: "M",
        quantity: 1,
        price: 15,
      }],
    },
  });
  assert.equal(plain.status, 201, JSON.stringify(plain.body));

  // Invalid min>max rejected on product update
  const badLimits = await request("/products/icare-plain", {
    token,
    method: "PUT",
    body: {
      id: "icare-plain",
      slug: "icare-plain",
      sku: "PLAIN-1",
      name: { en: "Plain Product" },
      brandId: "icare-brand",
      categoryId: "icare-sub",
      mainCategoryId: "icare-main",
      subcategoryId: "icare-sub",
      minPurchaseQuantity: 9,
      maxPurchaseQuantity: 3,
      variants: [{ id: "v2", color_name: "Default", size: "M", price: 15, stock: 4 }],
      isActive: true,
      visible: true,
    },
  });
  assert.equal(badLimits.status, 400);
});
