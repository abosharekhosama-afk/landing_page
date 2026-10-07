import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { hashPassword } from "../src/auth/passwords.js";
import {
  DISPLAY_SURFACES,
  ORDERING_KEYS,
  REJECTED_ORDERING_KEYS,
  applyBrandBoundary,
  applyOrderingKey,
  applySelection,
  assertKnownBrand,
  displayConfigFromRow,
  eligibleProducts,
  isEligibleProduct,
  normalizeOrderingKey,
  normalizeSelection,
  resolveDisplayPriority,
  resolveSurfaceConfig,
} from "../src/products/displayPriority.js";
import {
  VERIFIED_ORDER_STATUSES,
  isVerifiedOrderStatus,
  verifiedUnitsByProductId,
} from "../src/products/verifiedSales.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const now = "2026-10-01T00:00:00.000Z";

/* ------------------------------------------------------------------ *
 * Shared environment: file-mode store + admin API server.
 * Must be configured before store.js / server.js are imported.
 * DATABASE_URL stays empty — no shared database, no browser.
 * ------------------------------------------------------------------ */

const dataStoreDir = fs.mkdtempSync(path.join(os.tmpdir(), "product-display-priority-"));
process.env.DATA_STORE_DIR = dataStoreDir;
process.env.DATABASE_URL = "";
process.env.POSTGRES_URL = "";
process.env.SUPABASE_URL = "";
process.env.SUPABASE_SERVICE_ROLE_KEY = "";
process.env.JWT_SECRET = "product-display-priority-test-secret";
process.env.NODE_ENV = "test";
process.env.UPLOADS_DIR = path.join(dataStoreDir, "uploads");
fs.mkdirSync(process.env.UPLOADS_DIR, { recursive: true });

const loginPassword = "DisplayPriority-test-123!";
const loginPasswordHash = await hashPassword(loginPassword);

const tenantCompany = (id) => ({
  id,
  slug: id,
  name: id,
  status: "active",
  settings: {
    language: "en",
    currency: "USD",
    websiteConnection: {
      siteId: `${id}-storefront`,
      storefrontBaseUrl: "https://example.test",
      defaultLocale: "en",
      supportedLocales: ["en"],
    },
  },
});

const tenantUser = (id, companyId, role = "company_admin", permissions = []) => ({
  id,
  email: `${id}@test.local`,
  password: loginPasswordHash,
  role,
  company_id: companyId,
  permissions,
  isActive: true,
  createdAt: now,
  updatedAt: now,
});

const tenantMembership = (id, companyId, userId, role, permissions = []) => ({
  id,
  companyId,
  userId,
  role,
  status: "active",
  permissions,
  createdAt: now,
  updatedAt: now,
});

const tenantProduct = (id, companyId, brandId, sortOrder, featured) => ({
  id,
  slug: id,
  sku: id.toUpperCase(),
  name: { en: id, ar: id },
  company_id: companyId,
  brandId,
  categoryId: `${companyId}-sub`,
  mainCategoryId: `${companyId}-main`,
  subcategoryId: `${companyId}-sub`,
  price: 10 + sortOrder,
  isActive: true,
  visible: true,
  featured,
  sortOrder,
  variants: [{ id: `${id}-v1`, size: "M", price: 10, stock: 5, sort_order: 0 }],
  createdAt: now,
  updatedAt: now,
});

fs.writeFileSync(path.join(dataStoreDir, "store.json"), `${JSON.stringify({
  version: 2,
  companies: [tenantCompany("dp-co"), tenantCompany("dp-other")],
  domains: [
    { id: "dp-co-domain", company_id: "dp-co", domain: "dp-co.example.test", is_primary: true, is_active: true, is_verified: true, created_at: now, updated_at: now },
    { id: "dp-other-domain", company_id: "dp-other", domain: "dp-other.example.test", is_primary: true, is_active: true, is_verified: true, created_at: now, updated_at: now },
  ],
  users: [
    tenantUser("dp-admin", "dp-co"),
    tenantUser("dp-view", "dp-co", "employee", ["products.view"]),
    tenantUser("dp-update", "dp-co", "employee", ["products.update"]),
    tenantUser("dp-other-admin", "dp-other"),
  ],
  memberships: [
    tenantMembership("m-dp-admin", "dp-co", "dp-admin", "company_admin"),
    tenantMembership("m-dp-view", "dp-co", "dp-view", "employee", ["products.view"]),
    tenantMembership("m-dp-update", "dp-co", "dp-update", "employee", ["products.update"]),
    tenantMembership("m-dp-other-admin", "dp-other", "dp-other-admin", "company_admin"),
  ],
  brands: [
    { id: "dp-brand", slug: "dp-brand", name: { en: "DP Brand" }, company_id: "dp-co", isActive: true },
    { id: "dp-brand-2", slug: "dp-brand-2", name: { en: "DP Brand Two" }, company_id: "dp-co", isActive: true },
    { id: "other-brand", slug: "other-brand", name: { en: "Other Brand" }, company_id: "dp-other", isActive: true },
  ],
  categories: [
    { id: "dp-main", slug: "main", name: { en: "Main" }, parentId: null, brandId: "dp-brand", company_id: "dp-co", isActive: true },
    { id: "dp-sub", slug: "sub", name: { en: "Sub" }, parentId: "dp-main", brandId: null, company_id: "dp-co", isActive: true },
    { id: "other-sub", slug: "other-sub", name: { en: "Other Sub" }, company_id: "dp-other", isActive: true },
  ],
  products: [
    tenantProduct("dp-a", "dp-co", "dp-brand-2", 0, true),
    tenantProduct("dp-b", "dp-co", "dp-brand", 1, false),
    tenantProduct("dp-c", "dp-co", "dp-brand", 2, false),
    tenantProduct("other-x", "dp-other", "other-brand", 0, true),
  ],
  orders: [
    // Not an allow-listed status: must never count as a verified unit.
    { id: "o-processing", company_id: "dp-co", status: "processing", items: [{ productId: "dp-b", quantity: 50 }] },
    { id: "o-completed", company_id: "dp-co", status: "completed", items: [{ productId: "dp-a", quantity: 3 }] },
  ],
}, null, 2)}\n`);

