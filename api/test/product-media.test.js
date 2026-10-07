import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { productMediaRelativeDirectory, validateProductMediaUpload } from "../src/productSchema/productMedia.js";

const uploadRoutes = fs.readFileSync(new URL("../src/routes/uploads.js", import.meta.url), "utf8");
const cpanelApi = fs.readFileSync(new URL("../../cpanel/src/utils/api.js", import.meta.url), "utf8");

test("product media paths are tenant and product specific", () => {
  assert.equal(productMediaRelativeDirectory("icare", "product-1"), "icare/products/product-1");
  assert.equal(productMediaRelativeDirectory("eb-chemical", "product-1"), "eb-chemical/products/product-1");
  assert.throws(() => productMediaRelativeDirectory("icare", "../eb/product-1"), /Invalid product ID/);
});

test("product media validation accepts configured images and videos", () => {
  assert.equal(validateProductMediaUpload({ contentType: "image/webp", size: 1024 }).isVideo, false);
  assert.equal(validateProductMediaUpload({ contentType: "video/mp4", size: 1024 }).isVideo, true);
  assert.equal(validateProductMediaUpload({ contentType: "video/webm", size: 1024 }).isVideo, true);
});

test("product media validation rejects bad MIME types and oversized files", () => {
  assert.throws(() => validateProductMediaUpload({ contentType: "video/quicktime", size: 1024 }), /Unsupported/);
  assert.throws(() => validateProductMediaUpload({ contentType: "image/png", size: 9 * 1024 * 1024 }), /8 MB/);
  assert.throws(() => validateProductMediaUpload({ contentType: "video/mp4", size: 51 * 1024 * 1024 }), /50 MB/);
});

test("product media upload and deletion enforce tenant product ownership", () => {
  assert.match(uploadRoutes, /effectiveTenantRole\(req\)/);
  assert.match(uploadRoutes, /"super_admin"/);
  assert.match(uploadRoutes, /productRepository\.findByCompany\(req\.companyId, req\.params\.productId\)/);
  assert.match(uploadRoutes, /companyStoragePath\(req\.companyId, "products", req\.params\.productId\)/);
  assert.match(uploadRoutes, /Media does not belong to this tenant and product/);
  assert.match(uploadRoutes, /target\.startsWith\(`\$\{expectedRoot\}\$\{path\.sep\}`\)/);
  assert.match(uploadRoutes, /mediaUrlStillReferenced/);
});

test("CPanel rejects invalid or oversized product media before starting upload", () => {
  assert.match(cpanelApi, /validateProductMediaFile\(file\)/);
  assert.match(cpanelApi, /50 \* 1024 \* 1024/);
  assert.match(cpanelApi, /8 \* 1024 \* 1024/);
  assert.match(cpanelApi, /UNSUPPORTED_MEDIA_TYPE/);
});

test("storage-unavailable responses are retryable and localized without creating media rows", () => {
  assert.match(uploadRoutes, /MEDIA_STORAGE_UNAVAILABLE/);
  assert.match(uploadRoutes, /status\(503\)/);
  assert.match(uploadRoutes, /UPLOADS_DIR/);
  assert.doesNotMatch(uploadRoutes, /product_media.*(?:insert|create)/i);
});
