import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";
import { hashPassword } from "../src/auth/passwords.js";
import {
  filterActiveProducts,
  filterTrashedProducts,
  findActiveSlugOrSkuConflict,
  isProductTrashed,
} from "../src/products/trashLifecycle.js";
import { cleanupUnreferencedProductMedia, deleteProductRecordThenCleanupMedia } from "../src/products/permanentDeleteMedia.js";
import { mediaUrlStillReferenced } from "../src/products/mediaReferences.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "product-trash-phase-g-"));
const uploadsDir = path.join(dataDir, "uploads");
fs.mkdirSync(uploadsDir, { recursive: true });
const password = "PhaseG-trash-123!";
const passwordHash = await hashPassword(password);
const now = "2026-09-07T10:00:00.000Z";

const company = (id) => ({ id, slug: id, name: id, status: "active", settings: { language: "en", currency: "USD" } });
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

const sharedUrl = "/uploads/icare/products/icare-keep/shared.webp";
const uniqueUrl = "/uploads/icare/products/icare-keep/unique.webp";

fs.writeFileSync(path.join(dataDir, "store.json"), JSON.stringify({
  version: 2,
  companies: [company("icare"), company("eb-chemical")],
  users: [
    user("icare-admin", "icare"),
    user("eb-admin", "eb-chemical"),
    user("icare-delete", "icare", "employee", ["products.view", "products.delete"]),
    user("icare-update", "icare", "employee", ["products.view", "products.update"]),
    user("icare-view", "icare", "employee", ["products.view"]),
    user("icare-permanent", "icare", "employee", ["products.view", "products.permanent_delete"]),
  ],
  memberships: [
    { id: "m1", companyId: "icare", userId: "icare-admin", role: "company_admin", status: "active", permissions: [], createdAt: now, updatedAt: now },
    { id: "m2", companyId: "eb-chemical", userId: "eb-admin", role: "company_admin", status: "active", permissions: [], createdAt: now, updatedAt: now },
    { id: "m3", companyId: "icare", userId: "icare-delete", role: "employee", status: "active", permissions: ["products.view", "products.delete"], createdAt: now, updatedAt: now },
    { id: "m4", companyId: "icare", userId: "icare-update", role: "employee", status: "active", permissions: ["products.view", "products.update"], createdAt: now, updatedAt: now },
    { id: "m5", companyId: "icare", userId: "icare-view", role: "employee", status: "active", permissions: ["products.view"], createdAt: now, updatedAt: now },
    { id: "m6", companyId: "icare", userId: "icare-permanent", role: "employee", status: "active", permissions: ["products.view", "products.permanent_delete"], createdAt: now, updatedAt: now },
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
      id: "icare-keep",
      slug: "icare-keep",
      sku: "KEEP-1",
      name: { en: "Keep Me" },
      company_id: "icare",
      brandId: "icare-brand",
      categoryId: "icare-sub",
      mainCategoryId: "icare-main",
      subcategoryId: "icare-sub",
      image: sharedUrl,
      hoverImage: uniqueUrl,
      gallery_images: [{ id: "g1", image_url: sharedUrl, sort_order: 0 }],
      variants: [{ id: "v1", size: "S", price: 10, stock: 2, image_url: sharedUrl }],
      isActive: true,
      visible: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "icare-trash-me",
      slug: "icare-trash-me",
      sku: "TRASH-1",
      name: { en: "Trash Me" },
      company_id: "icare",
      brandId: "icare-brand",
      categoryId: "icare-sub",
      mainCategoryId: "icare-main",
      subcategoryId: "icare-sub",
      image: uniqueUrl,
      isActive: true,
      visible: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "eb-product",
      slug: "eb-product",
      sku: "EB-1",
      name: { en: "EB Product" },
      company_id: "eb-chemical",
      brandId: "eb-brand",
      image: "/uploads/eb-chemical/products/eb-product/a.webp",
      isActive: true,
      visible: true,
      createdAt: now,
      updatedAt: now,
    },
  ],
  orders: [],
}, null, 2));

process.env.DATA_STORE_DIR = dataDir;
process.env.UPLOADS_DIR = uploadsDir;
process.env.DATABASE_URL = "";
process.env.POSTGRES_URL = "";
process.env.SUPABASE_URL = "";
process.env.SUPABASE_SERVICE_ROLE_KEY = "";
process.env.JWT_SECRET = "product-trash-phase-g-secret";
process.env.NODE_ENV = "test";