const { app } = await import("../src/server.js");
const server = app.listen(0, "127.0.0.1");
await new Promise((resolve) => server.once("listening", resolve));
test.after(() => server.close());

const baseUrl = `http://127.0.0.1:${server.address().port}/api`;
const adminBase = `${baseUrl}/admin/product-display-priority`;

async function apiRequest(pathname, { token, body, method, query } = {}) {
  const search = query ? `?${new URLSearchParams(query).toString()}` : "";
  const response = await fetch(`${pathname.startsWith("http") ? pathname : `${baseUrl}${pathname}`}${search}`, {
    method: method || (body ? "PUT" : "GET"),
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
  const result = await apiRequest("/auth/login", { body: { email, password: loginPassword }, method: "POST" });
  assert.equal(result.status, 200, `login failed for ${email}: ${JSON.stringify(result.body)}`);
  return result.body.token;
}

const displayGet = (token, query) => apiRequest("/admin/product-display-priority", { token, query });
const displayPut = (token, body) => apiRequest("/admin/product-display-priority", { token, body, method: "PUT" });
const displayDelete = (token, query) => apiRequest("/admin/product-display-priority", { token, query, method: "DELETE" });

// Session tokens for the API tests below. Resolved while the module is still
// loading (before any test is registered) so the server cannot close first.
const adminToken = await login("dp-admin@test.local");
const updateToken = await login("dp-update@test.local");
const viewToken = await login("dp-view@test.local");

const product = (id, overrides = {}) => ({
  id,
  slug: id,
  name: { en: `Product ${id}` },
  price: 10,
  brandId: "brand-a",
  categoryId: "cat-1",
  isActive: true,
  visible: true,
  sortOrder: 0,
  createdAt: now,
  ...overrides,
});

/** Ordering fixture: distinct catalog order, dates, prices, names, flags. */
const orderProducts = [
  product("p1", {
    slug: "zulu",
    name: { en: "Zebra" },
    price: 30,
    sortOrder: 2,
    createdAt: "2026-01-01T00:00:00.000Z",
    featured: false,
    newArrival: false,
    bestseller: false,
  }),
  product("p2", {
    slug: "alpha",
    name: { en: "Apple" },
    price: 10,
    sortOrder: 1,
    createdAt: "2026-03-01T00:00:00.000Z",
    featured: true,
    newArrival: false,
    bestseller: true,
  }),
  product("p3", {
    slug: "mike",
    name: { en: "Mango" },
    price: 20,
    sortOrder: 3,
    createdAt: "2026-02-01T00:00:00.000Z",
    featured: false,
    newArrival: true,
    bestseller: false,
  }),
];

const ids = (list) => list.map((entry) => entry.id);

/* ------------------------------------------------------------------ *
 * T003 — migration file
 * ------------------------------------------------------------------ */

test("migration 040 creates both display tables and forbids shared environments", () => {
  const file = path.join(repoRoot, "api/supabase/migrations/040_product_display_priority.sql");
  assert.ok(fs.existsSync(file), "040_product_display_priority.sql must exist");
  const sql = fs.readFileSync(file, "utf8");

  assert.match(sql, /DO NOT apply this file to Staging or Production/i);
  assert.match(sql, /create table if not exists public\.product_display_modes/);
  assert.match(sql, /create table if not exists public\.product_display_order/);
  assert.match(sql, /surface text not null check \(surface in \('home', 'shop'\)\)/);
  assert.match(sql, /brand_id text null/);
  assert.match(sql, /ordering_key text null/);
  assert.match(sql, /selection_match text null check/);
  assert.match(sql, /selection jsonb null,?\s/);
  assert.ok(!/selection jsonb not null/.test(sql), "selection must stay nullable so null keeps meaning inherit");
  assert.match(sql, /updated_at timestamptz not null default now\(\)/);
  assert.match(sql, /unique \(company_id, surface, brand_id\)/);
  assert.match(sql, /references public\.products \(company_id, id\)/);
  assert.match(sql, /references public\.companies\(id\) on delete cascade/);
  // No statements that would imply it was already applied anywhere.
  assert.ok(!/^\s*insert into public\.product_display/m.test(sql, { multiline: true }));
});

/* ------------------------------------------------------------------ *
 * T005 — inheritance, eligibility, brand boundary
 * ------------------------------------------------------------------ */

test("brand fields inherit independently from the same-surface global row", () => {
  const globalShop = {
    surface: "shop",
    selection: [{ source: "flag", id: "featured" }],
    orderingKey: "newest",
  };

  const inherited = resolveSurfaceConfig("shop", globalShop, null);
  assert.equal(inherited.inheritedSelection, true);
  assert.equal(inherited.inheritedOrdering, true);
  assert.equal(inherited.orderingKey, "newest");
  assert.deepEqual(inherited.selection.rules, [{ source: "flag", id: "featured" }]);

  // Ordering override only: selection still comes from the global row.
  const orderingOnly = resolveSurfaceConfig("shop", globalShop, { surface: "shop", orderingKey: "manual" });
  assert.equal(orderingOnly.inheritedSelection, true);
  assert.equal(orderingOnly.inheritedOrdering, false);
  assert.equal(orderingOnly.orderingKey, "manual");
  assert.deepEqual(orderingOnly.selection.rules, [{ source: "flag", id: "featured" }]);

  // Selection override only: ordering still comes from the global row.
  const selectionOnly = resolveSurfaceConfig("shop", globalShop, {
    surface: "shop",
    selection: [{ source: "collection", id: "promotions-discounts" }],
  });
  assert.equal(selectionOnly.inheritedSelection, false);
  assert.equal(selectionOnly.inheritedOrdering, true);
  assert.equal(selectionOnly.orderingKey, "newest");
  assert.equal(selectionOnly.selection.match, "and");
  assert.deepEqual(selectionOnly.selection.rules, [{ source: "collection", id: "promotions-discounts" }]);

  // An empty rule list is an explicit override, not an inheritance request.
  const emptySelection = resolveSurfaceConfig("shop", globalShop, { surface: "shop", selection: [] });
  assert.equal(emptySelection.inheritedSelection, false);
  assert.deepEqual(emptySelection.selection.rules, []);
});

test("home does not inherit shop and an unset surface falls back to catalog order", () => {
  const globalShop = { surface: "shop", selection: [{ source: "flag", id: "featured" }], orderingKey: "newest" };

  assert.throws(() => resolveSurfaceConfig("home", globalShop, null), /does not inherit/i);

  const home = resolveSurfaceConfig("home", null, null);
  assert.equal(home.orderingKey, "catalog");
  assert.equal(home.inheritedSelection, true);
  assert.equal(home.inheritedOrdering, true);
  assert.deepEqual(home.selection, { match: "and", rules: [] });

  const globalHome = resolveSurfaceConfig("home", { surface: "home", orderingKey: "priceAsc" }, null);
  assert.equal(globalHome.orderingKey, "priceAsc");
  assert.deepEqual(DISPLAY_SURFACES, ["home", "shop"]);
});

test("only active, visible, non-trashed products are eligible", () => {
  const products = [
    product("ok"),
    product("inactive", { isActive: false }),
    product("hidden", { visible: false }),
    product("trashed", { deletedAt: now }),
    product("trashed-legacy", { deleted_at: now }),
    null,
  ];
  assert.deepEqual(ids(eligibleProducts(products)), ["ok"]);
  assert.equal(isEligibleProduct(product("ok")), true);
  assert.equal(isEligibleProduct(product("off", { isActive: false })), false);
});

test("brand boundary keeps only that brand and rejects unknown brands", () => {
  const products = [
    product("a1", { brandId: "brand-a" }),
    product("b1", { brandId: "brand-b" }),
    product("a2", { brandId: "brand-a" }),
  ];
  const brands = [{ id: "brand-a" }, { id: "brand-b" }];

  assert.deepEqual(ids(applyBrandBoundary(products, "brand-b")), ["b1"]);
  assert.deepEqual(ids(applyBrandBoundary(products, null)), ["a1", "b1", "a2"]);
  assert.equal(assertKnownBrand("brand-a", brands), "brand-a");
  assert.equal(assertKnownBrand(null, brands), null);
  assert.throws(() => assertKnownBrand("brand-z", brands), /Unknown brand/);

  const scoped = resolveDisplayPriority({
    surface: "shop",
    brandId: "brand-b",
    brands,
    products,
    globalConfig: { surface: "shop", orderingKey: "catalog" },
  });
  assert.deepEqual(scoped.orderedIds, ["b1"]);
  assert.equal(scoped.brandId, "brand-b");

  assert.throws(() => resolveDisplayPriority({
    surface: "shop",
    brandId: "brand-z",
    brands,
    products,
  }), /Unknown brand/);
});

/* ------------------------------------------------------------------ *
 * T007 — selection rules: and/or, collections, vocabulary
 * ------------------------------------------------------------------ */

test("match-all and match-any combine rules, defaulting to and", () => {
  const products = [
    product("both", { featured: true, collection: ["promotions-discounts"] }),
    product("flag-only", { featured: true, collection: [] }),
    product("collection-only", { featured: false, collection: ["promotions-discounts"] }),
    product("neither", { featured: false, collection: [] }),
  ];

  const all = { match: "and", rules: [
    { source: "flag", id: "featured" },
    { source: "collection", id: "promotions-discounts" },
  ] };
  const any = { ...all, match: "or" };

  assert.deepEqual(ids(applySelection(products, all)), ["both"]);
  assert.deepEqual(ids(applySelection(products, any)), ["both", "flag-only", "collection-only"]);

  // Omitted match defaults to match-all (D2).
  const defaulted = normalizeSelection({ rules: all.rules });
  assert.equal(defaulted.match, "and");
  assert.deepEqual(ids(applySelection(products, defaulted)), ["both"]);

  // No rules means every eligible product in the boundary.
  assert.deepEqual(ids(applySelection(products, { match: "or", rules: [] })), ["both", "flag-only", "collection-only", "neither"]);
});

test("saved flag featured matches the featured collection", () => {
  const products = [
    product("flag-only", { featured: true, collection: [] }),
    product("collection-only", { featured: false, collection: ["featured"] }),
    product("both", { featured: true, collection: ["featured"] }),
    product("other", { featured: false, collection: ["new-arrivals"] }),
  ];
  const selection = { match: "or", rules: [{ source: "flag", id: "featured" }] };
  assert.deepEqual(ids(applySelection(products, selection)), ["flag-only", "collection-only", "both"]);

  const resolved = resolveDisplayPriority({
    surface: "home",
    products,
    globalConfig: { surface: "home", selection, orderingKey: "catalog" },
  });
  assert.deepEqual(resolved.orderedIds, ["both", "collection-only", "flag-only"]);
});

test("promotional collection id promotions-discounts is a valid selection source", () => {
  const products = [
    product("promo", { collection: ["promotions-discounts"] }),
    product("featured-collection", { collection: ["featured"] }),
    product("plain", { collection: [] }),
  ];

  const selection = normalizeSelection([{ source: "collection", id: "promotions-discounts" }]);
  assert.deepEqual(selection, { match: "and", rules: [{ source: "collection", id: "promotions-discounts" }] });
  assert.deepEqual(ids(applySelection(products, selection)), ["promo"]);

  assert.throws(
    () => normalizeSelection([{ source: "collection", id: "not-a-real-collection" }]),
    /Unknown collection id/,
  );
  assert.throws(
    () => normalizeSelection([{ source: "flag", id: "quickShop" }]),
    /quickShop is not a selection source/,
  );
  assert.throws(
    () => normalizeSelection([{ source: "promotion", id: "x" }]),
    /Unknown selection source/,
  );
});

test("filter and category rules reuse the existing catalog vocabulary", () => {
  const products = [
    product("aged", { age: ["3-6y"], categoryId: "cat-1", mainCategoryId: "main-1" }),
    product("other-age", { age: ["10+y"], categoryId: "cat-2" }),
  ];

  const byAge = normalizeSelection([{ source: "filter", group: "age", id: "3-6y" }]);
  assert.deepEqual(ids(applySelection(products, byAge)), ["aged"]);

  const byCategory = normalizeSelection([{ source: "category", id: "main-1" }]);
  assert.deepEqual(ids(applySelection(products, byCategory)), ["aged"]);

  assert.throws(
    () => normalizeSelection([{ source: "filter", group: "age", id: "99-99y" }]),
    /Unknown filter id/,
  );
  assert.throws(
    () => normalizeSelection([{ source: "filter", group: "size", id: "3-6y" }]),
    /Unknown filter group/,
  );
  assert.throws(
    () => normalizeSelection([{ source: "category", id: "ghost" }], { knownCategoryIds: ["cat-1"] }),
    /Unknown category id/,
  );
});

/* ------------------------------------------------------------------ *
 * T006 — verified sales allow-list
 * ------------------------------------------------------------------ */

test("verified units count completed, complete, and delivered only", () => {
  const orders = [
    { status: "Completed", items: [{ productId: "a", quantity: 2 }, { productId: "b", qty: 1 }] },
    { status: "complete", items: [{ productId: "a", quantity: 3 }] },
    { status: "DELIverED", items: [{ productId: "c", quantity: 4 }] },
    { status: "cancelled", items: [{ productId: "a", quantity: 100 }] },
    { status: "Returned", items: [{ productId: "b", quantity: 100 }] },
    { status: "pending", items: [{ productId: "c", quantity: 100 }] },
    { status: "processing", items: [{ productId: "d", quantity: 100 }] },
    { status: "shipped", items: [{ productId: "d", quantity: 100 }] },
    { status: "refunded", items: [{ productId: "e", quantity: 100 }] },
    { status: "in progress", items: [{ productId: "e", quantity: 100 }] },
    { status: "Completed", payment_method: "cod", items: [{ productId: "f", quantity: 1 }] },
    { status: "Completed", items: [{ productId: "a", quantity: 0 }] },
    { status: null, items: [{ productId: "g", quantity: 5 }] },
    { status: "Completed", order_items: [{ product_id: "h", quantity: 7 }] },
  ];

  const counts = verifiedUnitsByProductId(orders);
  assert.equal(counts.get("a"), 5);
  assert.equal(counts.get("b"), 1);
  assert.equal(counts.get("c"), 4);
  assert.equal(counts.get("f"), 1);
  assert.equal(counts.get("h"), 7);
  for (const ignored of ["d", "e", "g"]) {
    assert.equal(counts.has(ignored), false, `${ignored} must not be counted`);
  }

  assert.deepEqual([...VERIFIED_ORDER_STATUSES], ["completed", "complete", "delivered"]);
  for (const status of ["completed", "Completed", "COMPLETE", "delivered", "Delivered", " complete "]) {
    assert.equal(isVerifiedOrderStatus(status), true, status);
  }
  for (const status of ["cancelled", "returned", "refunded", "pending", "processing", "shipped", "in progress", "", null, undefined]) {
    assert.equal(isVerifiedOrderStatus(status), false, String(status));
  }
  assert.equal(verifiedUnitsByProductId(null).size, 0);
});

/* ------------------------------------------------------------------ *
 * T007/T008 — ordering keys
 * ------------------------------------------------------------------ */

test("approved ordering keys sequence the selected set", () => {
  assert.deepEqual([...ORDERING_KEYS], [
    "catalog", "featured", "newArrival", "bestseller", "verifiedSales",
    "manual", "newest", "oldest", "priceAsc", "priceDesc", "name",
  ]);

  const verified = new Map([["p1", 5], ["p2", 1]]);
  const manual = [{ productId: "p3", position: 0 }, { productId: "p1", position: 1 }];

  const expected = {
    catalog: ["p2", "p1", "p3"],
    featured: ["p2", "p1", "p3"],
    newArrival: ["p3", "p2", "p1"],
    bestseller: ["p2", "p1", "p3"],
    verifiedSales: ["p1", "p2", "p3"],
    manual: ["p3", "p1", "p2"],
    newest: ["p2", "p3", "p1"],
    oldest: ["p1", "p3", "p2"],
    priceAsc: ["p2", "p3", "p1"],
    priceDesc: ["p1", "p3", "p2"],
    name: ["p2", "p3", "p1"],
  };

  for (const key of ORDERING_KEYS) {
    const ordered = applyOrderingKey(orderProducts, key, {
      verifiedUnits: verified,
      manualPositions: manual,
    });
    assert.deepEqual(ids(ordered), expected[key], `ordering key ${key}`);
  }

  // The bestseller badge is a flag, not sales: it must not follow unit counts.
  assert.deepEqual(
    ids(applyOrderingKey(orderProducts, "bestseller", { verifiedUnits: verified })),
    ["p2", "p1", "p3"],
  );
  assert.deepEqual(
    ids(applyOrderingKey(orderProducts, "verifiedSales", { verifiedUnits: verified })),
    ["p1", "p2", "p3"],
  );

  // No verified units → catalog fallback, never an invented sales rank.
  assert.deepEqual(
    ids(applyOrderingKey(orderProducts, "verifiedSales", { verifiedUnits: new Map() })),
    ["p2", "p1", "p3"],
  );

  // Manual ids outside the selection are simply absent; missing ids follow.
  assert.deepEqual(
    ids(applyOrderingKey([orderProducts[0], orderProducts[2]], "manual", { manualPositions: manual })),
    ["p3", "p1"],
  );
});

test("quick shop, most-viewed, and random are rejected ordering keys", () => {
  assert.ok(REJECTED_ORDERING_KEYS.includes("quickShop"));
  assert.ok(REJECTED_ORDERING_KEYS.includes("mostViewed"));
  assert.ok(REJECTED_ORDERING_KEYS.includes("random"));

  for (const key of ["quickShop", "mostViewed", "random", "most-viewed"]) {
    assert.throws(() => normalizeOrderingKey(key), /not supported|Unknown ordering key/, key);
    assert.throws(() => applyOrderingKey(orderProducts, key), /not supported|Unknown ordering key/, key);
  }

  assert.equal(normalizeOrderingKey(null), null);
  assert.equal(normalizeOrderingKey(undefined), null);
  assert.equal(normalizeOrderingKey(""), null);
  assert.throws(() => normalizeOrderingKey("trending", { allowNull: false }), /Unknown ordering key/);
});

/* ------------------------------------------------------------------ *
 * Composed resolver
 * ------------------------------------------------------------------ */

test("resolveDisplayPriority applies inheritance, boundary, selection, and ordering", () => {
  const products = [
    product("a1", { brandId: "brand-a", sortOrder: 1, price: 30, featured: true, collection: ["promotions-discounts"] }),
    product("a2", { brandId: "brand-a", sortOrder: 2, price: 10, featured: false, collection: ["promotions-discounts"] }),
    product("a3", { brandId: "brand-a", sortOrder: 3, price: 20, featured: true, collection: [] }),
    product("b1", { brandId: "brand-b", sortOrder: 4, price: 5, featured: true, collection: ["promotions-discounts"] }),
    product("a-off", { brandId: "brand-a", isActive: false, featured: true, collection: ["promotions-discounts"] }),
  ];
  const brands = [{ id: "brand-a" }, { id: "brand-b" }];
  const globalShop = {
    surface: "shop",
    selection: { match: "and", rules: [
      { source: "flag", id: "featured" },
      { source: "collection", id: "promotions-discounts" },
    ] },
    orderingKey: "catalog",
  };

  const global = resolveDisplayPriority({
    surface: "shop",
    products,
    globalConfig: globalShop,
    brands,
  });
  assert.equal(global.inheritedSelection, true);
  assert.equal(global.inheritedOrdering, true);
  assert.deepEqual(global.orderedIds, ["a1", "b1"]);
  assert.ok(!("salesCount" in global));

  // Brand override: own ordering, inherited selection, same boundary.
  const brand = resolveDisplayPriority({
    surface: "shop",
    brandId: "brand-a",
    brandConfig: { surface: "shop", orderingKey: "newest" },
    globalConfig: globalShop,
    products,
    brands,
  });
  assert.equal(brand.inheritedSelection, true);
  assert.equal(brand.inheritedOrdering, false);
  assert.equal(brand.orderingKey, "newest");
  assert.deepEqual(brand.orderedIds, ["a1"]);

  // Verified sales ordering on top of an empty (all-eligible) selection.
  const sales = resolveDisplayPriority({
    surface: "shop",
    brandId: "brand-a",
    globalConfig: { surface: "shop", selection: [], orderingKey: "verifiedSales" },
    products,
    brands,
    verifiedUnits: new Map([["a3", 9], ["a1", 2]]),
  });
  assert.equal(sales.orderingKey, "verifiedSales");
  assert.deepEqual(sales.orderedIds, ["a3", "a1", "a2"]);

  // Home is configured independently of shop.
  const home = resolveDisplayPriority({
    surface: "home",
    brandId: "brand-a",
    globalConfig: { surface: "home", orderingKey: "priceAsc" },
    products,
    brands,
  });
  assert.deepEqual(home.orderedIds, ["a2", "a3", "a1"]);
  assert.equal(home.inheritedOrdering, true);
});

/* ------------------------------------------------------------------ *
 * T004 — persistence exports (file mode, no shared database)
 * ------------------------------------------------------------------ */

test("store exports tenant-scoped display persistence with a file-mode round trip", async () => {
  // The shared temp store configured at module load is already file mode:
  // DATABASE_URL stays empty, so nothing touches a shared database.
  const store = await import("../src/data/store.js");
  for (const name of [
    "listProductDisplayModes",
    "listProductDisplayPositions",
    "saveProductDisplayConfiguration",
    "deleteProductDisplayConfiguration",
  ]) {
    assert.equal(typeof store[name], "function", `${name} must be exported`);
  }

  const companyId = "display-priority-co";
  store.productRepository.createForCompany(companyId, { id: "p1", slug: "p1" });
  store.productRepository.createForCompany(companyId, { id: "p2", slug: "p2" });

  const saved = await store.saveProductDisplayConfiguration(companyId, {
    surface: "shop",
    brandId: null,
    orderingKey: "manual",
    selectionMatch: "and",
    selection: [{ source: "collection", id: "promotions-discounts" }],
    productIds: ["p2", "p1"],
  });
  assert.equal(saved.mode.surface, "shop");
  assert.equal(saved.mode.brandId, null);
  assert.equal(saved.mode.orderingKey, "manual");
  assert.deepEqual(saved.positions.map((row) => row.productId), ["p2", "p1"]);

  const modes = await store.listProductDisplayModes(companyId);
  assert.equal(modes.length, 1);
  assert.equal(modes[0].orderingKey, "manual");

  const globalPositions = await store.listProductDisplayPositions(companyId, { surface: "shop", brandId: null });
  assert.deepEqual(globalPositions.map((row) => row.position), [0, 1]);

  // A brand override is a separate scope row; the global row is untouched.
  await store.saveProductDisplayConfiguration(companyId, {
    surface: "shop",
    brandId: "brand-a",
    orderingKey: "newest",
    selection: null,
  });
  const afterBrand = await store.listProductDisplayModes(companyId);
  assert.equal(afterBrand.length, 2);
  const brandMode = afterBrand.find((row) => row.brandId === "brand-a");
  assert.equal(brandMode.orderingKey, "newest");

  // Position rows exist only for manual.
  await store.saveProductDisplayConfiguration(companyId, {
    surface: "shop",
    brandId: null,
    orderingKey: "newest",
    selection: [{ source: "flag", id: "featured" }],
  });
  assert.deepEqual(await store.listProductDisplayPositions(companyId, { surface: "shop", brandId: null }), []);

  // Manual ids outside the tenant catalog are refused.
  await assert.rejects(
    store.saveProductDisplayConfiguration(companyId, {
      surface: "home",
      orderingKey: "manual",
      productIds: ["ghost-product"],
    }),
    /Unknown product id/,
  );

  // Another company sees nothing.
  assert.deepEqual(await store.listProductDisplayModes("other-display-co"), []);

  const removed = await store.deleteProductDisplayConfiguration(companyId, "shop", "brand-a");
  assert.equal(removed.deleted, true);
  assert.equal((await store.listProductDisplayModes(companyId)).length, 1);

  // Rows survive a local file write (no shared database involved).
  const persisted = JSON.parse(fs.readFileSync(path.join(dataStoreDir, "store.json"), "utf8"));
  assert.equal(persisted.productDisplayModes.length, 1);
  assert.equal(persisted.productDisplayModes[0].company_id, companyId);
  assert.equal(persisted.productDisplayPositions.length, 0);
});

test("postgres display persistence is company-scoped and runs under the tenant write lock", () => {
  const source = fs.readFileSync(
    path.join(repoRoot, "api/src/data/postgresStore.js"),
    "utf8",
  );

  const functions = [
    "listProductDisplayModesFromSupabase",
    "listProductDisplayOrderFromSupabase",
    "saveProductDisplayConfigurationInSupabase",
    "deleteProductDisplayConfigurationInSupabase",
  ];

  for (const name of functions) {
    const anchors = [
      source.indexOf(`export async function ${name}`),
      source.indexOf(`export function ${name}`),
    ].filter((index) => index !== -1);
    assert.ok(anchors.length, `${name} must exist`);
    const anchor = Math.min(...anchors);
    const body = source.slice(anchor, anchor + 5000);
    assert.match(body, /company_id/, `${name} must scope every query by company_id`);
    if (name.startsWith("save") || name.startsWith("delete")) {
      assert.match(body, /withTenantCatalogWriteLock/, `${name} must use the tenant catalog write lock`);
      assert.match(body, /public\.product_display_(modes|order)/, `${name} must touch the display tables`);
    }
  }

  // Both display tables are read, written, and deleted under company scope.
  for (const table of ["product_display_modes", "product_display_order"]) {
    const occurrences = source.split(table).length - 1;
    assert.ok(occurrences >= 3, `${table} should appear in read, write, and delete paths`);
  }

  // The local (file) store mirrors the same collections.
  const storeSource = fs.readFileSync(path.join(repoRoot, "api/src/data/store.js"), "utf8");
  assert.match(storeSource, /productDisplayModes/);
  assert.match(storeSource, /productDisplayPositions/);
});

/* ------------------------------------------------------------------ *
 * T010/T016/T018 — admin display priority API against the running server
 * (file mode: DATA_STORE_DIR temp store, no shared database).
 * ------------------------------------------------------------------ */

/** Reads use the company_admin (the role passes the products.view check). */
function getScope(surface, brandId) {
  return displayGet(adminToken, brandId ? { surface, brandId } : { surface });
}

async function readShopScopes() {
  const globalScope = await getScope("shop");
  const brandScope = await getScope("shop", "dp-brand");
  assert.equal(globalScope.status, 200, JSON.stringify(globalScope.body));
  assert.equal(brandScope.status, 200, JSON.stringify(brandScope.body));
  return { global: globalScope.body, brand: brandScope.body };
}

/** Persisted dp-co mode rows — proves a refused PUT never wrote anything. */
function persistedDpModes() {
  const persisted = JSON.parse(fs.readFileSync(path.join(dataStoreDir, "store.json"), "utf8"));
  return (persisted.productDisplayModes || []).filter((row) => row.company_id === "dp-co");
}

const promotionRule = { source: "collection", id: "promotions-discounts" };

test("PUT global shop selection with a collection rule and newest ordering returns 200", async () => {
  const put = await displayPut(updateToken, {
    surface: "shop",
    brandId: null,
    selection: [promotionRule],
    orderingKey: "newest",
  });
  assert.equal(put.status, 200, JSON.stringify(put.body));
  assert.equal(put.body.surface, "shop");
  assert.equal(put.body.brandId, null);
  assert.equal(put.body.exists, true);
  assert.equal(put.body.selectionMatch, "and");
  assert.equal(put.body.orderingKey, "newest");
  assert.equal(put.body.resolvedOrderingKey, "newest");
  assert.deepEqual(put.body.selection, [promotionRule]);
  assert.deepEqual(put.body.productIds, []);
  assert.equal(put.body.inheritedSelection, true);
  assert.equal(put.body.inheritedOrdering, true);

  const read = await getScope("shop");
  assert.equal(read.status, 200, JSON.stringify(read.body));
  assert.equal(read.body.orderingKey, "newest");
  assert.deepEqual(read.body.selection, [promotionRule]);
  assert.deepEqual(read.body.resolvedSelection.rules, [promotionRule]);
});

test("a brand row with selection null inherits the selection and stores orderingKey name", async () => {
  const put = await displayPut(updateToken, {
    surface: "shop",
    brandId: "dp-brand",
    selection: null,
    orderingKey: "name",
  });
  assert.equal(put.status, 200, JSON.stringify(put.body));
  assert.equal(put.body.brandId, "dp-brand");
  assert.equal(put.body.exists, true);
  assert.equal(put.body.selection, null, "null selection must stay null (inherit)");
  assert.equal(put.body.orderingKey, "name");
  assert.equal(put.body.inheritedSelection, true);
  assert.equal(put.body.inheritedOrdering, false);
  assert.equal(put.body.resolvedOrderingKey, "name");
  assert.deepEqual(put.body.resolvedSelection.rules, [promotionRule]);

  const read = await getScope("shop", "dp-brand");
  assert.equal(read.status, 200, JSON.stringify(read.body));
  assert.equal(read.body.selection, null);
  assert.equal(read.body.orderingKey, "name");
  assert.equal(read.body.inheritedSelection, true);
});

test("a home PUT does not change the shop row", async () => {
  const before = await readShopScopes();

  const homePut = await displayPut(updateToken, {
    surface: "home",
    brandId: null,
    selection: [{ source: "flag", id: "featured" }],
    orderingKey: "priceAsc",
  });
  assert.equal(homePut.status, 200, JSON.stringify(homePut.body));
  assert.equal(homePut.body.surface, "home");
  assert.equal(homePut.body.orderingKey, "priceAsc");

  assert.deepEqual(await readShopScopes(), before, "shop scopes must be untouched");

  const homeRead = await getScope("home");
  assert.equal(homeRead.status, 200, JSON.stringify(homeRead.body));
  assert.equal(homeRead.body.orderingKey, "priceAsc");
  assert.deepEqual(homeRead.body.selection, [{ source: "flag", id: "featured" }]);
});

test("global shop selection stores match 'and' and match 'or' distinctly", async () => {
  const rules = [
    { source: "flag", id: "featured" },
    { source: "category", id: "dp-sub" },
  ];

  const andPut = await displayPut(updateToken, {
    surface: "shop",
    selection: { match: "and", rules },
    orderingKey: "newest",
  });
  assert.equal(andPut.status, 200, JSON.stringify(andPut.body));
  assert.equal(andPut.body.selectionMatch, "and");
  assert.equal(andPut.body.resolvedSelection.match, "and");

  const andRead = await getScope("shop");
  assert.equal(andRead.body.selectionMatch, "and");
  assert.deepEqual(andRead.body.resolvedSelection.rules, rules);

  const orPut = await displayPut(updateToken, {
    surface: "shop",
    selection: { match: "or", rules },
    orderingKey: "newest",
  });
  assert.equal(orPut.status, 200, JSON.stringify(orPut.body));
  assert.equal(orPut.body.selectionMatch, "or");
  assert.equal(orPut.body.resolvedSelection.match, "or");

  const orRead = await getScope("shop");
  assert.equal(orRead.body.selectionMatch, "or");
  assert.equal(orRead.body.resolvedSelection.match, "or");
  assert.deepEqual(orRead.body.resolvedSelection.rules, rules);

  // The two stored modes really do select different sets.
  const fixtures = [
    product("dp-fx-both", { featured: true, categoryId: "dp-sub" }),
    product("dp-fx-cat", { featured: false, categoryId: "dp-sub" }),
    product("dp-fx-none", { featured: false, categoryId: "dp-none" }),
  ];
  assert.deepEqual(ids(applySelection(fixtures, andRead.body.resolvedSelection)), ["dp-fx-both"]);
  assert.deepEqual(ids(applySelection(fixtures, orRead.body.resolvedSelection)), ["dp-fx-both", "dp-fx-cat"]);
});

test("a user with only products.view is refused (403) on PUT and writes nothing", async () => {
  const before = await readShopScopes();
  const beforeFile = JSON.stringify(persistedDpModes());

  const denied = await displayPut(viewToken, {
    surface: "shop",
    selection: [{ source: "flag", id: "featured" }],
    orderingKey: "name",
  });
  assert.equal(denied.status, 403, JSON.stringify(denied.body));

  assert.deepEqual(await readShopScopes(), before);
  assert.equal(JSON.stringify(persistedDpModes()), beforeFile);
});

test("a brand id or a product id from company dp-other returns 400 and writes nothing", async () => {
  const before = await readShopScopes();
  const beforeFile = JSON.stringify(persistedDpModes());

  const brandPut = await displayPut(updateToken, {
    surface: "shop",
    brandId: "other-brand",
    orderingKey: "newest",
  });
  assert.equal(brandPut.status, 400, JSON.stringify(brandPut.body));
  assert.match(String(brandPut.body.message), /Unknown brand/);

  const productPut = await displayPut(updateToken, {
    surface: "shop",
    selection: [{ source: "flag", id: "featured" }],
    orderingKey: "catalog",
    productIds: ["other-x"],
  });
  assert.equal(productPut.status, 400, JSON.stringify(productPut.body));
  assert.match(String(productPut.body.message), /Unknown product id/);

  assert.deepEqual(await readShopScopes(), before);
  assert.equal(JSON.stringify(persistedDpModes()), beforeFile);
});

test("verifiedSales with no allow-listed units returns 409 and writes nothing", async () => {
  const before = await readShopScopes();
  const beforeFile = JSON.stringify(persistedDpModes());

  // dp-brand holds dp-b and dp-c; their only order is "processing", which the
  // allow-list never counts, so the selected set has zero verified units.
  const denied = await displayPut(updateToken, {
    surface: "shop",
    brandId: "dp-brand",
    selection: [{ source: "category", id: "dp-sub" }],
    orderingKey: "verifiedSales",
  });
  assert.equal(denied.status, 409, JSON.stringify(denied.body));
  assert.match(String(denied.body.message), /verified unit/i);

  assert.deepEqual(await readShopScopes(), before);
  assert.equal(JSON.stringify(persistedDpModes()), beforeFile);
});

test("a manual product id outside the selection returns 400 and writes nothing", async () => {
  const before = await readShopScopes();
  const beforeFile = JSON.stringify(persistedDpModes());

  const denied = await displayPut(updateToken, {
    surface: "shop",
    selection: [{ source: "flag", id: "featured" }],
    orderingKey: "manual",
    productIds: ["dp-b"],
  });
  assert.equal(denied.status, 400, JSON.stringify(denied.body));
  assert.match(String(denied.body.message), /outside the configured selection/);

  assert.deepEqual(await readShopScopes(), before);
  assert.equal(JSON.stringify(persistedDpModes()), beforeFile);
});

test("quickShop, mostViewed, and random ordering keys are refused with 400", async () => {
  const before = await readShopScopes();
  const beforeFile = JSON.stringify(persistedDpModes());

  for (const orderingKey of ["quickShop", "mostViewed", "random"]) {
    const denied = await displayPut(updateToken, { surface: "shop", orderingKey });
    assert.equal(denied.status, 400, `${orderingKey}: ${JSON.stringify(denied.body)}`);
    assert.match(String(denied.body.message), /not supported|Unknown ordering key/);
  }

  assert.deepEqual(await readShopScopes(), before);
  assert.equal(JSON.stringify(persistedDpModes()), beforeFile);
});

test("a successful PUT records exactly one product.display_priority_updated activity", async () => {
  const { activityLogRepository } = await import("../src/data/store.js");
  const entries = () => activityLogRepository.getByCompany("dp-co")
    .filter((entry) => entry.action === "product.display_priority_updated");
  const beforeCount = entries().length;

  const put = await displayPut(updateToken, {
    surface: "shop",
    brandId: "dp-brand-2",
    orderingKey: "newest",
  });
  assert.equal(put.status, 200, JSON.stringify(put.body));

  const after = entries();
  assert.equal(after.length, beforeCount + 1, "exactly one new activity entry");
  const created = after.filter((entry) => entry.entity_id === "shop::dp-brand-2");
  assert.equal(created.length, 1, "one product.display_priority_updated entry for this scope");
  assert.equal(created[0].company_id, "dp-co");
  assert.equal(created[0].metadata?.operation, "put");
  assert.equal(created[0].metadata?.orderingKey, "newest");
});

test("file-mode brand save with selection null resolves as inherited selection and newest ordering", async () => {
  const store = await import("../src/data/store.js");

  const saved = await store.saveProductDisplayConfiguration("dp-co", {
    surface: "shop",
    brandId: "dp-brand",
    selection: null,
    orderingKey: "newest",
  });
  assert.equal(saved.mode.surface, "shop");
  assert.equal(saved.mode.brandId, "dp-brand");
  assert.equal(saved.mode.selection, null);
  assert.equal(saved.mode.orderingKey, "newest");

  const modes = await store.listProductDisplayModes("dp-co");
  const globalRow = modes.find((row) => row.surface === "shop" && (row.brandId ?? null) === null);
  const brandRow = modes.find((row) => row.surface === "shop" && (row.brandId ?? null) === "dp-brand");
  assert.ok(brandRow, "brand row must be stored in file mode");
  assert.equal(brandRow.selection, null);
  assert.equal(brandRow.orderingKey, "newest");

  const brandConfig = displayConfigFromRow(brandRow);
  assert.equal(brandConfig.selection, null);
  assert.equal(brandConfig.orderingKey, "newest");

  const resolved = resolveSurfaceConfig("shop", displayConfigFromRow(globalRow), brandConfig);
  assert.equal(resolved.inheritedSelection, true);
  assert.equal(resolved.orderingKey, "newest");
});
