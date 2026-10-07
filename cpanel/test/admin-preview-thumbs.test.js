import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { adminPreviewUrlFor, isUploadsAssetUrl } from "../src/utils/adminPreviewUrl.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const productImages = fs.readFileSync(path.join(root, "src/utils/productImages.js"), "utf8");
const deferred = fs.readFileSync(path.join(root, "src/components/DeferredAdminThumb.jsx"), "utf8");
const dashboard = fs.readFileSync(path.join(root, "src/pages/AdminDashboardPage.jsx"), "utf8");
const brandsTable = fs.readFileSync(path.join(root, "src/components/BrandsCatalogTable.jsx"), "utf8");

test("adminPreviewUrlFor derives sibling admin-preview path", () => {
  assert.equal(adminPreviewUrlFor("/uploads/co/foo.jpg"), "/uploads/co/foo.admin-preview.webp");
  assert.equal(adminPreviewUrlFor("https://api.example.com/uploads/co/foo.png"), "/uploads/co/foo.admin-preview.webp");
  assert.equal(adminPreviewUrlFor("/uploads/co/foo.admin-preview.webp"), "/uploads/co/foo.admin-preview.webp");
  assert.equal(adminPreviewUrlFor(""), "");
  assert.equal(adminPreviewUrlFor(null), "");
});

test("isUploadsAssetUrl only matches /uploads/ assets", () => {
  assert.equal(isUploadsAssetUrl("/uploads/co/foo.jpg"), true);
  assert.equal(isUploadsAssetUrl("https://api.example.com/uploads/co/foo.jpg"), true);
  assert.equal(isUploadsAssetUrl("https://cdn.example.com/other/asset.jpg"), false);
  assert.equal(isUploadsAssetUrl(""), false);
  assert.equal(isUploadsAssetUrl(null), false);
});

test("productImages resolveAdminPreviewUrl prefers sibling for /uploads/ and never falls back to main", () => {
  assert.ok(productImages.includes("resolveAdminPreviewUrl"), "productImages must export resolveAdminPreviewUrl");
  assert.ok(productImages.includes(".admin-preview.webp"), "productImages must reference the admin-preview suffix");
  assert.ok(productImages.includes("isUploadsAssetUrl"), "productImages must gate siblings to /uploads/ assets");
  assert.ok(
    productImages.includes("resolveApiAssetUrl(previewPath) || productPlaceholderUrl"),
    "missing uploads previews must resolve to the placeholder, never the main asset",
  );
  const uploadsBranch = productImages.slice(
    productImages.indexOf("isUploadsAssetUrl(source)"),
    productImages.indexOf("return resolveProductImageUrl(source)"),
  );
  assert.doesNotMatch(
    uploadsBranch,
    /resolveProductImageUrl/,
    "the /uploads/ branch must never fall back to the full-resolution main resolver",
  );
});

test("list thumbs use resolveAdminPreviewUrl / admin-preview (no full-res decode in tables)", () => {
  assert.ok(deferred.includes("resolveAdminPreviewUrl"), "DeferredAdminThumb must resolve admin preview URLs");
  assert.ok(deferred.includes("IntersectionObserver"), "DeferredAdminThumb must defer src until viewport");
  assert.ok(brandsTable.includes("DeferredAdminThumb"), "brand logos use DeferredAdminThumb");
  assert.ok(dashboard.includes("DeferredAdminThumb"), "products/categories lists use DeferredAdminThumb");
  assert.doesNotMatch(dashboard, /<img className="admin-thumb"/, "no full-res admin-thumb img in product lists");
});

test("DeferredAdminThumb never falls back to the main asset on preview error", () => {
  assert.doesNotMatch(deferred, /resolveProductImageUrl/, "DeferredAdminThumb must not import the main resolver");
  assert.doesNotMatch(deferred, /fellBackToMain/, "DeferredAdminThumb must not track a main-asset fallback");
  assert.ok(deferred.includes("useProductImagePlaceholder"), "placeholder remains the only fallback");
  assert.ok(deferred.includes("onError={handleError}"), "img onError must route through the fallback handler");
});