const { app } = await import("../src/server.js");
const { productRepository, activityLogRepository, allPermissions } = await import("../src/data/store.js");
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

test("trash lifecycle helpers classify and filter products", () => {
  assert.equal(isProductTrashed({}), false);
  assert.equal(isProductTrashed({ deletedAt: now }), true);
  assert.equal(isProductTrashed({ deleted_at: now }), true);
  const products = [{ id: "a" }, { id: "b", deletedAt: now }];
  assert.deepEqual(filterActiveProducts(products).map((p) => p.id), ["a"]);
  assert.deepEqual(filterTrashedProducts(products).map((p) => p.id), ["b"]);
  assert.equal(findActiveSlugOrSkuConflict([{ id: "x", slug: "s", sku: "K" }], { slug: "s", sku: "other", excludeProductId: "y" })?.field, "slug");
});

test("permission registry includes products.permanent_delete and not products.restore", () => {
  assert.ok(allPermissions.includes("products.permanent_delete"));
  assert.equal(allPermissions.includes("products.restore"), false);
});

test("DELETE moves product to trash with activity log and keeps row", async () => {
  const token = await login("icare-admin@test.local");
  const before = productRepository.findByCompany("icare", "icare-trash-me");
  assert.ok(before);
  assert.equal(isProductTrashed(before), false);

  const result = await api(token, "/products/icare-trash-me", { method: "DELETE" });
  assert.equal(result.response.status, 204);

  const after = productRepository.findByCompany("icare", "icare-trash-me");
  assert.ok(after);
  assert.equal(isProductTrashed(after), true);

  const list = await api(token, "/products");
  assert.equal(list.response.status, 200);
  assert.equal(list.body.some((p) => p.id === "icare-trash-me"), false);
  assert.equal(list.body.some((p) => p.id === "icare-keep"), true);

  const trash = await api(token, "/products?trash=true");
  assert.equal(trash.response.status, 200);
  assert.equal(trash.body.some((p) => p.id === "icare-trash-me"), true);
  assert.equal(trash.body.some((p) => p.id === "icare-keep"), false);

  const logs = activityLogRepository.getByCompany("icare");
  assert.ok(logs.some((log) => log.action === "product.trashed" && log.entity_id === "icare-trash-me"));
});

test("trash requires products.delete; tenant isolation returns not found", async () => {
  const viewToken = await login("icare-view@test.local");
  const denied = await api(viewToken, "/products/icare-keep", { method: "DELETE" });
  assert.equal(denied.response.status, 403);

  const ebToken = await login("eb-admin@test.local", "eb-chemical");
  const cross = await api(ebToken, "/products/icare-keep", { method: "DELETE", companyId: "eb-chemical" });
  assert.equal(cross.response.status, 404);
  assert.equal(isProductTrashed(productRepository.findByCompany("icare", "icare-keep")), false);
});

test("normal update cannot target trashed product; restore uses products.update", async () => {
  const updateToken = await login("icare-update@test.local");
  const deleteToken = await login("icare-delete@test.local");

  await api(deleteToken, "/products/icare-keep", { method: "DELETE" });
  assert.equal(isProductTrashed(productRepository.findByCompany("icare", "icare-keep")), true);

  const updateDenied = await api(updateToken, "/products/icare-keep", {
    method: "PUT",
    body: {
      id: "icare-keep",
      name: { en: "Nope" },
      slug: "icare-keep",
      brandId: "icare-brand",
      categoryId: "icare-sub",
      mainCategoryId: "icare-main",
      subcategoryId: "icare-sub",
      isActive: true,
    },
  });
  assert.equal(updateDenied.response.status, 404);
  assert.equal(isProductTrashed(productRepository.findByCompany("icare", "icare-keep")), true);

  const restoreDenied = await api(deleteToken, "/products/icare-keep/restore", { method: "POST" });
  assert.equal(restoreDenied.response.status, 403);

  const restored = await api(updateToken, "/products/icare-keep/restore", { method: "POST" });
  assert.equal(restored.response.status, 200);
  assert.equal(isProductTrashed(productRepository.findByCompany("icare", "icare-keep")), false);
  assert.ok(activityLogRepository.getByCompany("icare").some((log) => log.action === "product.restored"));
});

