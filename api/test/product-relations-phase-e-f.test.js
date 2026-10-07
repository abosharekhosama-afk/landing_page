import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";
import { hashPassword } from "../src/auth/passwords.js";
import {
  FBT_MAX,
  compareProductsDeterministic,
  dedupeProductIds,
  normalizeRelationType,
  resolveFrequentlyBoughtTogether,
  resolveRelatedProducts,
  validateRelationTargetIds,
} from "../src/products/productRelations.js";
import { serializePublicProduct } from "../src/storefront/publicContent.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "product-phase-ef-"));
const password = "PhaseEF-relations-123!";
const passwordHash = await hashPassword(password);
const now = "2026-09-07T12:00:00.000Z";

const company = (id, settings = {}) => ({
  id,
  slug: id,
  name: id,
  status: "active",
  domain: `${id}.example.com`,
  domains: [`${id}.example.com`],
  storefrontUrl: `https://${id}.example.com/`,
  storefrontPath: "/",
  settings: {
    language: "en",
    currency: "USD",
    storefrontUrl: `https://${id}.example.com/`,
    storefrontPath: "/",
    websiteConnection: {
      siteId: `${id}-storefront`,
      storefrontBaseUrl: `https://${id}.example.com`,
      defaultLocale: "en",
      supportedLocales: ["en"],
    },
    ...settings,
  },
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

const product = (overrides = {}) => ({
  brandId: "icare-brand",
  categoryId: "icare-sub-a",
  mainCategoryId: "icare-main",
  subcategoryId: "icare-sub-a",
  isActive: true,
  visible: true,
  sortOrder: 0,
  createdAt: now,
  updatedAt: now,
  variants: [{ id: "v", size: "S", price: 10, stock: 5 }],
  stockQty: 5,
  ...overrides,
});

fs.writeFileSync(path.join(dataDir, "store.json"), JSON.stringify({
  version: 2,
  companies: [company("icare"), company("eb-chemical")],
  users: [
    user("icare-admin", "icare"),
    user("eb-admin", "eb-chemical"),
    user("icare-view", "icare", "employee", ["products.view"]),
    user("icare-update", "icare", "employee", ["products.view", "products.update"]),
    user("icare-permanent", "icare", "employee", ["products.view", "products.delete", "products.permanent_delete"]),
  ],
  memberships: [
    { id: "m1", companyId: "icare", userId: "icare-admin", role: "company_admin", status: "active", permissions: [], createdAt: now, updatedAt: now },
    { id: "m2", companyId: "eb-chemical", userId: "eb-admin", role: "company_admin", status: "active", permissions: [], createdAt: now, updatedAt: now },
    { id: "m3", companyId: "icare", userId: "icare-view", role: "employee", status: "active", permissions: ["products.view"], createdAt: now, updatedAt: now },
    { id: "m4", companyId: "icare", userId: "icare-update", role: "employee", status: "active", permissions: ["products.view", "products.update"], createdAt: now, updatedAt: now },
    { id: "m5", companyId: "icare", userId: "icare-permanent", role: "employee", status: "active", permissions: ["products.view", "products.delete", "products.permanent_delete"], createdAt: now, updatedAt: now },
  ],
  brands: [
    { id: "icare-brand", slug: "icare-brand", name: { en: "iCare" }, company_id: "icare", isActive: true },
    { id: "eb-brand", slug: "eb-brand", name: { en: "EB" }, company_id: "eb-chemical", isActive: true },
  ],
  categories: [
    { id: "icare-main", slug: "main", name: { en: "Main" }, parentId: null, brandId: "icare-brand", company_id: "icare", isActive: true },
    { id: "icare-sub-a", slug: "sub-a", name: { en: "Sub A" }, parentId: "icare-main", brandId: null, company_id: "icare", isActive: true },
    { id: "icare-sub-b", slug: "sub-b", name: { en: "Sub B" }, parentId: "icare-main", brandId: null, company_id: "icare", isActive: true },
  ],
  products: [
    product({ id: "src", slug: "src", sku: "SRC", name: { en: "Source" }, company_id: "icare", sortOrder: 0 }),
    product({ id: "rel-1", slug: "rel-1", sku: "R1", name: { en: "Related One" }, company_id: "icare", sortOrder: 1 }),
    product({ id: "rel-2", slug: "rel-2", sku: "R2", name: { en: "Related Two" }, company_id: "icare", sortOrder: 2 }),
    product({
      id: "sub-peer-1",
      slug: "sub-peer-1",
      sku: "SP1",
      name: { en: "Sub Peer 1" },
      company_id: "icare",
      sortOrder: 3,
      subcategoryId: "icare-sub-a",
      categoryId: "icare-sub-a",
    }),
    product({
      id: "sub-peer-2",
      slug: "sub-peer-2",
      sku: "SP2",
      name: { en: "Sub Peer 2" },
      company_id: "icare",
      sortOrder: 4,
      subcategoryId: "icare-sub-a",
      categoryId: "icare-sub-a",
    }),
    product({
      id: "cat-peer",
      slug: "cat-peer",
      sku: "CP1",
      name: { en: "Category Peer" },
      company_id: "icare",
      sortOrder: 5,
      subcategoryId: "icare-sub-b",
      categoryId: "icare-sub-b",
      mainCategoryId: "icare-main",
    }),
    product({
      id: "inactive-peer",
      slug: "inactive-peer",
      sku: "IN1",
      name: { en: "Inactive" },
      company_id: "icare",
      isActive: false,
      sortOrder: 6,
    }),
    product({
      id: "trashed-peer",
      slug: "trashed-peer",
      sku: "TR1",
      name: { en: "Trashed" },
      company_id: "icare",
      deletedAt: now,
      deleted_at: now,
      sortOrder: 7,
    }),
    product({
      id: "costy",
      slug: "costy",
      sku: "COST",
      name: { en: "Costy" },
      company_id: "icare",
      sortOrder: 8,
      variants: [{ id: "vc", size: "M", price: 20, stock: 2, costPrice: 4 }],
    }),
    {
      id: "eb-item",
      slug: "eb-item",
      sku: "EB1",
      name: { en: "EB Item" },
      company_id: "eb-chemical",
      brandId: "eb-brand",
      categoryId: "eb-cat",
      isActive: true,
      visible: true,
      sortOrder: 0,
      createdAt: now,
      updatedAt: now,
      variants: [{ id: "ev", size: "L", price: 9, stock: 1 }],
    },
  ],
  productRelations: [],
  orders: [],
}, null, 2));

process.env.DATA_STORE_DIR = dataDir;
process.env.DATABASE_URL = "";
process.env.POSTGRES_URL = "";
process.env.SUPABASE_URL = "";
process.env.SUPABASE_SERVICE_ROLE_KEY = "";
process.env.JWT_SECRET = "phase-ef-product-test-secret";
process.env.NODE_ENV = "test";
process.env.ALLOW_LOCAL_CATALOG_STORAGE = "true";
process.env.UPLOADS_DIR = path.join(dataDir, "uploads");
fs.mkdirSync(process.env.UPLOADS_DIR, { recursive: true });

const { app } = await import(`../src/server.js?phaseef=${Date.now()}`);
const {
  activityLogRepository,
  productRelationRepository,
  productRepository,
} = await import("../src/data/store.js");
const server = app.listen(0, "127.0.0.1");
await new Promise((resolve) => server.once("listening", resolve));
after(() => server.close());
const base = `http://127.0.0.1:${server.address().port}/api`;

async function login(email, companyId = "icare") {
  const response = await fetch(`${base}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Company-Id": companyId },
    body: JSON.stringify({ email, password }),
  });
  const body = await response.json();
  assert.equal(response.status, 200, JSON.stringify(body));
  return body.token;
}

async function api(token, pathname, { method = "GET", body, companyId = "icare" } = {}) {
  const response = await fetch(`${base}${pathname}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Company-Id": companyId,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let parsed = null;
  try { parsed = text ? JSON.parse(text) : null; } catch { parsed = text; }
  return { response, body: parsed };
}

async function storefront(pathname, companyId = "icare") {
  const response = await fetch(`${base}/storefront${pathname}`, {
    headers: {
      "X-Company-Id": companyId,
      "X-Site-Id": `${companyId}-storefront`,
    },
  });
  const text = await response.text();
  let parsed = null;
  try { parsed = text ? JSON.parse(text) : null; } catch { parsed = text; }
  return { response, body: parsed };
}

test("relation helpers: type, dedupe, self/invalid validation", () => {
  assert.equal(normalizeRelationType("related"), "related");
  assert.equal(normalizeRelationType("FBT"), "fbt");
  assert.equal(normalizeRelationType("other"), null);
  assert.deepEqual(dedupeProductIds(["a", "a", "b", "", "b"]), ["a", "b"]);

  const byId = new Map([
    ["src", { id: "src", isActive: true }],
    ["ok", { id: "ok", isActive: true }],
    ["dead", { id: "dead", isActive: false }],
    ["trash", { id: "trash", deletedAt: now }],
  ]);
  assert.deepEqual(
    validateRelationTargetIds({ sourceProductId: "src", targetProductIds: ["ok", "ok"], productsById: byId }),
    ["ok"],
  );
  assert.throws(
    () => validateRelationTargetIds({ sourceProductId: "src", targetProductIds: ["src"], productsById: byId }),
    /itself/i,
  );
  assert.throws(
    () => validateRelationTargetIds({ sourceProductId: "src", targetProductIds: ["missing"], productsById: byId }),
    /Invalid product ID/i,
  );
  assert.throws(
    () => validateRelationTargetIds({ sourceProductId: "src", targetProductIds: ["dead"], productsById: byId }),
    /Inactive/i,
  );
  assert.throws(
    () => validateRelationTargetIds({ sourceProductId: "src", targetProductIds: ["trash"], productsById: byId }),
    /trash/i,
  );
});

test("FBT fallback: subcategory first, category fill, max 8, exclusions", () => {
  const source = {
    id: "src",
    subcategoryId: "sub-a",
    categoryId: "sub-a",
    mainCategoryId: "main",
    sortOrder: 0,
    slug: "src",
  };
  const make = (id, overrides = {}) => ({
    id,
    slug: id,
    sortOrder: Number(overrides.sortOrder ?? 0),
    subcategoryId: overrides.subcategoryId ?? "sub-a",
    categoryId: overrides.categoryId ?? "sub-a",
    mainCategoryId: overrides.mainCategoryId ?? "main",
    isActive: overrides.isActive !== false,
    visible: overrides.visible !== false,
    deletedAt: overrides.deletedAt || null,
  });
  const catalog = [
    make("sub-1", { sortOrder: 2 }),
    make("sub-2", { sortOrder: 1 }),
    make("cat-1", { subcategoryId: "sub-b", categoryId: "sub-b", mainCategoryId: "main", sortOrder: 3 }),
    make("other-main", { subcategoryId: "x", categoryId: "x", mainCategoryId: "other", sortOrder: 0 }),
    make("inactive", { isActive: false, sortOrder: 0 }),
    make("trashed", { deletedAt: now, sortOrder: 0 }),
    make("src", { sortOrder: 0 }),
  ];
  const byId = new Map(catalog.map((item) => [item.id, item]));

  const enoughSub = resolveFrequentlyBoughtTogether({
    sourceProduct: source,
    manualTargetIds: [],
    productsById: byId,
    allCompanyProducts: catalog,
  });
  assert.equal(enoughSub.mode, "fallback");
  assert.deepEqual(enoughSub.products.map((p) => p.id), ["sub-2", "sub-1", "cat-1"]);
  assert.equal(enoughSub.products.some((p) => p.id === "other-main"), false);

  const manual = resolveFrequentlyBoughtTogether({
    sourceProduct: source,
    manualTargetIds: ["sub-1"],
    productsById: byId,
    allCompanyProducts: catalog,
  });
  assert.equal(manual.mode, "manual");
  assert.deepEqual(manual.products.map((p) => p.id), ["sub-1"]);

  const many = Array.from({ length: 12 }, (_, index) => make(`p${index}`, {
    sortOrder: index,
    subcategoryId: "sub-a",
    categoryId: "sub-a",
  }));
  const capped = resolveFrequentlyBoughtTogether({
    sourceProduct: source,
    manualTargetIds: [],
    productsById: new Map(many.map((item) => [item.id, item])),
    allCompanyProducts: many,
  });
  assert.equal(capped.products.length, FBT_MAX);

  const empty = resolveFrequentlyBoughtTogether({
    sourceProduct: { id: "lonely", subcategoryId: "none", categoryId: "none", mainCategoryId: "none" },
    manualTargetIds: [],
    productsById: byId,
    allCompanyProducts: catalog,
  });
  assert.deepEqual(empty.products, []);

  assert.ok(compareProductsDeterministic({ sortOrder: 1, slug: "b" }, { sortOrder: 2, slug: "a" }) < 0);
  assert.deepEqual(
    resolveRelatedProducts({
      sourceProductId: "src",
      manualTargetIds: ["sub-1", "inactive", "src"],
      productsById: byId,
    }).map((p) => p.id),
    ["sub-1"],
  );
});

test("PUT/GET related products; replace; clear; activity log", async () => {
  const token = await login("icare-update@test.local");
  const set = await api(token, "/products/src/relations?type=related", {
    method: "PUT",
    body: { targetProductIds: ["rel-2", "rel-1", "rel-1"] },
  });
  assert.equal(set.response.status, 200, JSON.stringify(set.body));
  assert.deepEqual(set.body.targetProductIds, ["rel-2", "rel-1"]);

  const get = await api(token, "/products/src/relations?type=related");
  assert.equal(get.response.status, 200);
  assert.deepEqual(get.body.targetProductIds, ["rel-2", "rel-1"]);
  assert.equal(get.body.products[0].id, "rel-2");

  const clear = await api(token, "/products/src/relations?type=related", {
    method: "PUT",
    body: { targetProductIds: [] },
  });
  assert.equal(clear.response.status, 200);
  assert.deepEqual(clear.body.targetProductIds, []);

  assert.ok(activityLogRepository.getByCompany("icare").some(
    (log) => log.action === "product.relations_updated" && (log.entity_id === "src" || log.entityId === "src"),
  ));
});

test("relation mutations reject self, inactive, trashed, cross-tenant, and view-only", async () => {
  const token = await login("icare-update@test.local");
  const self = await api(token, "/products/src/relations?type=related", {
    method: "PUT",
    body: { targetProductIds: ["src"] },
  });
  assert.equal(self.response.status, 400);

  const inactive = await api(token, "/products/src/relations?type=fbt", {
    method: "PUT",
    body: { targetProductIds: ["inactive-peer"] },
  });
  assert.equal(inactive.response.status, 400);

  const trashed = await api(token, "/products/src/relations?type=fbt", {
    method: "PUT",
    body: { targetProductIds: ["trashed-peer"] },
  });
  assert.equal(trashed.response.status, 400);

  const cross = await api(token, "/products/src/relations?type=related", {
    method: "PUT",
    body: { targetProductIds: ["eb-item"] },
  });
  assert.equal(cross.response.status, 400);

  const viewToken = await login("icare-view@test.local");
  const denied = await api(viewToken, "/products/src/relations?type=related", {
    method: "PUT",
    body: { targetProductIds: ["rel-1"] },
  });
  assert.equal(denied.response.status, 403);

  const ebToken = await login("eb-admin@test.local", "eb-chemical");
  const isolation = await api(ebToken, "/products/src/relations?type=related", {
    method: "PUT",
    body: { targetProductIds: ["rel-1"] },
    companyId: "eb-chemical",
  });
  assert.equal(isolation.response.status, 404);
});

test("manual FBT takes precedence; fallback when empty; storefront fields safe", async () => {
  const token = await login("icare-update@test.local");

  // No manual FBT → fallback subcategory peers for src (sub-a)
  let detail = await storefront("/products/src");
  assert.equal(detail.response.status, 200, JSON.stringify(detail.body));
  assert.ok(Array.isArray(detail.body.relatedProducts));
  assert.ok(Array.isArray(detail.body.frequentlyBoughtTogether));
  assert.deepEqual(detail.body.relatedProducts, []);
  const fallbackIds = detail.body.frequentlyBoughtTogether.map((p) => p.id);
  assert.ok(fallbackIds.includes("sub-peer-1"));
  assert.ok(fallbackIds.includes("sub-peer-2"));
  assert.equal(fallbackIds.includes("src"), false);
  assert.equal(fallbackIds.includes("trashed-peer"), false);
  assert.equal(fallbackIds.includes("inactive-peer"), false);
  assert.equal(fallbackIds.includes("eb-item"), false);

  await api(token, "/products/src/relations?type=related", {
    method: "PUT",
    body: { targetProductIds: ["rel-1", "costy"] },
  });
  await api(token, "/products/src/relations?type=fbt", {
    method: "PUT",
    body: { targetProductIds: ["rel-2"] },
  });

  detail = await storefront("/products/src");
  assert.equal(detail.response.status, 200);
  assert.deepEqual(detail.body.relatedProducts.map((p) => p.id), ["rel-1", "costy"]);
  assert.deepEqual(detail.body.frequentlyBoughtTogether.map((p) => p.id), ["rel-2"]);
  // Manual FBT must not be padded with fallback peers
  assert.equal(detail.body.frequentlyBoughtTogether.length, 1);

  const payload = JSON.stringify(detail.body);
  assert.equal(payload.includes("costPrice"), false);
  assert.equal(payload.includes("cost_price"), false);
  assert.equal(payload.includes("company_id"), false);
  assert.equal(payload.includes("source_product_id"), false);

  const content = await storefront("/content");
  assert.equal(content.response.status, 200);
  const src = content.body.products.find((p) => p.id === "src");
  assert.ok(src);
  assert.deepEqual(src.relatedProducts.map((p) => p.id), ["rel-1", "costy"]);
  assert.deepEqual(src.frequentlyBoughtTogether.map((p) => p.id), ["rel-2"]);

  const publicCosty = serializePublicProduct(productRepository.findByCompany("icare", "costy"));
  assert.equal(JSON.stringify(publicCosty).includes("costPrice"), false);
});

test("permanent delete removes relation rows referencing the product", async () => {
  const updateToken = await login("icare-update@test.local");
  const permanentToken = await login("icare-permanent@test.local");

  await api(updateToken, "/products/src/relations?type=related", {
    method: "PUT",
    body: { targetProductIds: ["rel-1"] },
  });
  assert.ok(productRelationRepository.getByCompany("icare").some(
    (row) => row.sourceProductId === "src" && row.targetProductId === "rel-1",
  ));

  await api(permanentToken, "/products/rel-1", { method: "DELETE" });
  await api(permanentToken, "/products/rel-1/permanent", { method: "DELETE" });
  assert.equal(productRepository.findByCompany("icare", "rel-1"), null);
  assert.equal(
    productRelationRepository.getByCompany("icare").some(
      (row) => row.targetProductId === "rel-1" || row.sourceProductId === "rel-1",
    ),
    false,
  );
});

test("migration 024 defines product_relations constraints and indexes", () => {
  const migration = fs.readFileSync(
    path.join(__dirname, "../supabase/migrations/024_product_relations.sql"),
    "utf8",
  );
  assert.match(migration, /create table if not exists public\.product_relations/);
  assert.match(migration, /type in \('related', 'fbt'\)/);
  assert.match(migration, /product_relations_no_self/);
  assert.match(migration, /product_relations_unique/);
  assert.match(migration, /idx_product_relations_source_type/);
  assert.match(migration, /on delete cascade/i);
  assert.doesNotMatch(migration, /DROP TABLE/i);
});
