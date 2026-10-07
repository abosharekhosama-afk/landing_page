import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { hashPassword } from "../src/auth/passwords.js";
import {
  computeBundleFinalPrice,
  computeBundleSavings,
  computeBundleSubtotal,
  deriveBundleAvailability,
  mergeBundleItems,
  normalizePricingMode,
  priceBundle,
} from "../src/bundles/bundlePricing.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "product-bundles-"));
const password = "Bundles-phase-m-123!";
const passwordHash = await hashPassword(password);
const now = "2026-09-19T12:00:00.000Z";

const company = (id, settings = {}) => ({
  id,
  slug: id,
  name: id,
  status: "active",
  settings: { language: "en", currency: "USD", ...settings },
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
  ebPoints: 0,
  totalPointsEarned: 0,
  totalPointsRedeemed: 0,
  createdAt: now,
  updatedAt: now,
  ...extras,
});

fs.writeFileSync(path.join(dataDir, "store.json"), JSON.stringify({
  version: 2,
  companies: [
    {
      ...company("icare"),
      domain: "icare.test",
      settings: {
        language: "en",
        currency: "USD",
        storefrontUrl: "https://icare.test",
        storefrontPath: "/",
        websiteConnection: {
          siteId: "icare-storefront",
          storefrontBaseUrl: "https://icare.test",
          defaultLocale: "en",
          supportedLocales: ["en"],
        },
      },
    },
    company("eb-chemical"),
  ],
  domains: [
    {
      id: "icare-domain",
      company_id: "icare",
      domain: "icare.test",
      is_primary: true,
      is_active: true,
      is_verified: true,
      created_at: now,
      updated_at: now,
    },
  ],
  users: [
    user("icare-admin", "icare"),
    user("eb-admin", "eb-chemical"),
    user("icare-products", "icare", "employee", ["products.view", "products.update", "products.manage"]),
    user("icare-no-perm", "icare", "employee", ["products.view"]),
    user("icare-customer", "icare", "customer", [], { phone: "599111222", ebPoints: 0 }),
  ],
  memberships: [
    { id: "m1", companyId: "icare", userId: "icare-admin", role: "company_admin", status: "active", permissions: [], createdAt: now, updatedAt: now },
    { id: "m2", companyId: "eb-chemical", userId: "eb-admin", role: "company_admin", status: "active", permissions: [], createdAt: now, updatedAt: now },
    { id: "m3", companyId: "icare", userId: "icare-products", role: "employee", status: "active", permissions: ["products.view", "products.update", "products.manage"], createdAt: now, updatedAt: now },
    { id: "m4", companyId: "icare", userId: "icare-no-perm", role: "employee", status: "active", permissions: ["products.view"], createdAt: now, updatedAt: now },
    { id: "m5", companyId: "icare", userId: "icare-customer", role: "customer", status: "active", permissions: [], createdAt: now, updatedAt: now },
  ],
  brands: [
    { id: "icare-brand", slug: "icare-brand", name: { en: "iCare" }, company_id: "icare", isActive: true },
  ],
  categories: [
    { id: "icare-main", slug: "main", name: { en: "Main" }, parentId: null, brandId: "icare-brand", company_id: "icare", isActive: true },
  ],
  products: [
    {
      id: "icare-shampoo",
      slug: "icare-shampoo",
      sku: "SHAMPOO-1",
      name: { en: "Shampoo" },
      company_id: "icare",
      brandId: "icare-brand",
      categoryId: "icare-main",
      isActive: true,
      visible: true,
      minPurchaseQuantity: 1,
      maxPurchaseQuantity: 100,
      variants: [{ id: "v-shampoo", size: "500ml", price: 40, stock: 50 }],
      stockQty: 50,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "icare-conditioner",
      slug: "icare-conditioner",
      sku: "COND-1",
      name: { en: "Conditioner" },
      company_id: "icare",
      brandId: "icare-brand",
      categoryId: "icare-main",
      isActive: true,
      visible: true,
      variants: [{ id: "v-conditioner", size: "500ml", price: 35, stock: 30 }],
      stockQty: 30,
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
  productBundles: [],
  productBundleItems: [],
  orders: [],
}));

process.env.DATA_STORE_DIR = dataDir;
process.env.DATABASE_URL = "";
process.env.POSTGRES_URL = "";
process.env.SUPABASE_URL = "";
process.env.JWT_SECRET = "bundles-test-secret";
process.env.NODE_ENV = "test";
process.env.ALLOW_LOCAL_CATALOG_STORAGE = "true";

const { app } = await import(`../src/server.js?bundles=${Date.now()}`);
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

test("unit: pricing mode normalization", () => {
  assert.equal(normalizePricingMode("percent_discount"), "percent_discount");
  assert.equal(normalizePricingMode("fixed_price"), "fixed_price");
  assert.equal(normalizePricingMode("bogus"), "auto_sum");
  assert.equal(normalizePricingMode(""), "auto_sum");
});

test("unit: bundle subtotal, final price and savings", () => {
  const items = [
    { unitPrice: 40, quantity: 1 },
    { unitPrice: 35, quantity: 2 },
  ];
  assert.equal(computeBundleSubtotal(items), 110);

  const percent = { pricingMode: "percent_discount", discountValue: 10 };
  assert.equal(computeBundleFinalPrice(percent, 110), 99);
  assert.equal(computeBundleSavings(percent, 110, 99), 11);

  const fixedDiscount = { pricingMode: "fixed_discount", discountValue: 20 };
  assert.equal(computeBundleFinalPrice(fixedDiscount, 110), 90);

  const fixedPrice = { pricingMode: "fixed_price", fixedPrice: 60 };
  assert.equal(computeBundleFinalPrice(fixedPrice, 110), 60);

  const autoSum = { pricingMode: "auto_sum" };
  assert.equal(computeBundleFinalPrice(autoSum, 110), 110);
  assert.equal(computeBundleSavings(autoSum, 110, 110), 0);
});

test("unit: priceBundle resolves components and availability", () => {
  const bundle = {
    id: "b1",
    slug: "hair-care",
    name: "Hair Care",
    pricingMode: "percent_discount",
    discountValue: 10,
  };
  const items = [
    { productId: "icare-shampoo", variantId: "v-shampoo", quantity: 1 },
    { productId: "icare-conditioner", variantId: "v-conditioner", quantity: 1 },
  ];
  const products = [
    {
      id: "icare-shampoo",
      slug: "icare-shampoo",
      name: { en: "Shampoo" },
      isActive: true,
      variants: [{ id: "v-shampoo", price: 40 }],
    },
    {
      id: "icare-conditioner",
      slug: "icare-conditioner",
      name: { en: "Conditioner" },
      isActive: true,
      variants: [{ id: "v-conditioner", price: 35 }],
    },
  ];
  const priced = priceBundle(bundle, items, products);
  assert.equal(priced.subtotal, 75);
  assert.equal(priced.finalPrice, 67.5);
  assert.equal(priced.savings, 7.5);
  assert.equal(priced.available, true);
  assert.equal(priced.items.length, 2);
  assert.equal(priced.items[0].unitPrice, 40);
});

test("unit: deriveBundleAvailability rejects missing/inactive products", () => {
  const bundle = { id: "b1", pricingMode: "auto_sum" };
  const items = [
    { productId: "icare-shampoo", variantId: "v-shampoo", quantity: 1 },
    { productId: "missing-product", quantity: 1 },
  ];
  const products = [
    {
      id: "icare-shampoo",
      slug: "icare-shampoo",
      isActive: true,
      variants: [{ id: "v-shampoo", price: 40 }],
    },
  ];
  const availability = deriveBundleAvailability(bundle, items, products);
  assert.equal(availability.available, false);
  assert.equal(availability.unavailableItems.length, 1);
  assert.equal(availability.unavailableItems[0].productId, "missing-product");
});

test("unit: mergeBundleItems sorts by sortOrder", () => {
  const merged = mergeBundleItems({ id: "b1" }, [
    { id: "i2", productId: "p2", quantity: 1, sortOrder: 2 },
    { id: "i1", productId: "p1", quantity: 2, sortOrder: 1 },
  ]);
  assert.equal(merged.items[0].productId, "p1");
  assert.equal(merged.items[1].productId, "p2");
});

test("admin bundle CRUD + tenant isolation", async () => {
  const token = await login("icare-products");
  const created = await request("/admin/bundles", {
    method: "POST",
    token,
    body: {
      name: "Hair Care Duo",
      slug: "hair-care-duo",
      description: "Shampoo + conditioner",
      pricingMode: "percent_discount",
      discountValue: 10,
      isActive: true,
      items: [
        { productId: "icare-shampoo", variantId: "v-shampoo", quantity: 1 },
        { productId: "icare-conditioner", variantId: "v-conditioner", quantity: 1 },
      ],
    },
  });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  assert.equal(created.body.slug, "hair-care-duo");
  assert.equal(created.body.pricingMode, "percent_discount");
  assert.equal(created.body.subtotal, 75);
  assert.equal(created.body.finalPrice, 67.5);
  assert.equal(created.body.items.length, 2);

  const ebToken = await login("eb-admin", "eb-chemical");
  const cross = await request(`/admin/bundles/${created.body.id}`, {
    token: ebToken,
    companyId: "eb-chemical",
  });
  assert.equal(cross.status, 404);

  const duplicateSlug = await request("/admin/bundles", {
    method: "POST",
    token,
    body: {
      name: "Duplicate",
      slug: "hair-care-duo",
      pricingMode: "auto_sum",
      items: [{ productId: "icare-shampoo", variantId: "v-shampoo", quantity: 1 }],
    },
  });
  assert.equal(duplicateSlug.status, 409);

  const updated = await request(`/admin/bundles/${created.body.id}`, {
    method: "PATCH",
    token,
    body: { discountValue: 20, items: [
      { productId: "icare-shampoo", variantId: "v-shampoo", quantity: 1 },
      { productId: "icare-conditioner", variantId: "v-conditioner", quantity: 2 },
    ] },
  });
  assert.equal(updated.status, 200, JSON.stringify(updated.body));
  assert.equal(updated.body.discountValue, 20);
  assert.equal(updated.body.subtotal, 110);
  assert.equal(updated.body.finalPrice, 88);

  const deactivated = await request(`/admin/bundles/${created.body.id}`, {
    method: "DELETE",
    token,
  });
  assert.equal(deactivated.status, 200);
  assert.equal(deactivated.body.isActive, false);
});

test("admin bundle validation rejects bad items", async () => {
  const token = await login("icare-products");
  const missingProduct = await request("/admin/bundles", {
    method: "POST",
    token,
    body: {
      name: "Bad Bundle",
      slug: "bad-bundle",
      pricingMode: "auto_sum",
      items: [{ productId: "not-a-product", quantity: 1 }],
    },
  });
  assert.equal(missingProduct.status, 400);

  const emptyItems = await request("/admin/bundles", {
    method: "POST",
    token,
    body: {
      name: "Empty Bundle",
      slug: "empty-bundle",
      pricingMode: "auto_sum",
      items: [],
    },
  });
  assert.equal(emptyItems.status, 400);

  const fixedPriceMissing = await request("/admin/bundles", {
    method: "POST",
    token,
    body: {
      name: "Fixed Price Bundle",
      slug: "fixed-price-bundle",
      pricingMode: "fixed_price",
      items: [{ productId: "icare-shampoo", variantId: "v-shampoo", quantity: 1 }],
    },
  });
  assert.equal(fixedPriceMissing.status, 400);
});

test("public bundles list only active + available", async () => {
  const token = await login("icare-products");
  const created = await request("/admin/bundles", {
    method: "POST",
    token,
    body: {
      name: "Public Duo",
      slug: "public-duo",
      pricingMode: "fixed_price",
      fixedPrice: 60,
      isActive: true,
      items: [
        { productId: "icare-shampoo", variantId: "v-shampoo", quantity: 1 },
        { productId: "icare-conditioner", variantId: "v-conditioner", quantity: 1 },
      ],
    },
  });
  assert.equal(created.status, 201, JSON.stringify(created.body));

  const list = await request("/bundles");
  assert.equal(list.status, 200);
  const found = list.body.find((bundle) => bundle.slug === "public-duo");
  assert.ok(found, "public bundle should be listed");
  assert.equal(found.finalPrice, 60);

  const bySlug = await request("/bundles/public-duo");
  assert.equal(bySlug.status, 200);
  assert.equal(bySlug.body.finalPrice, 60);

  const missing = await request("/bundles/does-not-exist");
  assert.equal(missing.status, 404);
});

test("order creation reprices bundle lines and snapshots components", async () => {
  const adminToken = await login("icare-products");
  const customerToken = await login("icare-customer");
  const created = await request("/admin/bundles", {
    method: "POST",
    token: adminToken,
    body: {
      name: "Order Duo",
      slug: "order-duo",
      pricingMode: "percent_discount",
      discountValue: 10,
      isActive: true,
      items: [
        { productId: "icare-shampoo", variantId: "v-shampoo", quantity: 1 },
        { productId: "icare-conditioner", variantId: "v-conditioner", quantity: 1 },
      ],
    },
  });
  assert.equal(created.status, 201, JSON.stringify(created.body));

  const order = await request("/orders", {
    method: "POST",
    token: customerToken,
    body: {
      customer: {
        name: "Bundle Buyer",
        phone: "599777888",
        city: "Ramallah",
        address: "Main St 1",
      },
      items: [
        { bundleId: created.body.id, bundleSlug: "order-duo", quantity: 1, price: 1 },
      ],
    },
  });
  assert.equal(order.status, 201, JSON.stringify(order.body));
  const line = order.body.items.find((item) => item.bundleId === created.body.id);
  assert.ok(line, "bundle line should be present");
  assert.equal(line.price, 67.5);
  assert.equal(line.lineTotal, 67.5);
  assert.equal(line.bundleSubtotal, 75);
  assert.equal(line.bundleSavings, 7.5);
  assert.equal(line.bundleComponents.length, 2);
  assert.equal(line.bundleComponents[0].productId, "icare-shampoo");
});

test("order creation rejects unavailable bundle", async () => {
  const customerToken = await login("icare-customer");
  const order = await request("/orders", {
    method: "POST",
    token: customerToken,
    body: {
      customer: {
        name: "Bundle Buyer",
        phone: "599777889",
        city: "Ramallah",
        address: "Main St 1",
      },
      items: [
        { bundleId: "missing-bundle", bundleSlug: "missing-bundle", quantity: 1 },
      ],
    },
  });
  assert.equal(order.status, 409);
});

test("admin rejects duplicate bundle component items", async () => {
  const token = await login("icare-products");
  const duplicateItems = await request("/admin/bundles", {
    method: "POST",
    token,
    body: {
      name: "Dup Components",
      slug: "dup-components",
      pricingMode: "auto_sum",
      items: [
        { productId: "icare-shampoo", variantId: "v-shampoo", quantity: 1 },
        { productId: "icare-shampoo", variantId: "v-shampoo", quantity: 2 },
      ],
    },
  });
  assert.equal(duplicateItems.status, 400);
});

test("all four pricing modes resolve server-side on create", async () => {
  const token = await login("icare-products");
  const items = [
    { productId: "icare-shampoo", variantId: "v-shampoo", quantity: 1 },
    { productId: "icare-conditioner", variantId: "v-conditioner", quantity: 1 },
  ];

  const autoSum = await request("/admin/bundles", {
    method: "POST",
    token,
    body: { name: "Mode Auto", slug: "mode-auto-sum", pricingMode: "auto_sum", isActive: true, items },
  });
  assert.equal(autoSum.status, 201, JSON.stringify(autoSum.body));
  assert.equal(autoSum.body.finalPrice, 75);
  assert.equal(autoSum.body.savings, 0);

  const percent = await request("/admin/bundles", {
    method: "POST",
    token,
    body: {
      name: "Mode Percent",
      slug: "mode-percent",
      pricingMode: "percent_discount",
      discountValue: 20,
      isActive: true,
      items,
    },
  });
  assert.equal(percent.status, 201, JSON.stringify(percent.body));
  assert.equal(percent.body.finalPrice, 60);

  const fixedDiscount = await request("/admin/bundles", {
    method: "POST",
    token,
    body: {
      name: "Mode Fixed Discount",
      slug: "mode-fixed-discount",
      pricingMode: "fixed_discount",
      discountValue: 15,
      isActive: true,
      items,
    },
  });
  assert.equal(fixedDiscount.status, 201, JSON.stringify(fixedDiscount.body));
  assert.equal(fixedDiscount.body.finalPrice, 60);

  const fixedPrice = await request("/admin/bundles", {
    method: "POST",
    token,
    body: {
      name: "Mode Fixed Price",
      slug: "mode-fixed-price",
      pricingMode: "fixed_price",
      fixedPrice: 55,
      isActive: true,
      items,
    },
  });
  assert.equal(fixedPrice.status, 201, JSON.stringify(fixedPrice.body));
  assert.equal(fixedPrice.body.finalPrice, 55);
});

test("checkout ignores tampered client bundle price", async () => {
  const adminToken = await login("icare-products");
  const customerToken = await login("icare-customer");
  const created = await request("/admin/bundles", {
    method: "POST",
    token: adminToken,
    body: {
      name: "Tamper Duo",
      slug: "tamper-duo",
      pricingMode: "fixed_price",
      fixedPrice: 50,
      isActive: true,
      items: [
        { productId: "icare-shampoo", variantId: "v-shampoo", quantity: 1 },
        { productId: "icare-conditioner", variantId: "v-conditioner", quantity: 1 },
      ],
    },
  });
  assert.equal(created.status, 201, JSON.stringify(created.body));

  const order = await request("/orders", {
    method: "POST",
    token: customerToken,
    body: {
      customer: {
        name: "Price Tamper",
        phone: "599777890",
        city: "Ramallah",
        address: "Main St 2",
      },
      items: [
        {
          bundleId: created.body.id,
          bundleSlug: "tamper-duo",
          quantity: 2,
          price: 0.01,
          lineTotal: 0.02,
        },
      ],
      total: 0.02,
    },
  });
  assert.equal(order.status, 201, JSON.stringify(order.body));
  const line = order.body.items.find((item) => item.bundleId === created.body.id);
  assert.ok(line);
  assert.equal(line.price, 50);
  assert.equal(line.lineTotal, 100);
  assert.equal(line.bundleComponents.length, 2);
});

test("historical order snapshot survives bundle edit and deactivate", async () => {
  const adminToken = await login("icare-products");
  const customerToken = await login("icare-customer");
  const created = await request("/admin/bundles", {
    method: "POST",
    token: adminToken,
    body: {
      name: "Snapshot Duo",
      slug: "snapshot-duo",
      pricingMode: "percent_discount",
      discountValue: 10,
      isActive: true,
      items: [
        { productId: "icare-shampoo", variantId: "v-shampoo", quantity: 1 },
        { productId: "icare-conditioner", variantId: "v-conditioner", quantity: 1 },
      ],
    },
  });
  assert.equal(created.status, 201, JSON.stringify(created.body));

  const order = await request("/orders", {
    method: "POST",
    token: customerToken,
    body: {
      customer: {
        name: "Snapshot Buyer",
        phone: "599777891",
        city: "Ramallah",
        address: "Main St 3",
      },
      items: [
        { bundleId: created.body.id, bundleSlug: "snapshot-duo", quantity: 1, price: 999 },
      ],
    },
  });
  assert.equal(order.status, 201, JSON.stringify(order.body));
  const originalLine = order.body.items.find((item) => item.bundleId === created.body.id);
  assert.equal(originalLine.price, 67.5);
  assert.equal(originalLine.bundleName, "Snapshot Duo");
  assert.equal(originalLine.bundleComponents.length, 2);
  assert.equal(originalLine.bundleComponents[0].unitPrice, 40);

  const edited = await request(`/admin/bundles/${created.body.id}`, {
    method: "PATCH",
    token: adminToken,
    body: {
      name: "Snapshot Duo Edited",
      discountValue: 50,
      items: [{ productId: "icare-shampoo", variantId: "v-shampoo", quantity: 1 }],
    },
  });
  assert.equal(edited.status, 200, JSON.stringify(edited.body));
  assert.equal(edited.body.finalPrice, 20);

  const deactivated = await request(`/admin/bundles/${created.body.id}`, {
    method: "DELETE",
    token: adminToken,
  });
  assert.equal(deactivated.status, 200);
  assert.equal(deactivated.body.isActive, false);

  const mine = await request("/orders/my-orders", { token: customerToken });
  assert.equal(mine.status, 200);
  const historical = mine.body.find((entry) => entry.id === order.body.id);
  assert.ok(historical, "historical order should still be listed");
  const histLine = historical.items.find((item) => item.bundleId === created.body.id);
  assert.ok(histLine);
  assert.equal(histLine.price, 67.5);
  assert.equal(histLine.bundleName, "Snapshot Duo");
  assert.equal(histLine.bundleComponents.length, 2);
  assert.equal(histLine.bundleComponents[0].productId, "icare-shampoo");
  assert.equal(histLine.bundleComponents[1].productId, "icare-conditioner");
});

test("order rejects bundle when a component product becomes unavailable", async () => {
  const adminToken = await login("icare-products");
  const customerToken = await login("icare-customer");
  const created = await request("/admin/bundles", {
    method: "POST",
    token: adminToken,
    body: {
      name: "Soon Unavailable",
      slug: "soon-unavailable",
      pricingMode: "auto_sum",
      isActive: true,
      items: [
        { productId: "icare-shampoo", variantId: "v-shampoo", quantity: 1 },
        { productId: "icare-conditioner", variantId: "v-conditioner", quantity: 1 },
      ],
    },
  });
  assert.equal(created.status, 201, JSON.stringify(created.body));

  const { productRepository } = await import("../src/data/store.js");
  const conditioner = productRepository.findByCompany(
    "icare",
    (product) => product.id === "icare-conditioner",
  );
  assert.ok(conditioner);
  productRepository.updateForCompany("icare", "icare-conditioner", { ...conditioner, isActive: false });

  const order = await request("/orders", {
    method: "POST",
    token: customerToken,
    body: {
      customer: {
        name: "Unavailable Buyer",
        phone: "599777892",
        city: "Ramallah",
        address: "Main St 4",
      },
      items: [
        { bundleId: created.body.id, bundleSlug: "soon-unavailable", quantity: 1 },
      ],
    },
  });
  assert.equal(order.status, 409);

  productRepository.updateForCompany("icare", "icare-conditioner", { ...conditioner, isActive: true });
});

test("migration 037 product bundles avoids 036 company_pages collision", () => {
  const migrationsDir = path.join(__dirname, "../supabase/migrations");
  const files = fs.readdirSync(migrationsDir);
  assert.ok(files.includes("037_product_bundles.sql"));
  assert.equal(files.includes("036_product_bundles.sql"), false);
  const sql = fs.readFileSync(path.join(migrationsDir, "037_product_bundles.sql"), "utf8");
  assert.match(sql, /create table if not exists public\.product_bundles/);
  assert.match(sql, /create table if not exists public\.product_bundle_items/);
  assert.match(sql, /036 is reserved by feature\/site-pages-foundation-phase1/);
  assert.match(sql, /do NOT add a parallel bundle stock engine/i);
});