test("permanent delete requires products.permanent_delete and removes product", async () => {
  const deleteToken = await login("icare-delete@test.local");
  const updateToken = await login("icare-update@test.local");
  const permanentToken = await login("icare-permanent@test.local");

  await api(deleteToken, "/products/icare-trash-me", { method: "DELETE" });

  const withDeleteOnly = await api(deleteToken, "/products/icare-trash-me/permanent", { method: "DELETE" });
  assert.equal(withDeleteOnly.response.status, 403);

  const withUpdateOnly = await api(updateToken, "/products/icare-trash-me/permanent", { method: "DELETE" });
  assert.equal(withUpdateOnly.response.status, 403);

  const ebToken = await login("eb-admin@test.local", "eb-chemical");
  const cross = await api(ebToken, "/products/icare-trash-me/permanent", { method: "DELETE", companyId: "eb-chemical" });
  assert.equal(cross.response.status, 404);

  const ok = await api(permanentToken, "/products/icare-trash-me/permanent", { method: "DELETE" });
  assert.equal(ok.response.status, 204);
  assert.equal(productRepository.findByCompany("icare", "icare-trash-me"), null);
  assert.ok(activityLogRepository.getByCompany("icare").some((log) => log.action === "product.permanently_deleted"));
});

test("permanent delete is rejected for Active products", async () => {
  const permanentToken = await login("icare-permanent@test.local");
  const admin = await login("icare-admin@test.local");

  // Ensure a known Active product exists (may have been trashed by earlier tests).
  const current = productRepository.findByCompany("icare", "icare-keep");
  if (current && (current.deletedAt || current.deleted_at)) {
    await api(admin, "/products/icare-keep/restore", { method: "POST" });
  }
  assert.equal(isProductTrashed(productRepository.findByCompany("icare", "icare-keep")), false);

  const denied = await api(permanentToken, "/products/icare-keep/permanent", { method: "DELETE" });
  assert.equal(denied.response.status, 409);
  assert.match(String(denied.body?.message || ""), /trashed/i);
  assert.ok(productRepository.findByCompany("icare", "icare-keep"));
  assert.equal(isProductTrashed(productRepository.findByCompany("icare", "icare-keep")), false);
});

test("media cleanup runs only after successful DB permanent deletion", async () => {
  let mediaCalls = 0;

  await assert.rejects(
    () => deleteProductRecordThenCleanupMedia({
      deleteProductRecord: async () => {
        throw new Error("db delete failed");
      },
      cleanupMedia: async () => {
        mediaCalls += 1;
        return { deleted: [], retained: [] };
      },
    }),
    /db delete failed/,
  );
  assert.equal(mediaCalls, 0);

  const skipped = await deleteProductRecordThenCleanupMedia({
    deleteProductRecord: async () => null,
    cleanupMedia: async () => {
      mediaCalls += 1;
      return { deleted: [], retained: [] };
    },
  });
  assert.equal(skipped.removed, null);
  assert.equal(skipped.mediaResult, null);
  assert.equal(mediaCalls, 0);

  const okProduct = { id: "gone" };
  const succeeded = await deleteProductRecordThenCleanupMedia({
    deleteProductRecord: async () => okProduct,
    cleanupMedia: async () => {
      mediaCalls += 1;
      return { deleted: ["a"], retained: [] };
    },
  });
  assert.equal(succeeded.removed, okProduct);
  assert.deepEqual(succeeded.mediaResult, { deleted: ["a"], retained: [] });
  assert.equal(mediaCalls, 1);

  const routeSource = fs.readFileSync(
    path.join(__dirname, "../src/routes/products.js"),
    "utf8",
  );
  const start = routeSource.indexOf('router.delete("/:id/permanent"');
  const end = routeSource.indexOf('router.delete("/:id"', start + 1);
  const handler = routeSource.slice(start, end === -1 ? undefined : end);
  assert.match(handler, /isProductTrashed/);
  const trashCheck = handler.indexOf("isProductTrashed");
  const dbDelete = handler.indexOf("deleteProductWithTenantCatalogLock");
  const mediaCleanup = handler.indexOf("cleanupUnreferencedProductMedia");
  assert.ok(trashCheck >= 0 && dbDelete > trashCheck && mediaCleanup > dbDelete);
});

test("media cleanup failure after DB delete still reports successful permanent delete", async () => {
  const removedProduct = { id: "gone-media-fail", name: { en: "Gone" } };
  let mediaCalls = 0;
  const errors = [];
  const originalError = console.error;
  console.error = (...args) => {
    errors.push(args.map(String).join(" "));
  };
  try {
    const result = await deleteProductRecordThenCleanupMedia({
      deleteProductRecord: async () => removedProduct,
      cleanupMedia: async () => {
        mediaCalls += 1;
        throw new Error("storage unavailable");
      },
    });
    assert.equal(result.removed, removedProduct);
    assert.equal(mediaCalls, 1);
    assert.equal(result.mediaResult?.failures?.length, 1);
    assert.match(String(result.mediaResult.failures[0].message), /storage unavailable/);
    assert.ok(errors.some((line) => /media cleanup failed \(non-fatal\)/i.test(line)));
  } finally {
    console.error = originalError;
  }
});

test("no automatic hard deletion or retention duration invented for trash", () => {
  const routeSource = fs.readFileSync(
    path.join(__dirname, "../src/routes/products.js"),
    "utf8",
  );
  const mediaSource = fs.readFileSync(
    path.join(__dirname, "../src/products/permanentDeleteMedia.js"),
    "utf8",
  );
  const lifecycleSource = fs.readFileSync(
    path.join(__dirname, "../src/products/trashLifecycle.js"),
    "utf8",
  );
  for (const source of [routeSource, mediaSource, lifecycleSource]) {
    assert.doesNotMatch(source, /\bcron\b/i);
    assert.doesNotMatch(source, /setInterval\s*\(/);
    assert.doesNotMatch(source, /retentionDays|RETENTION_|ttl.*delete|auto.*purge|expire.*trash/i);
  }
});

test("shared media survives permanent delete of one referencing product", async () => {
  const admin = await login("icare-admin@test.local");
  const sharedPath = path.join(uploadsDir, "icare", "products", "icare-keep", "shared.webp");
  const uniquePath = path.join(uploadsDir, "icare", "products", "icare-keep", "unique.webp");
  fs.mkdirSync(path.dirname(sharedPath), { recursive: true });
  fs.writeFileSync(sharedPath, "shared");
  fs.writeFileSync(uniquePath, "unique");

  const disposable = {
    id: "icare-temp-media",
    image: uniqueUrl,
  };
  const tenantProducts = productRepository.getByCompany("icare");
  assert.equal(mediaUrlStillReferenced(tenantProducts, uniqueUrl, { excludeProductId: "icare-temp-media" }), true);
  await cleanupUnreferencedProductMedia("icare", disposable, { tenantProducts, uploadsDir });
  assert.equal(fs.existsSync(uniquePath), true);

  // Product that only owns a private URL can have it deleted when unreferenced
  const privateUrl = "/uploads/icare/products/icare-temp-media/private.webp";
  const privatePath = path.join(uploadsDir, "icare", "products", "icare-temp-media", "private.webp");
  fs.mkdirSync(path.dirname(privatePath), { recursive: true });
  fs.writeFileSync(privatePath, "private");
  await cleanupUnreferencedProductMedia("icare", { id: "icare-temp-media", image: privateUrl }, {
    tenantProducts,
    uploadsDir,
  });
  assert.equal(fs.existsSync(privatePath), false);
  assert.equal(fs.existsSync(sharedPath), true);
});

test("trashed products are excluded from details and default list", async () => {
  const admin = await login("icare-admin@test.local");
  await api(admin, "/products/icare-keep", { method: "DELETE" });

  const list = await api(admin, "/products");
  assert.equal(list.body.some((p) => p.id === "icare-keep"), false);

  const details = await api(admin, "/products/icare-keep/details");
  assert.equal(details.response.status, 404);

  await api(admin, "/products/icare-keep/restore", { method: "POST" });
});

test("migration 023 adds nullable deleted_at and company index", () => {
  const migration = fs.readFileSync(
    path.join(__dirname, "../supabase/migrations/023_products_deleted_at.sql"),
    "utf8",
  );
  assert.match(migration, /deleted_at timestamptz/);
  assert.match(migration, /idx_products_company_deleted_at/);
  assert.match(migration, /company_id, deleted_at/);
  assert.doesNotMatch(migration, /drop table/i);
});
